import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type CheckQuizRequestDto,
  type CheckQuizResponseDto,
  type CurriculumResponseDto,
  type LessonQuizResponseDto,
  type LessonResponseDto,
  type MarkCompleteResponseDto,
  type ProgressResponseDto,
} from './courses.dto';
import {
  toCourseProgressList,
  toCurriculum,
  toLesson,
  toLessonCompletion,
  toLessonQuiz,
  toQuizCheckResult,
} from './courses.mappers';
import {
  type CourseProgress,
  type Curriculum,
  type Lesson,
  type LessonCompletion,
  type LessonQuiz,
  type QuizCheckResult,
} from './courses.model';

/**
 * Learning transport — `@Controller('learning')` (student token only; admin
 * tokens 403). Every response is a `{ data, meta }` envelope (BE-I-01). All
 * reads are purchase-gated server-side (403 when not enrolled). The bearer token
 * is attached by `authInterceptor`; `X-Lang` by `localeInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class CoursesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/learning`;

  /** `GET /learning/certs/:certId/curriculum` — module/lesson tree + completion. */
  getCurriculum(certId: string): Observable<Curriculum> {
    return this.http
      .get<CurriculumResponseDto>(`${this.base}/certs/${certId}/curriculum`)
      .pipe(map(toCurriculum));
  }

  /** `GET /learning/lessons/:id` — full lesson content + short-lived signed video URL. */
  getLesson(lessonId: string): Observable<Lesson> {
    return this.http.get<LessonResponseDto>(`${this.base}/lessons/${lessonId}`).pipe(map(toLesson));
  }

  /** `GET /learning/lessons/:id/quiz` — the lesson's self-check quiz (answers stripped). */
  getLessonQuiz(lessonId: string): Observable<LessonQuiz> {
    return this.http
      .get<LessonQuizResponseDto>(`${this.base}/lessons/${lessonId}/quiz`)
      .pipe(map(toLessonQuiz));
  }

  /**
   * `POST /learning/lessons/:id/quiz/check` — instant per-question feedback.
   * Nothing is persisted (unlimited attempts).
   */
  checkQuiz(lessonId: string, answers: Record<string, string>): Observable<QuizCheckResult> {
    const body: CheckQuizRequestDto = { answers };
    return this.http
      .post<CheckQuizResponseDto>(`${this.base}/lessons/${lessonId}/quiz/check`, body)
      .pipe(map(toQuizCheckResult));
  }

  /** `POST /learning/lessons/:id/complete` — idempotent mark-complete. */
  markComplete(lessonId: string): Observable<LessonCompletion> {
    return this.http
      .post<MarkCompleteResponseDto>(`${this.base}/lessons/${lessonId}/complete`, {})
      .pipe(map(toLessonCompletion));
  }

  /** `GET /learning/progress` — per-certificate progress for the enrolled student. */
  getProgress(): Observable<CourseProgress[]> {
    return this.http
      .get<ProgressResponseDto>(`${this.base}/progress`)
      .pipe(map(toCourseProgressList));
  }
}
