import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';
import { type CursorQuery, type Page, type PagedResponse, toHttpParams, toPage } from '@core/http';

import {
  type MockAnswersRequestDto,
  type MockAutosaveResponseDto,
  type MockExtendResponseDto,
  type MockHistoryItemDto,
  type MockResultResponseDto,
  type MockReviewResponseDto,
  type MockRevealResponseDto,
  type MockSessionResponseDto,
  type StartMockRequestDto,
  type StartMockResponseDto,
} from './mock.dto';
import {
  toMockExtension,
  toMockHistoryItem,
  toMockResult,
  toMockReveal,
  toMockReview,
  toMockSession,
  toMockStart,
} from './mock.mappers';
import {
  type MockExtension,
  type MockHistoryItem,
  type MockResult,
  type MockReveal,
  type MockReview,
  type MockSession,
  type MockStart,
} from './mock.model';

/**
 * Mock-exam transport — `@Controller('mock')` (student token only; admins get
 * 403). Practice attempts are purchase-gated (403 when not enrolled). History is
 * cursor-paginated (`{ data, meta.pagination }`); the rest are bare DTOs, except
 * the review, which wraps its payload in `{ data }`. The bearer token is attached
 * by `authInterceptor`; `X-Lang` by `localeInterceptor`.
 *
 * Error contract (branch on status/`code`):
 *   • start        — 403 not enrolled, 409 an attempt is already active.
 *   • extend       — 422 once the extension cap is exhausted.
 *   • submit       — 409 already submitted.
 *   • review       — 422 when the attempt is not yet submitted.
 *   • reveal       — 404 when the question is not part of the attempt.
 */
@Injectable({ providedIn: 'root' })
export class MockApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/mock`;

  /** `POST /mock/start` — sample questions and open a soft, extendable attempt. */
  start(certId: string): Observable<MockStart> {
    const body: StartMockRequestDto = { certId };
    return this.http.post<StartMockResponseDto>(`${this.base}/start`, body).pipe(map(toMockStart));
  }

  /** `GET /mock/:id` — live attempt status (resume / Back-Next render). */
  getSession(attemptId: string): Observable<MockSession> {
    return this.http
      .get<MockSessionResponseDto>(`${this.base}/${attemptId}`)
      .pipe(map(toMockSession));
  }

  /** `POST /mock/:id/autosave` — merge answers (no TTL reset; never rejects). */
  autosave(attemptId: string, answers: Record<string, string>): Observable<boolean> {
    const body: MockAnswersRequestDto = { answers };
    return this.http
      .post<MockAutosaveResponseDto>(`${this.base}/${attemptId}/autosave`, body)
      .pipe(map((dto) => dto.saved));
  }

  /** `POST /mock/:id/extend` — add time to the soft timer (422 when capped). */
  extend(attemptId: string): Observable<MockExtension> {
    return this.http
      .post<MockExtendResponseDto>(`${this.base}/${attemptId}/extend`, {})
      .pipe(map(toMockExtension));
  }

  /** `POST /mock/:id/submit` — grade the answers so far (409 already submitted). */
  submit(attemptId: string, answers: Record<string, string>): Observable<MockResult> {
    const body: MockAnswersRequestDto = { answers };
    return this.http
      .post<MockResultResponseDto>(`${this.base}/${attemptId}/submit`, body)
      .pipe(map(toMockResult));
  }

  /** `POST /mock/:id/questions/:qid/reveal` — mock-only correctness hint. */
  reveal(attemptId: string, questionId: string): Observable<MockReveal> {
    return this.http
      .post<MockRevealResponseDto>(`${this.base}/${attemptId}/questions/${questionId}/reveal`, {})
      .pipe(map(toMockReveal));
  }

  /** `GET /mock/history` — cursor-paginated attempt history (newest first). */
  getHistory(query: CursorQuery = {}): Observable<Page<MockHistoryItem>> {
    const params = toHttpParams({ cursor: query.cursor, limit: query.limit });
    return this.http
      .get<PagedResponse<MockHistoryItemDto>>(`${this.base}/history`, { params })
      .pipe(map((res) => toPage(res, toMockHistoryItem)));
  }

  /** `GET /mock/attempts/:id` — full review with the answer key (422 if not submitted). */
  getReview(attemptId: string): Observable<MockReview> {
    return this.http
      .get<MockReviewResponseDto>(`${this.base}/attempts/${attemptId}`)
      .pipe(map(toMockReview));
  }
}
