/**
 * Wire shapes for lesson-quiz authoring (BE-I-06 / B5). Every endpoint wraps its
 * payload in `{ data }` (no cursor pagination — a lesson has few quizzes).
 *
 *   POST   /admin/lessons/:lessonId/quizzes            → { data: Quiz }
 *   GET    /admin/lessons/:lessonId/quizzes?active     → { data: Quiz[] }
 *   PATCH  /admin/quizzes/:quizId                       → { data: Quiz }
 *   DELETE /admin/quizzes/:quizId                       → { data } (soft-delete)
 *   POST   /admin/quizzes/:quizId/questions            → { data: Question }
 *   PATCH  /admin/quizzes/:quizId/questions/:questionId → { data: Question }
 *   DELETE /admin/quizzes/:quizId/questions/:questionId → { data }
 */

export interface QuizQuestionDto {
  readonly id: string;
  readonly quizId: string;
  readonly questionText: string;
  readonly correctAnswer: string;
  readonly options: string[] | null;
  readonly position: number;
}

export interface QuizDto {
  readonly id: string;
  readonly lessonId: string;
  readonly title: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly questions: QuizQuestionDto[];
}

export interface QuizListResponseDto {
  readonly data: QuizDto[];
}

export interface QuizDetailResponseDto {
  readonly data: QuizDto;
}

export interface QuizQuestionResponseDto {
  readonly data: QuizQuestionDto;
}

/** `POST /admin/lessons/:lessonId/quizzes` body (inline questions optional). */
export interface CreateQuizBody {
  readonly title: string;
  readonly questions?: CreateQuestionBody[];
}

/** `PATCH /admin/quizzes/:quizId` body. */
export interface UpdateQuizBody {
  readonly title?: string;
  readonly active?: boolean;
}

/** `POST /admin/quizzes/:quizId/questions` body. Omit `options` for free-text. */
export interface CreateQuestionBody {
  readonly questionText: string;
  readonly correctAnswer: string;
  readonly options?: string[];
  readonly position?: number;
}

/**
 * `PATCH …/questions/:questionId` body. Supplying `options` replaces the whole
 * set; an empty array converts the question to free-text.
 */
export interface UpdateQuestionBody {
  readonly questionText?: string;
  readonly correctAnswer?: string;
  readonly options?: string[];
  readonly position?: number;
}
