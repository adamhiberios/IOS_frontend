/** Frontend domain model for admin exam authoring (list + lifecycle). */

/** The two exam lifecycle states. */
export const EXAM_STATUSES = ['draft', 'published'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

/** True when `value` is a known exam status. */
export function isExamStatus(value: string): value is ExamStatus {
  return (EXAM_STATUSES as readonly string[]).includes(value);
}

/** An exam as shown in the authoring list. */
export interface AdminExam {
  readonly id: string;
  readonly certId: string;
  readonly title: string;
  readonly examOrder: number;
  readonly status: ExamStatus;
  readonly passingScore: number;
  readonly durationMinutes: number;
  readonly questionCount: number;
}

/** Editable exam metadata (create + update share this shape). */
export interface ExamDraft {
  readonly title: string;
  readonly examOrder: number;
  readonly durationMinutes: number;
  readonly passingScore: number;
}

// ── Questions ────────────────────────────────────────────────────────────────

/** The two question types the backend supports (single-select). */
export const EXAM_QUESTION_TYPES = ['mcq', 'true_false'] as const;
export type ExamQuestionType = (typeof EXAM_QUESTION_TYPES)[number];

/** True when `value` is a known question type. */
export function isExamQuestionType(value: string): value is ExamQuestionType {
  return (EXAM_QUESTION_TYPES as readonly string[]).includes(value);
}

/** One answer option in the authoring view. */
export interface ExamQuestionOption {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** One exam question with its option set. */
export interface ExamQuestion {
  readonly id: string;
  readonly questionText: string;
  readonly questionType: ExamQuestionType;
  readonly position: number;
  readonly marks: number;
  readonly options: readonly ExamQuestionOption[];
}

/** The full authoring view: exam metadata + its questions. */
export interface ExamDetail {
  readonly id: string;
  readonly certId: string;
  readonly title: string;
  readonly examOrder: number;
  readonly status: ExamStatus;
  readonly passingScore: number;
  readonly durationMinutes: number;
  /** Per-locale title overrides (locale → title), only where a title is set. */
  readonly translations: Readonly<Record<string, string>>;
  readonly questions: readonly ExamQuestion[];
}

/* ─── Preview (student-facing shape) ─── */

/**
 * An option **as a candidate sees it**. Deliberately has no `isCorrect` field:
 * the backend strips it, and mirroring that omission in the type means the
 * preview UI *cannot* render a correct-answer hint even by accident.
 */
export interface ExamPreviewOption {
  readonly id: string;
  readonly optionText: string;
}

/** A question as a candidate sees it — no `marks`, no correctness. */
export interface ExamPreviewQuestion {
  readonly id: string;
  readonly questionText: string;
  readonly questionType: ExamQuestionType;
  readonly position: number;
  readonly options: readonly ExamPreviewOption[];
}

/**
 * The exam paper as it will be served to a candidate. Lets an author check
 * wording, option order and length before publishing — the publish gate is
 * irreversible enough (unpublish 409s once codes are issued) that seeing the
 * real paper first is worth a click.
 */
export interface ExamPreview {
  readonly id: string;
  readonly title: string;
  readonly examOrder: number;
  readonly passingScore: number;
  readonly durationMinutes: number;
  readonly status: ExamStatus;
  readonly questions: readonly ExamPreviewQuestion[];
}

/** One option in a question draft (no id — the backend assigns it). */
export interface QuestionOptionDraft {
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/**
 * Editable question payload shared by add and update. The publish gate requires
 * ≥2 options with exactly one correct (2 exactly for true_false) — enforced
 * client-side for UX and again by the backend at publish.
 */
export interface QuestionDraft {
  readonly questionText: string;
  readonly questionType: ExamQuestionType;
  readonly position: number;
  readonly marks: number;
  readonly options: readonly QuestionOptionDraft[];
}
