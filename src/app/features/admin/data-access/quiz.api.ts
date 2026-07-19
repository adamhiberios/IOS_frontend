import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { toHttpParams } from '@core/http';
import { environment } from '@env/environment';

import {
  type CreateQuestionBody,
  type CreateQuizBody,
  type QuizDetailResponseDto,
  type QuizListResponseDto,
  type QuizQuestionResponseDto,
  type UpdateQuestionBody,
  type UpdateQuizBody,
} from './quiz.dto';
import { toQuiz, toQuizQuestion } from './quiz.mappers';
import { type Quiz, type QuizQuestion } from './quiz.model';

/**
 * Lesson-quiz authoring transport (BE-I-06 / B5). Authoring views include
 * `correctAnswer`. Create/edit = content_creator / learning_admin; delete =
 * learning_admin only (backend-enforced). All responses are `{ data }`.
 */
@Injectable({ providedIn: 'root' })
export class AdminQuizApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin`;

  /** `GET /admin/lessons/:lessonId/quizzes` — a lesson's quizzes (authoring). */
  listByLesson(lessonId: string, active?: boolean): Observable<readonly Quiz[]> {
    const params = toHttpParams({ active });
    return this.http
      .get<QuizListResponseDto>(`${this.base}/lessons/${lessonId}/quizzes`, { params })
      .pipe(map((res) => res.data.map(toQuiz)));
  }

  /** `POST /admin/lessons/:lessonId/quizzes` — create a quiz. */
  createQuiz(lessonId: string, body: CreateQuizBody): Observable<Quiz> {
    return this.http
      .post<QuizDetailResponseDto>(`${this.base}/lessons/${lessonId}/quizzes`, body)
      .pipe(map((res) => toQuiz(res.data)));
  }

  /** `PATCH /admin/quizzes/:quizId` — update title and/or active. */
  updateQuiz(quizId: string, body: UpdateQuizBody): Observable<Quiz> {
    return this.http
      .patch<QuizDetailResponseDto>(`${this.base}/quizzes/${quizId}`, body)
      .pipe(map((res) => toQuiz(res.data)));
  }

  /** `DELETE /admin/quizzes/:quizId` — soft-delete (deactivate). */
  deleteQuiz(quizId: string): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/quizzes/${quizId}`).pipe(map(() => undefined));
  }

  /** `POST /admin/quizzes/:quizId/questions` — add a question. */
  addQuestion(quizId: string, body: CreateQuestionBody): Observable<QuizQuestion> {
    return this.http
      .post<QuizQuestionResponseDto>(`${this.base}/quizzes/${quizId}/questions`, body)
      .pipe(map((res) => toQuizQuestion(res.data)));
  }

  /** `PATCH /admin/quizzes/:quizId/questions/:questionId` — update a question. */
  updateQuestion(
    quizId: string,
    questionId: string,
    body: UpdateQuestionBody,
  ): Observable<QuizQuestion> {
    return this.http
      .patch<QuizQuestionResponseDto>(
        `${this.base}/quizzes/${quizId}/questions/${questionId}`,
        body,
      )
      .pipe(map((res) => toQuizQuestion(res.data)));
  }

  /** `DELETE /admin/quizzes/:quizId/questions/:questionId` — hard-delete. */
  deleteQuestion(quizId: string, questionId: string): Observable<void> {
    return this.http
      .delete<unknown>(`${this.base}/quizzes/${quizId}/questions/${questionId}`)
      .pipe(map(() => undefined));
  }
}
