import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { problemDetailCode, problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import { ProfileApi } from './profile.api';
import {
  AVATAR_MAX_BYTES,
  type ChangePasswordPayload,
  type Profile,
  type UpdateProfilePayload,
  isAvatarContentType,
} from './profile.model';

export type ProfileSubmitStatus = 'idle' | 'pending' | 'success' | 'error';
export type AvatarUploadStatus = 'idle' | 'pending' | 'error';

/**
 * `ProfileStore` — injectable singleton for the Profile feature.
 *
 * Owns the student's `/me` profile and the update / change-password actions,
 * talking to the real backend through {@link ProfileApi}. Business logic lives
 * here; the pages only bind signals and dispatch actions. All state mutates
 * through action methods; signals are exposed as `.asReadonly()` views per
 * /docs/03 §3 (store conventions). No Observables leak to components —
 * `firstValueFrom` bridges inside the store.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ProfileApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    // Drop the cached profile when the session ends so the next signed-in user
    // never sees the previous user's data (this store is a root singleton).
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  /* ─── private writable state ─── */
  private readonly _profile = signal<Profile | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private readonly _submitStatus = signal<ProfileSubmitStatus>('idle');
  private readonly _submitError = signal<string | null>(null);

  private readonly _passwordSubmitStatus = signal<ProfileSubmitStatus>('idle');
  private readonly _passwordError = signal<string | null>(null);
  /** True when the failure was specifically a wrong current password (401). */
  private readonly _passwordCurrentWrong = signal(false);

  private readonly _avatarStatus = signal<AvatarUploadStatus>('idle');
  private readonly _avatarError = signal<string | null>(null);

  /* ─── public readonly views ─── */
  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly submitStatus = this._submitStatus.asReadonly();
  readonly submitError = this._submitError.asReadonly();
  readonly passwordSubmitStatus = this._passwordSubmitStatus.asReadonly();
  readonly passwordError = this._passwordError.asReadonly();
  readonly passwordCurrentWrong = this._passwordCurrentWrong.asReadonly();
  readonly avatarStatus = this._avatarStatus.asReadonly();
  readonly avatarError = this._avatarError.asReadonly();

  /** Derived full name, preferring the backend-computed value. */
  readonly fullName = computed(() => {
    const p = this._profile();
    if (!p) return '';
    return p.fullName || `${p.firstName} ${p.lastName}`.trim();
  });

  /** Derived initials for the avatar circle, e.g. "AA". */
  readonly initials = computed(() => {
    const p = this._profile();
    if (!p) return '';
    const first = p.firstName.charAt(0);
    const last = p.lastName.charAt(0);
    return `${first}${last}`.toUpperCase();
  });

  /* ─── actions ─── */

  /**
   * Load the profile from `GET /me`. Skips the fetch when already loaded unless
   * `force` is passed (e.g. a manual retry). Safe to call from every page's
   * init; the first caller fetches and the rest reuse the cached value.
   */
  async load(force = false): Promise<void> {
    if (!force && this._profile() !== null) return;
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      this._profile.set(await firstValueFrom(this.api.getMe()));
    } catch (err) {
      this._profile.set(null);
      this._error.set(problemDetailMessage(err) ?? this.lang.t('profile.view.loadError'));
    } finally {
      this._loading.set(false);
    }
  }

  /** Force a re-fetch of the profile. */
  async reload(): Promise<void> {
    await this.load(true);
  }

  /**
   * Persist personal + location + professional changes via `PATCH /me`. On
   * success the store adopts the returned profile and flips to `success` so the
   * page can show its confirmation dialog. Returns `true` on success.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<boolean> {
    if (this._submitStatus() === 'pending') return false;
    this._submitStatus.set('pending');
    this._submitError.set(null);
    try {
      this._profile.set(await firstValueFrom(this.api.updateMe(payload)));
      this._submitStatus.set('success');
      return true;
    } catch (err) {
      this._submitError.set(problemDetailMessage(err) ?? this.lang.t('profile.edit.saveError'));
      this._submitStatus.set('error');
      return false;
    }
  }

  /**
   * Change the password via `PATCH /me/password`. A 200 means every session was
   * revoked server-side — the caller must treat success as a forced logout. A
   * wrong current password surfaces as 401; {@link passwordCurrentWrong} lets
   * the page attach the error to the "old password" field. Returns `true` on
   * success.
   */
  async changePassword(payload: ChangePasswordPayload): Promise<boolean> {
    if (this._passwordSubmitStatus() === 'pending') return false;
    this._passwordSubmitStatus.set('pending');
    this._passwordError.set(null);
    this._passwordCurrentWrong.set(false);
    try {
      await firstValueFrom(this.api.changePassword(payload));
      this._passwordSubmitStatus.set('success');
      return true;
    } catch (err) {
      const isWrongCurrent =
        err instanceof HttpErrorResponse &&
        (err.status === 401 || problemDetailCode(err) === 'INVALID_CREDENTIALS');
      this._passwordCurrentWrong.set(isWrongCurrent);
      this._passwordError.set(
        problemDetailMessage(err) ??
          this.lang.t(
            isWrongCurrent
              ? 'profile.changePassword.currentPasswordWrong'
              : 'profile.changePassword.saveError',
          ),
      );
      this._passwordSubmitStatus.set('error');
      return false;
    }
  }

  /**
   * Upload a new avatar (A1 / BE-I-08). Three steps: request a presigned PUT URL
   * (`POST /me/avatar-upload-url`) → PUT the raw bytes to object storage (bypasses
   * the API interceptors) → point the profile at the object (`PATCH /me`). The
   * store validates type/size up front so a bad file never round-trips. On success
   * it adopts the returned profile (the avatar re-renders); returns `true`.
   */
  async uploadAvatar(file: File): Promise<boolean> {
    if (this._avatarStatus() === 'pending') return false;

    const contentType = file.type;
    if (!isAvatarContentType(contentType)) {
      this._avatarError.set(this.lang.t('profile.edit.avatarTypeError'));
      this._avatarStatus.set('error');
      return false;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      this._avatarError.set(this.lang.t('profile.edit.avatarSizeError'));
      this._avatarStatus.set('error');
      return false;
    }

    this._avatarStatus.set('pending');
    this._avatarError.set(null);
    try {
      const target = await firstValueFrom(this.api.requestAvatarUploadUrl(contentType));
      await firstValueFrom(this.api.uploadAvatarBytes(target, file, contentType));
      this._profile.set(await firstValueFrom(this.api.setAvatar(target.key)));
      this._avatarStatus.set('idle');
      return true;
    } catch (err) {
      this._avatarError.set(
        problemDetailMessage(err) ?? this.lang.t('profile.edit.avatarUploadError'),
      );
      this._avatarStatus.set('error');
      return false;
    }
  }

  /** Reset the avatar-upload state (e.g. on entering the edit page). */
  resetAvatarStatus(): void {
    this._avatarStatus.set('idle');
    this._avatarError.set(null);
  }

  /** Reset the update-information submit state (e.g. after dismissing a dialog). */
  resetSubmitStatus(): void {
    this._submitStatus.set('idle');
    this._submitError.set(null);
  }

  /** Reset the change-password submit state. */
  resetPasswordSubmitStatus(): void {
    this._passwordSubmitStatus.set('idle');
    this._passwordError.set(null);
    this._passwordCurrentWrong.set(false);
  }

  /** Wipe all profile state — invoked on logout so no data survives the session. */
  private clear(): void {
    this._profile.set(null);
    this._error.set(null);
    this.resetSubmitStatus();
    this.resetPasswordSubmitStatus();
    this.resetAvatarStatus();
  }
}
