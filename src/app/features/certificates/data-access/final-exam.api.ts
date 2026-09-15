import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '@env/environment';

/** `POST /exam/request-access` body. */
export interface RequestExamAccessRequestDto {
  readonly certId: string;
}

/**
 * `POST /exam/request-access` response. The access code itself is never in the
 * payload — the backend only ever delivers it by email.
 */
export interface RequestExamAccessResponseDto {
  readonly examId: string;
  readonly examTitle: string;
  /** ISO-8601. */
  readonly expiresAt: string;
  /**
   * `true` when the code had already been emailed and is still valid — nothing
   * new was issued or sent. Absent on API builds before this field existed.
   */
  readonly alreadySent?: boolean;
}

/**
 * Final-exam entry transport — the "Start final exam" CTA. Lives in the
 * certificates feature (where every CTA is) rather than `assessments`, which
 * owns the code-entry and runner flow that follows.
 *
 * A student gets exactly one code per sitting: the first call issues and emails
 * it; repeat calls while it is valid only report `alreadySent`. Re-issuing is
 * admin-only.
 *
 * Error contract (RFC-7807; the `detail` is user-facing):
 *   • 403 — not enrolled, lessons incomplete ("… (3/4 completed)"), or the
 *           code was already issued and has been used or expired.
 *   • 404 — the certificate has no published exam yet.
 *   • 429 — request limit reached (10 per 10 minutes).
 */
@Injectable({ providedIn: 'root' })
export class FinalExamApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/exam`;

  /** Issue the student's one-time access code by email (once per sitting). */
  requestAccess(certId: string): Observable<RequestExamAccessResponseDto> {
    const body: RequestExamAccessRequestDto = { certId };
    return this.http.post<RequestExamAccessResponseDto>(`${this.base}/request-access`, body);
  }
}
