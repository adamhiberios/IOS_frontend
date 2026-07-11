/**
 * Wire-level shapes returned by the real backend `/auth/*` endpoints.
 *
 * Source of truth: `IOS_Backend` — `modules/auth/dto/responses.ts`
 * (`LoginResponseDto`, `AuthUserResponseDto`, `RegisterResponseDto`,
 * `MessageResponseDto`). These mirror the backend field names exactly; the
 * mapping into the frontend `AuthSession` / `User` happens in `auth.api.ts`.
 *
 * Kept separate from `auth.model.ts` (the frontend domain model) so the
 * transport contract can change independently of the UI-facing types.
 */

import { type AdminRole } from './role.guard';

/** Account type the backend attaches to every principal. */
export type BackendAccountType = 'student' | 'admin';

/** `AuthUserResponseDto` — the authenticated principal as the backend serialises it. */
export interface AuthUserResponse {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly locale: string;
  readonly emailVerified: boolean;
  readonly type: BackendAccountType;
  /** Admin role when `type === 'admin'`, otherwise `null`. */
  readonly role: AdminRole | null;
}

/** `LoginResponseDto` — returned by login and refresh (access token in the body). */
export interface LoginResponse {
  readonly accessToken: string;
  /** Access-token TTL in seconds. */
  readonly expiresIn: number;
  readonly user: AuthUserResponse;
}

/** `MessageResponseDto` — a bare `{ message }` acknowledgement. */
export interface MessageResponse {
  readonly message: string;
}

/** `RegisterResponseDto` — registration acknowledgement (NO session issued). */
export interface RegisterResponse extends MessageResponse {
  readonly userId: string;
}

/** `POST /auth/(admin/)login` request body. */
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

/**
 * `POST /auth/register` request body. Only the fields the backend `RegisterDto`
 * accepts — `whitelist + forbidNonWhitelisted` on the server rejects anything
 * else with a 400, so the frontend must not send extra keys (e.g. `username`).
 */
export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly locale?: string;
  readonly country?: string;
}
