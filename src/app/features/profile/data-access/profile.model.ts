/**
 * Profile domain types.
 *
 * Mirrors the backend `/me` profile (see `profile.dto.ts`) as a flat frontend
 * model. Nullable fields stay nullable so the UI can render an explicit
 * "not set" placeholder rather than an empty string. `firstName`, `lastName`,
 * and `email` are read-only here — they are locked server-side because they
 * appear on issued certificates; corrections go through support/admin tooling.
 */
export interface Profile {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly phone: string | null;
  /** Plain URL string — there is no avatar upload endpoint (BE-I-08). */
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
 * Mutable form payload for the "Update information" flow. Only the fields that
 * `PATCH /me` accepts (name/email are locked). Values are collected as strings;
 * the mapper converts blank strings to `null` so an emptied optional field is
 * cleared server-side.
 */
export interface UpdateProfilePayload {
  readonly phone: string;
  readonly country: string;
  readonly city: string;
  readonly street: string;
  readonly address: string;
  readonly postalCode: string;
  readonly occupation: string;
  readonly position: string;
  readonly company: string;
}

/**
 * Mutable form payload for the "Change password" flow. `confirmPassword` is a
 * client-side check only and is not sent — the API takes current + new.
 */
export interface ChangePasswordPayload {
  readonly currentPassword: string;
  readonly newPassword: string;
}
