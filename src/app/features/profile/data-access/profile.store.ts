import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthStore } from '@core/auth';

import type {
  ChangePasswordPayload,
  Profile,
  ProfilePersonal,
  UpdateProfilePayload,
} from './profile.model';

export type ProfileSubmitStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * `ProfileStore` — injectable singleton for the Profile feature.
 *
 * Holds the user's extended profile data (personal + professional + location).
 * The current implementation uses mock data seeded from `AuthStore.user()`.
 * When the real profile API lands, only the `load()` method needs updating.
 *
 * All state mutations happen through explicit action methods only — signals
 * are exposed as readonly views per /docs/03 §3 (store conventions).
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly auth = inject(AuthStore);

  /* ─── private writable state ─── */
  private readonly _profile = signal<Profile | null>(null);
  private readonly _submitStatus = signal<ProfileSubmitStatus>('idle');
  private readonly _passwordSubmitStatus = signal<ProfileSubmitStatus>('idle');

  /* ─── public readonly views ─── */
  readonly profile = this._profile.asReadonly();
  readonly submitStatus = this._submitStatus.asReadonly();
  readonly passwordSubmitStatus = this._passwordSubmitStatus.asReadonly();

  /** Derived full name, e.g. "Adam Adam". */
  readonly fullName = computed(() => {
    const p = this._profile()?.personal;
    return p ? `${p.firstName} ${p.lastName}` : '';
  });

  /** Derived initials for the avatar circle, e.g. "AA". */
  readonly initials = computed(() => {
    const p = this._profile()?.personal;
    if (!p) return '';
    return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
  });

  /* ─── actions ─── */

  /**
   * Populate the store with a mock profile.
   * Called by the profile page's `ngOnInit` equivalent (`effect` or direct call).
   */
  load(): void {
    if (this._profile() !== null) return; // already loaded
    const user = this.auth.user();
    this._profile.set({
      personal: {
        firstName: user?.firstName ?? 'Adam',
        lastName: user?.lastName ?? 'Adam',
        username: 'adam_adam',
        iosId: '241242',
        email: user?.email ?? 'adam.asdf@ios.com',
        city: 'Victoria',
        street: 'Nshard',
        address: 'Blanshard',
        postalCode: '4323',
        country: 'Canada',
      },
      professional: {
        occupation: 'Graphic designer',
        companyName: 'IOS',
        position: 'Team leader',
      },
    });
  }

  /**
   * Persist personal + professional + location changes.
   * Currently mocked — simulates a 400 ms network round-trip.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<void> {
    this._submitStatus.set('pending');
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    this._profile.update((prev) => {
      if (!prev) return prev;
      return {
        personal: {
          ...prev.personal,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          country: payload.country,
          city: payload.city,
          street: payload.street,
          address: payload.address,
          postalCode: payload.postalCode,
        } satisfies ProfilePersonal,
        professional: {
          occupation: payload.occupation,
          position: payload.position,
          companyName: payload.companyName,
        },
      };
    });
    this._submitStatus.set('success');
  }

  /**
   * Change the user's password.
   * Currently mocked — simulates a 400 ms network round-trip.
   */
  async changePassword(_payload: ChangePasswordPayload): Promise<void> {
    this._passwordSubmitStatus.set('pending');
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    this._passwordSubmitStatus.set('success');
  }

  /** Reset submit status back to idle (e.g. after dismissing a success dialog). */
  resetSubmitStatus(): void {
    this._submitStatus.set('idle');
  }

  resetPasswordSubmitStatus(): void {
    this._passwordSubmitStatus.set('idle');
  }
}
