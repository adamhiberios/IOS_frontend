/** Frontend domain model for admin exam assignment. */

/** A published exam that can be assigned to a student. */
export interface PublishedExam {
  readonly id: string;
  readonly title: string;
  readonly examOrder: number;
  readonly durationMinutes: number;
  readonly passingScore: number;
}

/**
 * The one-time access code issued by an assignment. `plainCode` is shown once —
 * it is never retrievable again. `examTitle`/`examOrder` are populated on the
 * auto-assign path; `null` when a specific exam was targeted.
 */
export interface IssuedAccessCode {
  readonly plainCode: string;
  readonly expiresAt: string;
  readonly examId: string;
  readonly examTitle: string | null;
  readonly examOrder: number | null;
}
