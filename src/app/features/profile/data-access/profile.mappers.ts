import { type ProfileResponseDto, type UpdateProfileDto } from './profile.dto';
import { type Profile, type UpdateProfilePayload } from './profile.model';

/** Map a wire `ProfileResponseDto` to the frontend `Profile` model (1:1). */
export function toProfile(dto: ProfileResponseDto): Profile {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: dto.fullName,
    phone: dto.phone,
    avatarUrl: dto.avatarUrl,
    country: dto.country,
    city: dto.city,
    street: dto.street,
    address: dto.address,
    postalCode: dto.postalCode,
    occupation: dto.occupation,
    position: dto.position,
    company: dto.company,
    locale: dto.locale,
    direction: dto.direction,
    emailVerified: dto.emailVerified,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Trim; return `null` for an empty string so an emptied field clears server-side. */
function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Map the "Update information" form payload to the `PATCH /me` body. Every field
 * is nullable — a blank input becomes an explicit `null`, which the backend
 * treats as "clear this field". `firstName`/`lastName`/`email` are never sent
 * (locked). `locale` is managed by the Settings/language flow, not this form.
 */
export function toUpdateProfileDto(payload: UpdateProfilePayload): UpdateProfileDto {
  return {
    phone: nullable(payload.phone),
    country: nullable(payload.country),
    city: nullable(payload.city),
    street: nullable(payload.street),
    address: nullable(payload.address),
    postalCode: nullable(payload.postalCode),
    occupation: nullable(payload.occupation),
    position: nullable(payload.position),
    company: nullable(payload.company),
  };
}
