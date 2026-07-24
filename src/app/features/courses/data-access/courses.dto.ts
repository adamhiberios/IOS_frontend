/**
 * Wire DTOs for the student learning experience — verbatim shapes from the
 * backend `@Controller('learning')` (`IOS_Backend/src/modules/learning`). Field
 * names mirror the backend exactly; `courses.mappers.ts` translates to the
 * domain model.
 *
 * Every learning endpoint wraps its payload in a `{ data, meta }` envelope
 * (BE-I-01 — envelopes vary per endpoint; these are `{ data, meta }`, not the
 * cursor-paginated `{ data, meta: { pagination } }` used by list endpoints).
 * The bearer token is attached by `authInterceptor`; `X-Lang` by `localeInterceptor`
 * (the backend resolves lesson/module content into the requested locale).
 */

interface LocaleMetaDto {
  readonly locale: string;
  readonly direction: string;
}

// ── Curriculum (GET /learning/certs/:certId/curriculum) ──────────────────────

export interface LessonSummaryDto {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly durationSeconds: number | null;
  readonly hasVideo: boolean;
  readonly completed: boolean;
}

export interface CurriculumModuleDto {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly lessons: readonly LessonSummaryDto[];
}

export interface CurriculumResponseDto {
  readonly data: {
    readonly certificate: {
      readonly id: string;
      readonly programCode: string;
      readonly title: string;
    };
    readonly modules: readonly CurriculumModuleDto[];
  };
  readonly meta: LocaleMetaDto;
}

// ── Lesson (GET /learning/lessons/:id) ───────────────────────────────────────

export interface LessonResponseDto {
  readonly data: {
    readonly id: string;
    readonly moduleId: string;
    readonly title: string;
    readonly contentHtml: string | null;
    /** Short-lived signed URL, or null when the lesson has no video. */
    readonly videoUrl: string | null;
    readonly durationSeconds: number | null;
    readonly position: number;
    readonly completed: boolean;
    readonly completedAt: string | null;
  };
  readonly meta: LocaleMetaDto & {
    readonly fallbackUsed: boolean;
    readonly videoUrlExpiresInSeconds: number | null;
  };
}

// ── Lesson quiz (GET /learning/lessons/:id/quiz) ─────────────────────────────

export interface QuizQuestionDto {
  readonly id: string;
  readonly questionText: string;
  /** Non-empty ⇒ multiple-choice; null/empty ⇒ free-text. Correct answer stripped. */
  readonly options: readonly string[] | null;
  readonly position: number;
}

export interface LessonQuizResponseDto {
  readonly data: {
    readonly id: string;
    readonly lessonId: string;
    readonly title: string;
    readonly questions: readonly QuizQuestionDto[];
  };
  readonly meta: { readonly unlimitedAttempts: boolean; readonly stored: boolean };
}

// ── Quiz check (POST /learning/lessons/:id/quiz/check) ───────────────────────

export interface CheckQuizRequestDto {
  /** questionId → the student's answer (option text or free text). */
  readonly answers: Record<string, string>;
}

export interface QuizResultDto {
  readonly questionId: string;
  readonly yourAnswer: string | null;
  readonly correct: boolean;
  /** Revealed for the self-check aid — quizzes are not assessments. */
  readonly correctAnswer: string;
}

export interface CheckQuizResponseDto {
  readonly data: {
    readonly quizId: string;
    readonly lessonId: string;
    readonly correctCount: number;
    readonly totalCount: number;
    readonly score: number;
    readonly results: readonly QuizResultDto[];
  };
  readonly meta: { readonly unlimitedAttempts: boolean; readonly stored: boolean };
}

// ── Mark complete (POST /learning/lessons/:id/complete) ──────────────────────

export interface MarkCompleteResponseDto {
  readonly data: {
    readonly lessonId: string;
    readonly completedAt: string;
    readonly alreadyCompleted: boolean;
  };
}

// ── Progress (GET /learning/progress) ────────────────────────────────────────

export interface ProgressItemDto {
  readonly certId: string;
  readonly programCode: string;
  readonly title: string;
  readonly totalLessons: number;
  readonly completedLessons: number;
  readonly percentComplete: number;
}

export interface ProgressResponseDto {
  readonly data: readonly ProgressItemDto[];
  readonly meta: { readonly locale: string };
}
