import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type AnswersRequestDto,
  type AutosaveResponseDto,
  type PreExamConfirmationRequestDto,
  type PreExamConfirmationResponseDto,
  type ScoreResultDto,
  type SessionStatusResponseDto,
  type StartExamRequestDto,
  type StartExamResponseDto,
  type ValidateAccessRequestDto,
  type ValidateAccessResponseDto,
} from './exam.dto';
import {
  toAnswersDto,
  toExamAccessPreview,
  toExamScoreResult,
  toExamSessionSnapshot,
  toExamSessionStart,
} from './exam.mappers';
import {
  type AnswerMap,
  type ExamAccessPreview,
  type ExamScoreResult,
  type ExamSessionSnapshot,
  type ExamSessionStart,
  type PreExamConfirmation,
} from './exam.model';

/**
 * Real-exam transport — `@Controller('exam')` (student token only; admins get
 * 403). All endpoints return bare DTOs (BE-I-01). The bearer token is attached
 * by `authInterceptor`; `X-Lang` by `localeInterceptor`.
 *
 * Lifecycle (see `/docs/08-exam-engine.md` + the reconciliation note in
 * `exam.model.ts`):
 *   pre-exam-confirmation → validate-access → start → getSession (resume)
 *   → autosave* → submit | late-submit
 *
 * Error contract (RFC-7807; branch on `code` via `problemDetailCode`):
 *   • start        — 409 when an active session exists, the code is spent, or
 *                    pre-exam confirmation is still required.
 *   • validate     — 403 invalid/expired code.
 *   • autosave     — 409 when the session has expired.
 *   • submit       — 409 when the session is already submitted (terminal).
 *   • late-submit  — 403 when the 2-minute grace window has closed.
 *   • pre-exam     — 404 when no purchase exists for the certificate.
 */
@Injectable({ providedIn: 'root' })
export class ExamApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/exam`;

  /**
   * `POST /exam/pre-exam-confirmation` — flip the purchase's identity-confirmed
   * flag before starting. The name/ID are attestation only and are not persisted.
   */
  confirmPreExam(payload: PreExamConfirmation): Observable<string> {
    const body: PreExamConfirmationRequestDto = {
      certId: payload.certId,
      fullName: payload.fullName,
      ...(payload.idNumber ? { idNumber: payload.idNumber } : {}),
    };
    return this.http
      .post<PreExamConfirmationResponseDto>(`${this.base}/pre-exam-confirmation`, body)
      .pipe(map((dto) => dto.message));
  }

  /**
   * `POST /exam/validate-access` — validate the one-time code WITHOUT consuming
   * it; returns exam metadata + the code expiry. `examId` is optional (the
   * backend resolves it from the code when omitted).
   */
  validateAccess(code: string, examId?: string): Observable<ExamAccessPreview> {
    const body: ValidateAccessRequestDto = { code, ...(examId ? { examId } : {}) };
    return this.http
      .post<ValidateAccessResponseDto>(`${this.base}/validate-access`, body)
      .pipe(map(toExamAccessPreview));
  }

  /**
   * `POST /exam/start` — consume the code and open a session. Returns the
   * sessionId, duration, expiry, and the questions (options stripped of the
   * correct-answer flag).
   */
  start(code: string, examId?: string): Observable<ExamSessionStart> {
    const body: StartExamRequestDto = { code, ...(examId ? { examId } : {}) };
    return this.http
      .post<StartExamResponseDto>(`${this.base}/start`, body)
      .pipe(map(toExamSessionStart));
  }

  /**
   * `GET /exam/sessions/:sessionId` — the authoritative session baseline used to
   * resume a reloaded tab (server answers + remaining time + status).
   */
  getSession(sessionId: string): Observable<ExamSessionSnapshot> {
    return this.http
      .get<SessionStatusResponseDto>(`${this.base}/sessions/${sessionId}`)
      .pipe(map(toExamSessionSnapshot));
  }

  /**
   * `POST /exam/sessions/:sessionId/autosave` — persist the whole current
   * answers map (no TTL reset). 409 when the session has already expired.
   */
  autosave(sessionId: string, answers: AnswerMap): Observable<boolean> {
    const body: AnswersRequestDto = { answers: toAnswersDto(answers) };
    return this.http
      .post<AutosaveResponseDto>(`${this.base}/sessions/${sessionId}/autosave`, body)
      .pipe(map((dto) => dto.saved));
  }

  /**
   * `POST /exam/sessions/:sessionId/submit` — score the final answers and persist
   * the attempt. 409 when the session is already submitted.
   */
  submit(sessionId: string, answers: AnswerMap): Observable<ExamScoreResult> {
    const body: AnswersRequestDto = { answers: toAnswersDto(answers) };
    return this.http
      .post<ScoreResultDto>(`${this.base}/sessions/${sessionId}/submit`, body)
      .pipe(map(toExamScoreResult));
  }

  /**
   * `POST /exam/sessions/:sessionId/late-submit` — submit within the 2-minute
   * grace window after expiry (sets `lateFlag`). 403 once the grace has closed
   * (the backend has by then auto-submitted from its own snapshot).
   */
  lateSubmit(sessionId: string, answers: AnswerMap): Observable<ExamScoreResult> {
    const body: AnswersRequestDto = { answers: toAnswersDto(answers) };
    return this.http
      .post<ScoreResultDto>(`${this.base}/sessions/${sessionId}/late-submit`, body)
      .pipe(map(toExamScoreResult));
  }
}
