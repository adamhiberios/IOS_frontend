import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type AuthUserResponse,
  type LoginRequest,
  type LoginResponse,
  type MessageResponse,
  type RegisterRequest,
  type RegisterResponse,
} from './auth.dto';
import {
  type AuthSession,
  type LoginCredentials,
  type RegisterPayload,
  type Role,
  type User,
} from './auth.model';

/**
 * Real auth transport against the deployed backend `/auth/*` API.
 *
 * Replaces the removed in-process mock backend. Everything the rest of the auth
 * layer relies on (`AuthStore`, guards, interceptor) is unchanged — only the
 * source of a session moved from an in-memory table to real HTTP.
 *
 * Refresh model (backend `AuthController`):
 *   - Login/refresh return the access token + `expiresIn` in the JSON body.
 *   - The refresh token is an **httpOnly cookie** scoped to `/api/v1/auth`, set
 *     by the server. It is invisible to JS, so every auth call sends
 *     `withCredentials: true` and the browser attaches the cookie automatically.
 *   - `/auth/refresh` serves both students and admins — the backend branches on
 *     the refresh token's `type` claim — so one endpoint covers both.
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  /** Student login — `POST /auth/login`. */
  loginStudent(creds: LoginCredentials): Observable<AuthSession> {
    return this.http
      .post<LoginResponse>(`${this.base}/login`, this.toLoginRequest(creds), {
        withCredentials: true,
      })
      .pipe(map((res) => this.toSession(res)));
  }

  /** Admin/staff login — `POST /auth/admin/login`. */
  loginAdmin(creds: LoginCredentials): Observable<AuthSession> {
    return this.http
      .post<LoginResponse>(`${this.base}/admin/login`, this.toLoginRequest(creds), {
        withCredentials: true,
      })
      .pipe(map((res) => this.toSession(res)));
  }

  /**
   * Register a new student — `POST /auth/register`. Returns the backend
   * acknowledgement (no session). The account is created `emailVerified=false`;
   * the user must verify their email before they can log in.
   */
  register(payload: RegisterPayload): Observable<RegisterResponse> {
    const body: RegisterRequest = {
      email: payload.email.trim(),
      password: payload.password,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      country: payload.country?.trim() || undefined,
    };
    return this.http.post<RegisterResponse>(`${this.base}/register`, body, {
      withCredentials: true,
    });
  }

  /**
   * Request a password-reset link — `POST /auth/forgot-password`. The backend
   * always responds 200 regardless of whether the email exists (anti-
   * enumeration); a valid address is emailed a 1-hour reset token.
   */
  requestPasswordReset(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/forgot-password`, {
      email: email.trim().toLowerCase(),
    });
  }

  /**
   * Submit a new password with a reset token — `POST /auth/reset-password`.
   * Revokes all of the account's refresh tokens on success (forces re-login).
   */
  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/reset-password`, {
      token,
      newPassword,
    });
  }

  /**
   * Verify a registered email address — `POST /auth/verify-email`. Consumes the
   * single-use token from the registration email (expires 24 h after signup).
   * 4xx on an invalid/expired/already-used token.
   */
  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/verify-email`, { token });
  }

  /**
   * Re-send the email-verification link — `POST /auth/resend-verification`.
   * Anti-enumeration: the response is identical whether or not the email exists
   * or is already verified.
   */
  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/resend-verification`, {
      email: email.trim().toLowerCase(),
    });
  }

  /** Rotate the refresh cookie and mint a new access token — `POST /auth/refresh`. */
  refresh(): Observable<AuthSession> {
    return this.http
      .post<LoginResponse>(`${this.base}/refresh`, {}, { withCredentials: true })
      .pipe(map((res) => this.toSession(res)));
  }

  /** Revoke the current refresh token and clear the cookie — `POST /auth/logout`. */
  logout(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/logout`, {}, { withCredentials: true });
  }

  /* ------------------------------- mappers ------------------------------- */

  private toLoginRequest(creds: LoginCredentials): LoginRequest {
    // The login form collects an `identifier`; the backend authenticates by
    // email. Trim + lowercase to match the backend's own normalisation.
    return { email: creds.identifier.trim().toLowerCase(), password: creds.password };
  }

  private toSession(res: LoginResponse): AuthSession {
    return {
      accessToken: res.accessToken,
      expiresIn: res.expiresIn,
      user: this.toUser(res.user),
      roles: this.toRoles(res.user),
    };
  }

  private toUser(u: AuthUserResponse): User {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: u.fullName,
      locale: u.locale,
      emailVerified: u.emailVerified,
      type: u.type,
      role: u.role,
    };
  }

  /**
   * Collapse the backend `type` + `role` into the frontend's flat role space:
   * a student carries the synthetic `student` role; an admin carries their
   * `AdminRole`. `AuthStore.hasAnyRole` / `roleGuard` check membership here.
   */
  private toRoles(u: AuthUserResponse): readonly Role[] {
    if (u.type === 'admin' && u.role) {
      return [u.role];
    }
    return ['student'];
  }
}
