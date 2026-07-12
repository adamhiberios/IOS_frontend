/** Frontend domain model for admin mock-question authoring. */

/** The two question types the backend supports (single-select MCQ). */
export const MOCK_QUESTION_TYPES = ['mcq', 'true_false'] as const;
export type MockQuestionType = (typeof MOCK_QUESTION_TYPES)[number];

/** True when `value` is a known question type. */
export function isMockQuestionType(value: string): value is MockQuestionType {
  return (MOCK_QUESTION_TYPES as readonly string[]).includes(value);
}

/** One answer option in the authoring view. */
export interface MockQuestionOption {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** A mock question with its option set. */
export interface MockQuestion {
  readonly id: string;
  readonly certId: string;
  readonly questionText: string;
  readonly questionType: MockQuestionType;
  readonly position: number;
  readonly active: boolean;
  readonly options: readonly MockQuestionOption[];
}

/** One option in a create/update payload (no id — the backend assigns it). */
export interface MockQuestionOptionDraft {
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/**
 * Editable payload shared by create and update. Exactly one option must be
 * marked correct and there must be at least two — the backend rejects otherwise
 * (`assertExactlyOneCorrect`, `ArrayMinSize(2)`).
 */
export interface MockQuestionDraft {
  readonly questionText: string;
  readonly questionType: MockQuestionType;
  readonly position: number;
  readonly options: readonly MockQuestionOptionDraft[];
}
