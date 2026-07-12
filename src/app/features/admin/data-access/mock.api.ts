import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type CreateMockQuestionBody,
  type MockQuestionsListResponseDto,
  type UpdateMockQuestionBody,
} from './mock.dto';
import { toMockQuestion } from './mock.mappers';
import { type MockQuestion } from './mock.model';

/**
 * Admin mock-question authoring transport.
 *
 *   GET    /admin/mock/certs/:certId/questions  — the cert's bank (all statuses)
 *   POST   /admin/mock/questions                — create (content_creator+)
 *   PATCH  /admin/mock/questions/:id            — update / reactivate
 *   DELETE /admin/mock/questions/:id            — soft-delete (learning_admin)
 *
 * The list is **not** paginated — it returns the whole bank for a certificate,
 * ordered by position. The backend enforces roles and the "≥2 options, exactly
 * one correct" rule (see backend-analysis §6.6).
 */
@Injectable({ providedIn: 'root' })
export class AdminMockQuestionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/mock`;

  /** `GET /admin/mock/certs/:certId/questions` — the full question bank. */
  list(certId: string): Observable<readonly MockQuestion[]> {
    return this.http
      .get<MockQuestionsListResponseDto>(`${this.base}/certs/${certId}/questions`)
      .pipe(map((res) => res.data.map(toMockQuestion)));
  }

  /** `POST /admin/mock/questions` — create a mock question. */
  create(body: CreateMockQuestionBody): Observable<void> {
    return this.http.post<void>(`${this.base}/questions`, body);
  }

  /** `PATCH /admin/mock/questions/:id` — partial update (options replace whole set). */
  update(id: string, body: UpdateMockQuestionBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/questions/${id}`, body);
  }

  /** `DELETE /admin/mock/questions/:id` — soft-delete / deactivate (learning_admin). */
  softDelete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/questions/${id}`).pipe(map(() => undefined));
  }
}
