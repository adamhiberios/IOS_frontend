/**
 * Domain model for the student learning experience (`features/courses`, wired to
 * the backend `/learning/*` endpoints). Wire field names (`contentHtml`,
 * `hasVideo`, …) are kept out of the store/UI via `courses.mappers.ts`.
 */

/** A lesson as it appears in the curriculum tree (no content, with completion). */
export interface LessonSummary {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly durationSeconds: number | null;
  readonly hasVideo: boolean;
  readonly completed: boolean;
}

/** A module (group of lessons) within a certificate's curriculum. */
export interface CourseModule {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly lessons: readonly LessonSummary[];
}

/** The full curriculum for an enrolled certificate. */
export interface Curriculum {
  readonly certificate: {
    readonly id: string;
    readonly programCode: string;
    readonly title: string;
  };
  readonly modules: readonly CourseModule[];
}

/** A single lesson with its (localised) content and a signed video URL. */
export interface Lesson {
  readonly id: string;
  readonly moduleId: string;
  readonly title: string;
  /** HTML — MUST be sanitised before rendering (no raw `innerHTML`). */
  readonly contentHtml: string | null;
  /** Short-lived signed URL, or null. Re-fetch the lesson to refresh it. */
  readonly videoUrl: string | null;
  /** Seconds the signed `videoUrl` stays valid, or null when there's no video. */
  readonly videoUrlExpiresInSeconds: number | null;
  readonly durationSeconds: number | null;
  readonly position: number;
  readonly completed: boolean;
  readonly completedAt: string | null;
}

/** A quiz question shown to the student (correct answer stripped server-side). */
export interface QuizQuestion {
  readonly id: string;
  readonly questionText: string;
  /** Non-empty ⇒ multiple-choice; null ⇒ free-text answer. */
  readonly options: readonly string[] | null;
  readonly position: number;
}

/** A lesson's self-check quiz. Unlimited attempts; results are never stored. */
export interface LessonQuiz {
  readonly id: string;
  readonly lessonId: string;
  readonly title: string;
  readonly questions: readonly QuizQuestion[];
}

/** Per-question feedback from checking a quiz (reveals the correct answer). */
export interface QuizAnswerResult {
  readonly questionId: string;
  readonly yourAnswer: string | null;
  readonly correct: boolean;
  readonly correctAnswer: string;
}

/** Aggregate + per-question result of a quiz check (nothing persisted). */
export interface QuizCheckResult {
  readonly quizId: string;
  readonly lessonId: string;
  readonly correctCount: number;
  readonly totalCount: number;
  /** 0–100. */
  readonly score: number;
  readonly results: readonly QuizAnswerResult[];
}

/** Result of marking a lesson complete (idempotent). */
export interface LessonCompletion {
  readonly lessonId: string;
  readonly completedAt: string;
  readonly alreadyCompleted: boolean;
}

/** Per-certificate progress summary for the courses index. */
export interface CourseProgress {
  readonly certId: string;
  readonly programCode: string;
  readonly title: string;
  readonly totalLessons: number;
  readonly completedLessons: number;
  /** 0–100, rounded. */
  readonly percentComplete: number;
}
