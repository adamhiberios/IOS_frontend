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
 * backend's `forbidNonWhitelisted` rejects them with a 400. `avatarUrl` is set
 * to the storage `key` returned by the presigned-upload flow (BE-I-08 / A1); the
 * backend resolves it to a readable URL on the next `GET /me`.
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

/**
 * Body for `POST /me/avatar-upload-url` (BE-I-08). `contentType` must be one of
 * the allowed image types; the backend signs a PUT URL scoped to that exact
 * type, so the subsequent PUT must send the identical `Content-Type`.
 */
export interface AvatarUploadUrlRequestDto {
  readonly contentType: 'image/png' | 'image/jpeg' | 'image/webp';
}

/**
 * Bare response from `POST /me/avatar-upload-url` — a short-lived presigned PUT
 * target on object storage. `key` is the stored object path to hand back to
 * `PATCH /me { avatarUrl: key }` once the bytes are uploaded.
 */
export interface AvatarUploadUrlResponseDto {
  readonly uploadUrl: string;
  readonly key: string;
  readonly expiresInSeconds: number;
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
