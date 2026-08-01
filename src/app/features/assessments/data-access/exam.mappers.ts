/**
 * DTO ↔ domain mappers for the real-exam engine. Keeps wire field names
 * (`questionText`, `optionText`, …) out of the store/UI, and narrows the
 * backend's stringly-typed enums into the domain unions.
 */

import {
  type ExamAttemptReviewDto,
  type ExamOptionDto,
  type ExamQuestionDto,
  type ReviewQuestionDto,
  type ScoreResultDto,
  type SessionStatusResponseDto,
  type StartExamResponseDto,
  type ValidateAccessResponseDto,
} from './exam.dto';
import {
  type AnswerMap,
  type ExamAccessPreview,
  type ExamAttemptReview,
  type ExamOption,
  type ExamQuestion,
  type ExamQuestionType,
  type ExamReviewQuestion,
  type ExamScoreResult,
  type ExamSessionSnapshot,
  type ExamSessionStart,
  type TestSessionStatus,
} from './exam.model';

/** Narrow the backend's `questionType` string to the domain union (unknown → `mcq`). */
function toQuestionType(raw: string): ExamQuestionType {
  return raw === 'true_false' ? 'true_false' : 'mcq';
}

/** Narrow the backend's `TestSessionStatus` string to the domain union (unknown → `active`). */
export function toTestSessionStatus(raw: string): TestSessionStatus {
  switch (raw) {
    case 'submitted':
    case 'expired':
    case 'auto_submitted':
      return raw;
    default:
      return 'active';
  }
}

function toExamOption(dto: ExamOptionDto): ExamOption {
  return { id: dto.id, text: dto.optionText };
}

export function toExamQuestion(dto: ExamQuestionDto): ExamQuestion {
  return {
    id: dto.id,
    text: dto.questionText,
    type: toQuestionType(dto.questionType),
    position: dto.position,
    options: (dto.options ?? []).map(toExamOption),
  };
}

export function toExamSessionStart(dto: StartExamResponseDto): ExamSessionStart {
  return {
    sessionId: dto.sessionId,
    durationSeconds: dto.durationSeconds,
    expiresAt: dto.expiresAt,
    // Defensive: present the runner questions in position order regardless of wire order.
    questions: [...dto.questions].sort((a, b) => a.position - b.position).map(toExamQuestion),
  };
}

export function toExamSessionSnapshot(dto: SessionStatusResponseDto): ExamSessionSnapshot {
  return {
    sessionId: dto.sessionId,
    remainingSeconds: dto.remainingSeconds,
    answers: { ...dto.answers },
    status: toTestSessionStatus(dto.status),
  };
}

export function toExamAccessPreview(dto: ValidateAccessResponseDto): ExamAccessPreview {
  return {
    valid: dto.valid,
    accessCodeId: dto.accessCodeId,
    expiresAt: dto.expiresAt,
    exam: {
      id: dto.exam.id,
      title: dto.exam.title,
      durationMinutes: dto.exam.durationMinutes,
      passingScore: dto.exam.passingScore,
    },
  };
}

export function toExamScoreResult(dto: ScoreResultDto): ExamScoreResult {
  return {
    score: dto.score,
    passed: dto.passed,
    correctCount: dto.correctCount,
    totalCount: dto.totalCount,
  };
}

/**
 * Domain answers → wire payload. v1 answers are already a plain
 * `questionId → optionId` map, so this is a defensive copy that also pins the
 * mutable `Record` shape the autosave/submit DTOs expect.
 */
export function toAnswersDto(answers: AnswerMap): Record<string, string> {
  return { ...answers };
}

/* ─── Post-submission answer review (BE-I-22) ─── */

/** Map one reviewed question, narrowing `questionType` and sorting nothing. */
function toExamReviewQuestion(dto: ReviewQuestionDto): ExamReviewQuestion {
  return {
    questionId: dto.questionId,
    questionText: dto.questionText,
    questionType: dto.questionType === 'true_false' ? 'true_false' : 'mcq',
    position: dto.position,
    options: (dto.options ?? []).map((o) => ({
      id: o.id,
      optionText: o.optionText,
      isCorrect: o.isCorrect === true,
    })),
    selectedOptionId: dto.selectedOptionId,
    correctOptionId: dto.correctOptionId,
    isCorrect: dto.isCorrect === true,
    explanation: dto.explanation,
  };
}

/**
 * Map the review payload. Questions are sorted by `position` so the review
 * reads in the same order the candidate sat the paper — the backend orders
 * them already, but the review is a side-by-side comparison against memory of
 * that order, so it isn't left to response ordering.
 */
export function toExamAttemptReview(dto: ExamAttemptReviewDto): ExamAttemptReview {
  return {
    attemptId: dto.attemptId,
    examId: dto.examId,
    examTitle: dto.examTitle,
    program: dto.program,
    score: dto.score,
    passed: dto.passed,
    correctCount: dto.correctCount,
    totalCount: dto.totalCount,
    submittedAt: dto.submittedAt,
    status: dto.status,
    questions: [...(dto.questions ?? [])]
      .map(toExamReviewQuestion)
      .sort((a, b) => a.position - b.position),
  };
}
