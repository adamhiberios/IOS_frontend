import { type CreateStaffBody, type StaffItemDto, type UpdateStaffBody } from './staff.dto';
import { type CreateStaffPayload, type StaffMember, type UpdateStaffPayload } from './staff.model';

/** Map a staff DTO to the domain model (1:1; backend guarantees a valid role). */
export function toStaffMember(dto: StaffItemDto): StaffMember {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    role: dto.role,
    locale: dto.locale,
    active: dto.active,
    createdAt: dto.createdAt,
  };
}

export function toCreateStaffBody(payload: CreateStaffPayload): CreateStaffBody {
  return {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    role: payload.role,
    locale: payload.locale,
  };
}

export function toUpdateStaffBody(payload: UpdateStaffPayload): UpdateStaffBody {
  return {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    role: payload.role,
    locale: payload.locale,
  };
}
