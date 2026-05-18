import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { type Observable, defer, finalize, from, map, shareReplay, tap, throwError } from 'rxjs';

import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import {
  type AuthSession,
  type LoginCredentials,
  type LogoutReason,
  type RegisterPayload,
  type Role,
  type User,
} from './auth.model';
import { MockAuthBackend, isMockHttpError } from './mock-auth.backend';

/**
 * Single source of truth for the user's session.
 *
 * Surface mirrors `/docs/07 §4` exactly. Where the production design says
 * "POST /auth/login", the mocked implementation calls `MockAuthBackend.login`
 * — every other contract (signal shapes, race-safe refresh, logout reasons)
 * is the real one and will not need to change when the backend ships.
 *
 * Storage (CLAUDE.md §4 + /docs/07 §1.1):
 *   - `_accessToken` lives in a private signal — in memory only.
 *   - `_refreshToken` lives in a private field — also memory only. In the
 *     real system this is an httpOnly cookie set by the server; the mock
 *     can't set cookies, so we hold it here. It is NEVER written to
 *     localStorage / sessionStorage / IndexedDB.
 *   - `_refreshInFlight` enforces single-flight refresh for parallel 401s
 *     (/docs/07 §2.3, the standing acceptance scenario).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly mockBackend = inject(MockAuthBackend);
  private readonly router = inject(Router);
  private readonly bus = inject(AppEventBus);
  private readonly lang = inject(LanguageService);

  /* -------------------------- private state -------------------------- */
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);
  private readonly _roles = signal<readonly Role[]>([]);
  /** Mock-only — see class doc. Never persisted, never logged. */
  private _refreshToken: string | null = null;
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
   * On app boot, ask the backend (well, the mock) whether a refresh cookie
   * is still valid. If it is, hydrate the session silently so the user
   * stays logged in across tab close. If it isn't, stay logged out — no
   * banner, this is the expected "first visit" path.
   *
   * Returns the same promise the AppInitializer awaits, so failures here
   * never block app startup (they just leave the user signed out).
   */
  async bootstrap(): Promise<void> {
    if (!this._refreshToken) {
      // Mock: there's no httpOnly cookie to fall back to, so nothing to
      // hydrate from on a cold start. The real backend will let us call
      // /auth/refresh anyway and tell us 401 if there's no cookie.
      return;
    }
    try {
      const session = await this.mockBackend.refresh(this._refreshToken);
      this.adoptSession(session);
    } catch {
      // Silent — see /docs/07 §2.2. The user simply isn't signed in.
      this.clearSession();
    }
  }

  /**
   * Authenticate with email/username + password. Resolves on success (state
   * is hydrated, navigation has already happened) and rejects with a
   * user-facing message on failure (the form binds the error inline).
   */
  async login(creds: LoginCredentials, returnUrl?: string | null): Promise<void> {
    this._submitState.set({ status: 'pending' });
    try {
      const session = await this.mockBackend.login(creds);
      this.adoptSession(session);
      this._submitState.set({ status: 'success' });
      await this.router.navigateByUrl(returnUrl ?? '/dashboard');
    } catch (err) {
      const message = humaniseError(err, this.lang.t('auth.errors.invalidCredentials'));
      this._submitState.set({ status: 'error', message });
      throw new Error(message, { cause: err });
    }
  }

  /**
   * Create a new account and adopt its session. Returns immediately after
   * navigation, same shape as {@link login}.
   */
  async register(payload: RegisterPayload): Promise<void> {
    this._submitState.set({ status: 'pending' });
    try {
      const session = await this.mockBackend.register(payload);
      this.adoptSession(session);
      this._submitState.set({ status: 'success' });
      await this.router.navigateByUrl('/dashboard');
    } catch (err) {
      const message = humaniseError(err, this.lang.t('auth.errors.unknownError'));
      this._submitState.set({ status: 'error', message });
      throw new Error(message, { cause: err });
    }
  }

  /**
   * End the session. Always navigates to /auth/login regardless of whether
   * the backend logout call succeeded — never leave the user on a protected
   * screen with a half-cleared session.
   */
  async logout(opts: { reason: LogoutReason } = { reason: 'user-initiated' }): Promise<void> {
    const refresh = this._refreshToken;
    this.clearSession();
    try {
      await this.mockBackend.logout(refresh);
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
   * Race-safe refresh of the access token. The first caller fires the
   * network call; every parallel caller waits for the same observable and
   * adopts the new token. Used by `authInterceptor` on 401.
   *
   * Emits the new access token. Errors out (and logs the user out via
   * {@link handleRefreshFailure}) if the refresh round-trip fails.
   */
  refreshAccessToken(): Observable<string> {
    if (this._refreshInFlight) {
      return this._refreshInFlight;
    }
    this._refreshInFlight = defer(() => from(this.mockBackend.refresh(this._refreshToken))).pipe(
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
   * Called by the interceptor when refresh itself fails. Wipes the session
   * and bounces to /auth/login with `reason=refresh-failed` so the login
   * page can render the right banner (/docs/07 §2.4).
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
    this._refreshToken = session.refreshToken;
    this.bus.emit({ type: 'user.logged-in', userId: session.user.id });
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._roles.set([]);
    this._refreshToken = null;
    this._refreshInFlight = null;
  }
}

/**
 * UI-friendly view of "what is the auth flow currently doing?". Bound by
 * the login and register pages to render `pending` and `error` states
 * without each page re-implementing the same signal.
 */
export type SubmitState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; message: string };

function humaniseError(err: unknown, fallback: string): string {
  if (isMockHttpError(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
