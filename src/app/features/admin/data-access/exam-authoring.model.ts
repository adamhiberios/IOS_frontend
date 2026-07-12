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
