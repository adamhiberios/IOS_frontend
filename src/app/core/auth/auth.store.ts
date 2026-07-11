import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { type Observable, finalize, firstValueFrom, map, shareReplay, tap, throwError } from 'rxjs';

import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import { AuthApi } from './auth.api';
import {
  type AuthSession,
  type LoginCredentials,
  type LogoutReason,
  type RegisterPayload,
  type Role,
  type User,
} from './auth.model';

/**
 * Single source of truth for the user's session.
 *
 * Talks to the real backend through {@link AuthApi} (`/auth/*`). Storage posture
 * (CLAUDE.md §4 + §8, `docs/backend-analysis.md` §5):
 *   - `_accessToken` lives in a private signal — in memory only.
 *   - The refresh token is an **httpOnly cookie** owned by the server; it never
 *     enters JS state. Refresh is a credentialed `POST /auth/refresh`.
 *   - `_refreshInFlight` enforces single-flight refresh for parallel 401s
 *     (the standing acceptance scenario, /docs/07 §2.3).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly bus = inject(AppEventBus);
  private readonly lang = inject(LanguageService);

  /* -------------------------- private state -------------------------- */
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);
  private readonly _roles = signal<readonly Role[]>([]);
  /** Single-flight refresh observable; see {@link refreshAccessToken}. */
  private _refreshInFlight: Observable<string> | null = null;
  /** Pending submit so UI can render `pending` / `error` states. */
  private readonly _submitState = signal<SubmitState>({ status: 'idle' });

  /* -------------------------- read-only views ------------------------ */
  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly submitState = this._submitState.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  /** Returns true if the active session has any of the supplied roles. */
  hasAnyRole(allowed: readonly Role[]): boolean {
    if (allowed.length === 0) return true;
    const current = this._roles();
    return current.some((r) => allowed.includes(r));
  }

  /** Single-role convenience over {@link hasAnyRole}. */
  hasRole(role: Role): boolean {
    return this._roles().includes(role);
  }

  /* ------------------------------ actions ---------------------------- */

  /**
   * On app boot, silently attempt `POST /auth/refresh`. If the httpOnly refresh
   * cookie is still valid the server returns a fresh session and we hydrate;
   * otherwise (401 — no/expired cookie) we stay logged out, which is the
   * expected "first visit" path. Never blocks app startup (/docs/07 §2.2).
   */
  async bootstrap(): Promise<void> {
    try {
      const session = await firstValueFrom(this.api.refresh());
      this.adoptSession(session);
    } catch {
      // Silent — the user simply isn't signed in.
      this.clearSession();
    }
  }

  /**
   * Authenticate a student with email + password. Resolves on success (state
   * hydrated, navigation done) and rejects with a user-facing message on
   * failure (the form binds the error inline).
   */
  async login(creds: LoginCredentials, returnUrl?: string | null): Promise<void> {
    this._submitState.set({ status: 'pending' });
    try {
      const session = await firstValueFrom(this.api.loginStudent(creds));
      this.adoptSession(session);
      this._submitState.set({ status: 'success' });
      await this.router.navigateByUrl(returnUrl ?? '/dashboard');
    } catch (err) {
      const message = this.humaniseError(err, this.lang.t('auth.errors.invalidCredentials'));
      this._submitState.set({ status: 'error', message });
      throw new Error(message, { cause: err });
    }
  }

  /**
   * Create a new student account. The real backend does NOT issue a session on
   * register — the account starts `emailVerified=false` and the user must click
   * the verification link before logging in. So we create the account, then
   * route to the login page with a `registered` flag for the "check your email"
   * notice, rather than auto-logging-in.
   */
  async register(payload: RegisterPayload): Promise<void> {
    this._submitState.set({ status: 'pending' });
    try {
      await firstValueFrom(this.api.register(payload));
      this._submitState.set({ status: 'success' });
      await this.router.navigate(['/auth/login'], { queryParams: { registered: 1 } });
    } catch (err) {
      const message = this.humaniseError(err, this.lang.t('auth.errors.unknownError'));
      this._submitState.set({ status: 'error', message });
      throw new Error(message, { cause: err });
    }
  }

  /**
   * End the session. Always navigates to /auth/login regardless of whether the
   * backend logout call succeeded — never leave the user on a protected screen
   * with a half-cleared session.
   */
  async logout(opts: { reason: LogoutReason } = { reason: 'user-initiated' }): Promise<void> {
    this.clearSession();
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // Best-effort — the local session is already gone.
    }
    this.bus.emit({
      type: 'user.logged-out',
      reason: opts.reason === 'user-initiated' ? 'manual' : 'session-expired',
    });
    await this.router.navigate(['/auth/login'], {
      queryParams: opts.reason === 'user-initiated' ? null : { reason: opts.reason },
    });
  }

  /**
   * Race-safe refresh of the access token. The first caller fires the network
   * call; every parallel caller waits for the same observable and adopts the
   * new token. Used by `authInterceptor` on 401.
   */
  refreshAccessToken(): Observable<string> {
    if (this._refreshInFlight) {
      return this._refreshInFlight;
    }
    this._refreshInFlight = this.api.refresh().pipe(
      tap((session) => this.adoptSession(session)),
      map((session) => session.accessToken),
      finalize(() => {
        this._refreshInFlight = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this._refreshInFlight;
  }

  /**
   * Called by the interceptor when refresh itself fails. Wipes the session and
   * bounces to /auth/login with `reason=refresh-failed` so the login page can
   * render the right banner (/docs/07 §2.4).
   */
  handleRefreshFailure(): Observable<never> {
    void this.logout({ reason: 'refresh-failed' });
    return throwError(() => new Error(this.lang.t('auth.errors.sessionExpired')));
  }

  /** Reset the in-memory submit state (e.g., when navigating away). */
  resetSubmitState(): void {
    this._submitState.set({ status: 'idle' });
  }

  /* ----------------------------- internals --------------------------- */

  private adoptSession(session: AuthSession): void {
    this._accessToken.set(session.accessToken);
    this._user.set(session.user);
    this._roles.set(session.roles);
    this.bus.emit({ type: 'user.logged-in', userId: session.user.id });
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._roles.set([]);
    this._refreshInFlight = null;
  }

  /**
   * Turn a backend error into a user-facing message. The backend renders
   * failures as RFC-7807 Problem Details (`{ detail, title, code, ... }`); we
   * prefer `detail`, then `title`, then a caller-supplied fallback. Never leaks
   * raw stack/URL text to the UI.
   */
  private humaniseError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { detail?: unknown; title?: unknown; message?: unknown } | null;
      const candidate = body?.detail ?? body?.title ?? body?.message;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
      return fallback;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }
}

/**
 * UI-friendly view of "what is the auth flow currently doing?". Bound by the
 * login and register pages to render `pending` and `error` states without each
 * page re-implementing the same signal.
 */
export type SubmitState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; message: string };
