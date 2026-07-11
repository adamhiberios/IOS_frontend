import { type StudentDetailDto, type UserItemDto } from './users.dto';
import { type StudentDetail, type StudentListItem } from './users.model';

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Map a wire `UserItemDto` to a `StudentListItem`. */
export function toStudentListItem(dto: UserItemDto): StudentListItem {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: fullName(dto.firstName, dto.lastName),
    email: dto.email,
    emailVerified: dto.emailVerified,
    createdAt: dto.createdAt,
  };
}

/** Map a wire `StudentDetailDto` to a `StudentDetail`. */
export function toStudentDetail(dto: StudentDetailDto): StudentDetail {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: fullName(dto.firstName, dto.lastName),
    email: dto.email,
    emailVerified: dto.emailVerified,
    locale: dto.locale,
    country: dto.country,
    createdAt: dto.createdAt,
    counts: {
      purchases: dto.counts.purchases,
      attempts: dto.counts.attempts,
      certificatesEarned: dto.counts.certificatesEarned,
    },
  };
}
