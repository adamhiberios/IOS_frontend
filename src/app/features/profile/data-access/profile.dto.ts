/**
 * Wire shapes for the student self-service profile endpoints — mirror the
 * backend `ProfileResponseDto` / `UpdateProfileDto` / `UpdatePasswordDto`
 * exactly (`docs/backend-analysis.md` §6.2, §7.1). Names match the JSON on the
 * wire. All three `/me` endpoints return **bare DTOs** (no `{ data }` envelope).
 */

/** `GET /me` and the `PATCH /me` response — the full student profile. */
export interface ProfileResponseDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  /** Backend-computed `firstName + lastName`. */
  readonly fullName: string;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly country: string | null;
  readonly city: string | null;
  readonly street: string | null;
  readonly address: string | null;
  readonly postalCode: string | null;
  readonly occupation: string | null;
  readonly position: string | null;
  readonly company: string | null;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly emailVerified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Body for `PATCH /me`. Every field is optional; an explicit `null` clears the
 * stored value. `firstName`, `lastName`, and `email` are intentionally absent —
 * they are LOCKED server-side (they appear on issued certificates) and the
 * backend's `forbidNonWhitelisted` rejects them with a 400. `avatarUrl` is a
 * plain URL string (there is no upload endpoint — BE-I-08).
 */
export interface UpdateProfileDto {
  readonly phone?: string | null;
  readonly locale?: string;
  readonly country?: string | null;
  readonly city?: string | null;
  readonly street?: string | null;
  readonly address?: string | null;
  readonly postalCode?: string | null;
  readonly occupation?: string | null;
  readonly position?: string | null;
  readonly company?: string | null;
  readonly avatarUrl?: string | null;
}

/** Body for `PATCH /me/password`. */
export interface UpdatePasswordDto {
  readonly currentPassword: string;
  readonly newPassword: string;
}

/** `PATCH /me/password` response — a simple acknowledgement message. */
export interface MessageResponseDto {
  readonly message: string;
}
