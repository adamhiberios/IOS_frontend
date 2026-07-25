/**
 * DTO → domain mappers for the mock-exam engine. Keeps wire field names
 * (`questionText`, `optionText`, …) out of the store/UI.
 */

import {
  type MockExtendResponseDto,
  type MockHistoryItemDto,
  type MockOptionDto,
  type MockQuestionDto,
  type MockReadinessDto,
  type MockResultResponseDto,
  type MockReviewQuestionDto,
  type MockReviewResponseDto,
  type MockRevealResponseDto,
  type MockSessionResponseDto,
  type StartMockResponseDto,
} from './mock.dto';
import {
  type MockExtension,
  type MockHistoryItem,
  type MockOption,
  type MockQuestion,
  type MockReadiness,
  type MockResult,
  type MockReveal,
  type MockReview,
  type MockReviewQuestion,
  type MockSession,
  type MockStart,
} from './mock.model';

function toMockOption(dto: MockOptionDto): MockOption {
  return { id: dto.id, text: dto.optionText };
}

function toMockQuestion(dto: MockQuestionDto): MockQuestion {
  return {
    id: dto.id,
    text: dto.questionText,
    type: dto.questionType,
    position: dto.position,
    options: dto.options.map(toMockOption),
  };
}

function toReadiness(dto: MockReadinessDto): MockReadiness {
  return {
    readyForFinal: dto.readyForFinal,
    thresholdPct: dto.thresholdPct,
    message: dto.message,
  };
}

/** Present questions in position order regardless of wire order. */
function toOrderedQuestions(dtos: readonly MockQuestionDto[]): MockQuestion[] {
  return [...dtos].sort((a, b) => a.position - b.position).map(toMockQuestion);
}

export function toMockStart(dto: StartMockResponseDto): MockStart {
  return {
    attemptId: dto.attemptId,
    certId: dto.certId,
    durationSeconds: dto.durationSeconds,
    expiresAt: dto.expiresAt,
    extensionsRemaining: dto.extensionsRemaining,
    questionCount: dto.questionCount,
    questions: toOrderedQuestions(dto.questions),
  };
}

export function toMockSession(dto: MockSessionResponseDto): MockSession {
  return {
    attemptId: dto.attemptId,
    certId: dto.certId,
    status: dto.status,
    remainingSeconds: dto.remainingSeconds,
    timeUp: dto.timeUp,
    extensionsUsed: dto.extensionsUsed,
    extensionsRemaining: dto.extensionsRemaining,
    answers: { ...dto.answers },
    questions: toOrderedQuestions(dto.questions),
  };
}

export function toMockExtension(dto: MockExtendResponseDto): MockExtension {
  return {
    extensionsUsed: dto.extensionsUsed,
    extensionsRemaining: dto.extensionsRemaining,
    remainingSeconds: dto.remainingSeconds,
  };
}

export function toMockResult(dto: MockResultResponseDto): MockResult {
  return {
    attemptId: dto.attemptId,
    certId: dto.certId,
    status: dto.status,
    score: dto.score,
    correctCount: dto.correctCount,
    totalCount: dto.totalCount,
    falseCount: dto.falseCount,
    readyForFinal: dto.readyForFinal,
    readiness: toReadiness(dto.readiness),
    durationSeconds: dto.durationSeconds,
  };
}

export function toMockReveal(dto: MockRevealResponseDto): MockReveal {
  return { selectedCorrect: dto.selectedCorrect, correctOptionId: dto.correctOptionId };
}

export function toMockHistoryItem(dto: MockHistoryItemDto): MockHistoryItem {
  return {
    attemptId: dto.attemptId,
    certId: dto.certId,
    status: dto.status,
    score: dto.score,
    correctCount: dto.correctCount,
    totalCount: dto.totalCount,
    falseCount: dto.falseCount,
    readyForFinal: dto.readyForFinal,
    extensionsUsed: dto.extensionsUsed,
    startedAt: dto.startedAt,
    submittedAt: dto.submittedAt,
  };
}

function toMockReviewQuestion(dto: MockReviewQuestionDto): MockReviewQuestion {
  return {
    questionId: dto.questionId,
    questionText: dto.questionText,
    options: dto.options.map(toMockOption),
    selectedOptionId: dto.selectedOptionId,
    correctOptionId: dto.correctOptionId,
    isCorrect: dto.isCorrect,
  };
}

export function toMockReview(dto: MockReviewResponseDto): MockReview {
  const d = dto.data;
  return {
    attemptId: d.attemptId,
    certId: d.certId,
    status: d.status,
    score: d.score,
    correctCount: d.correctCount,
    totalCount: d.totalCount,
    falseCount: d.falseCount,
    readyForFinal: d.readyForFinal,
    readiness: toReadiness(d.readiness),
    extensionsUsed: d.extensionsUsed,
    startedAt: d.startedAt,
    submittedAt: d.submittedAt,
    durationSeconds: d.durationSeconds,
    questions: d.questions.map(toMockReviewQuestion),
  };
}
