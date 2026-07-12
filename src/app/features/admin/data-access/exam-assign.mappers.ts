import { type AssignExamResponseDto, type PublishedExamDto } from './exam-assign.dto';
import { type IssuedAccessCode, type PublishedExam } from './exam-assign.model';

/** Map a wire `PublishedExamDto` to a `PublishedExam`. */
export function toPublishedExam(dto: PublishedExamDto): PublishedExam {
  return {
    id: dto.id,
    title: dto.title,
    examOrder: dto.examOrder,
    durationMinutes: dto.durationMinutes,
    passingScore: dto.passingScore,
  };
}

/** Map a wire `AssignExamResponseDto` to an `IssuedAccessCode`. */
export function toIssuedAccessCode(dto: AssignExamResponseDto): IssuedAccessCode {
  return {
    plainCode: dto.plainCode,
    expiresAt: dto.expiresAt,
    examId: dto.examId,
    examTitle: dto.examTitle ?? null,
    examOrder: dto.examOrder ?? null,
  };
}
