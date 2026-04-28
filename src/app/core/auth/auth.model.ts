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

import { type AppRole } from './role.guard';

/** Convenience re-export so consumers can import everything from the model. */
export type Role = AppRole;

/**
 * Authenticated user as the frontend sees them. The backend ships the full
 * profile separately when needed; this is just the session-scoped slice.
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  /** ISO-3166 alpha-2 country code (e.g. "SA", "CA"). */
  readonly country: string;
}

/**
 * Login form payload. The backend accepts either an email or a username under
 * `identifier`; the frontend never tries to disambiguate which is which.
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
 * What the backend returns on a successful auth handshake (login / register /
 * silent refresh). The `refreshToken` is normally invisible to JS — it lives
 * in an httpOnly cookie. The mock backend exposes it here only because we
 * have no real cookie jar to set it into; `AuthStore` keeps it in a private
 * field and never persists it to storage. See CLAUDE.md §8 + /docs/07 §1.1.
 */
export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: User;
  readonly roles: readonly Role[];
}

/**
 * Why the user got logged out. Drives the post-logout banner copy on the
 * login page (see /docs/07 §2.4 for the full table).
 */
export type LogoutReason = 'user-initiated' | 'idle' | 'refresh-failed' | 'forced';

/** Subset of `User` fields the register form already collected. */
export type RegisterUserSeed = Omit<User, 'id'>;
