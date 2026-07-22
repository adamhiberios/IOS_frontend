import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import { type ExamAttemptsResponseDto } from './exam-attempts.dto';
import { toExamAttempt } from './exam-attempts.mappers';
import { type ExamAttempt, type ExamAttemptsQuery } from './exam-attempts.model';

/**
 * Transport for the student's real-exam attempt history — `GET /exam/attempts`
 * (student token; RLS-scoped to the caller). Cursor-paginated, newest-first,
 * `{ data, meta.pagination }`. Bearer token via `authInterceptor`, `X-Locale`
 * via `localeInterceptor`. See `docs/backend-analysis.md` (BE-I-17).
 */
@Injectable({ providedIn: 'root' })
export class ExamAttemptsApi {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/exam/attempts`;

  /** `GET /exam/attempts` — the caller's own attempt history (cursor page). */
  list(query: ExamAttemptsQuery = {}): Observable<Page<ExamAttempt>> {
    const params = toHttpParams({ cursor: query.cursor, limit: query.limit });
    return this.http
      .get<ExamAttemptsResponseDto>(this.endpoint, { params })
      .pipe(map((res) => toPage(res, toExamAttempt)));
  }
}
