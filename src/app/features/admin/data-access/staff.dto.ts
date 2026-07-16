/**
 * Wire shapes for admin staff management (BE-I-03 / B3). All routes are
 * **super_admin only** (backend-enforced).
 *
 *   POST   /admin/staff              → { data: StaffItem } (201; 409 dup email)
 *   GET    /admin/staff              → { data, meta.pagination } (cursor)
 *   GET    /admin/staff/:id          → { data: StaffItem }
 *   PATCH  /admin/staff/:id          → { data: StaffItem } (403 for super_admin target)
 *   POST   /admin/staff/:id/deactivate → { data: StaffItem }
 *
 * `super_admin` stays bootstrap-only: creating one or assigning that role is a
 * 400, and any write against a super_admin target is a 403.
 */

import { type PagedResponse } from '@core/http';

import { type StaffRole } from './staff.model';

/** Safe projection of an admin_users row — never includes the password hash. */
export interface StaffItemDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: StaffRole;
  readonly locale: string;
  readonly active: boolean;
  readonly createdAt: string;
}

/** `{ data, meta.pagination }` envelope for the staff list. */
export type StaffListResponseDto = PagedResponse<StaffItemDto>;

/** `{ data }` envelope for create / detail / update / deactivate. */
export interface StaffDetailResponseDto {
  readonly data: StaffItemDto;
}

/** `POST /admin/staff` body. `role` may not be `super_admin`. */
export interface CreateStaffBody {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: StaffRole;
  readonly locale?: string;
}

/** `PATCH /admin/staff/:id` body (partial). Email is immutable server-side. */
export interface UpdateStaffBody {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly role?: StaffRole;
  readonly locale?: string;
  readonly active?: boolean;
}
