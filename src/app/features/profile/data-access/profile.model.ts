/**
 * Profile domain types.
 *
 * Separates the richer profile data from the lean `User` record in `core/auth`
 * which only carries session-scoped fields. Profile data is fetched on demand
 * when the user navigates to the Profile feature.
 */

export interface ProfilePersonal {
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  /** IOS-assigned learner identifier, e.g. "241242". */
  readonly iosId: string;
  readonly email: string;
  readonly city: string;
  readonly street: string;
  readonly address: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface ProfileProfessional {
  readonly occupation: string;
  readonly companyName: string;
  readonly position: string;
}

export interface Profile {
  readonly personal: ProfilePersonal;
  readonly professional: ProfileProfessional;
}

/** Mutable form payload for the "Update information" flow. */
export interface UpdateProfilePayload {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly country: string;
  readonly city: string;
  readonly street: string;
  readonly address: string;
  readonly postalCode: string;
  readonly occupation: string;
  readonly position: string;
  readonly companyName: string;
}

/** Mutable form payload for the "Change password" flow. */
export interface ChangePasswordPayload {
  readonly oldPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}
