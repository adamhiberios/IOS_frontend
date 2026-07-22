import { type ExamAttemptItemDto } from './exam-attempts.dto';
import { type ExamAttempt, type ExamAttemptStatus } from './exam-attempts.model';

/** Narrow the backend status string to the known union, defaulting to `submitted`. */
function toStatus(status: string): ExamAttemptStatus {
  return status === 'auto_submitted' ? 'auto_submitted' : 'submitted';
}

/** Map one `GET /exam/attempts` item DTO to the frontend {@link ExamAttempt}. */
export function toExamAttempt(dto: ExamAttemptItemDto): ExamAttempt {
  return {
    id: dto.id,
    examTitle: dto.examTitle,
    program: dto.program,
    score: dto.score,
    passed: dto.passed,
    submittedAt: dto.submittedAt,
    durationSeconds: dto.durationSeconds,
    status: toStatus(dto.status),
    lateFlag: dto.lateFlag,
  };
}
