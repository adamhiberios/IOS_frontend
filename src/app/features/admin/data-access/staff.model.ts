/**
 * Frontend domain model for admin staff management (BE-I-03 / B3).
 * Mirrors `staff.dto.ts`.
 */

/** The five admin roles (matches the backend `AdminRole` enum). */
export const STAFF_ROLES = [
  'super_admin',
  'learning_admin',
  'content_creator',
  'finance_admin',
  'support_admin',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Roles a super_admin may assign on create / edit. `super_admin` is excluded —
 * it stays bootstrap-only (the backend 400s any attempt to assign it).
 */
export const ASSIGNABLE_STAFF_ROLES: readonly StaffRole[] = [
  'learning_admin',
  'content_creator',
  'finance_admin',
  'support_admin',
];

/** Locales a staff account can carry (matches the app's supported locales). */
export const STAFF_LOCALES = ['en', 'fr', 'ar'] as const;

/** True when `value` is a known admin role. */
export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

export interface StaffMember {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: StaffRole;
  readonly locale: string;
  readonly active: boolean;
  readonly createdAt: string;
}

/** Optional server-side filters for the staff list. */
export interface StaffFilters {
  readonly search?: string;
  readonly role?: StaffRole;
  readonly active?: boolean;
}

/** Editable fields when creating a staff account (password required). */
export interface CreateStaffPayload {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: StaffRole;
  readonly locale: string;
}

/** Editable fields when updating a staff account (email/password not editable here). */
export interface UpdateStaffPayload {
  readonly firstName: string;
  readonly lastName: string;
  readonly role: StaffRole;
  readonly locale: string;
}

/** Minimum password length the backend enforces on create. */
export const STAFF_PASSWORD_MIN = 12;

/** `super_admin` accounts are immutable (backend 403s edit / deactivate). */
export function isEditableStaff(member: StaffMember): boolean {
  return member.role !== 'super_admin';
}
