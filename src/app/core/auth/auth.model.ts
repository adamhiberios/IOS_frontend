/**
 * Auth domain types — shared across `core/auth/` and the auth feature.
 *
 * Source of truth: `/docs/07-authentication-authorization.md`.
 *
 * Notes:
 *   - `Role` mirrors the role catalog in §3.1. New roles must be added here
 *     AND in the route permission matrix (§3.4); the two are kept in lockstep.
 *   - `User` is intentionally narrow — only fields needed for UI rendering.
 *     Anything PII-shaped beyond name/email/country goes through `core/profile`
 *     (a future epic) and is fetched on demand, not embedded in the session.
 */

import { type AdminRole, type AppRole } from './role.guard';

/** Convenience re-export so consumers can import everything from the model. */
export type Role = AppRole;

/** Backend account type — `student` (learners) or `admin` (staff). */
export type AccountType = 'student' | 'admin';

/**
 * Authenticated user as the frontend sees them — mapped from the backend
 * `AuthUserResponseDto`. Just the session-scoped slice; the full profile is
 * fetched on demand via `GET /me`.
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  /** Computed `firstName + lastName` from the backend. */
  readonly fullName: string;
  readonly locale: string;
  readonly emailVerified: boolean;
  readonly type: AccountType;
  /** Admin role when `type === 'admin'`, otherwise `null`. */
  readonly role: AdminRole | null;
}

/**
 * Login form payload. The form field is called `identifier` for historical
 * reasons; `AuthApi` maps it to the backend's `email` field.
 */
export interface LoginCredentials {
  readonly identifier: string;
  readonly password: string;
}

/** Register form payload — mirrors the visible fields in `register.page.ts`. */
export interface RegisterPayload {
  readonly firstName: string;
  readonly lastName: string;
  readonly country: string;
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly newsletter: boolean;
}

/**
 * Frontend view of a successful auth handshake (login / silent refresh),
 * mapped from the backend `LoginResponseDto`. The refresh token is NOT here —
 * it lives in an httpOnly cookie set by the server (invisible to JS). Only the
 * access token (kept in memory by `AuthStore`) crosses into app state.
 * See CLAUDE.md §8 + `docs/backend-analysis.md` §5.
 */
export interface AuthSession {
  readonly accessToken: string;
  /** Access-token TTL in seconds (`LoginResponseDto.expiresIn`). */
  readonly expiresIn: number;
  readonly user: User;
  readonly roles: readonly Role[];
}

/**
 * A pending admin OTP step (from `POST /auth/admin/login` with OTP enabled): the
 * password was accepted, but a 6-digit code was emailed and must be verified via
 * `POST /auth/admin/login/otp` before any session/token exists.
 */
export interface AdminLoginChallenge {
  readonly challengeId: string;
  readonly expiresInSeconds: number;
}

/**
 * Result of an admin login attempt: either a full session (OTP disabled) or an
 * OTP challenge (OTP enabled) — no partial/token state exists in the `otp` case.
 */
export type AdminLoginResult =
  | { readonly kind: 'session'; readonly session: AuthSession }
  | { readonly kind: 'otp'; readonly challenge: AdminLoginChallenge };

/**
 * Why the user got logged out. Drives the post-logout banner copy on the
 * login page (see /docs/07 §2.4 for the full table).
 */
export type LogoutReason = 'user-initiated' | 'idle' | 'refresh-failed' | 'forced';
