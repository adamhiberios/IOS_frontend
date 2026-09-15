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
  /** `true` when an outstanding code was replaced by a fresh one. */
  readonly reissued: boolean;
}

/**
 * Final-exam entry transport — the "Start final exam" CTA. Lives in the
 * certificates feature (where every CTA is) rather than `assessments`, which
 * owns the code-entry and runner flow that follows.
 *
 * Error contract (RFC-7807; the `detail` is user-facing):
 *   • 403 — not enrolled, lessons incomplete ("… (3/4 completed)"), or the
 *           first sitting is already used (retakes are purchased).
 *   • 404 — the certificate has no published exam yet.
 *   • 429 — re-send limit reached (3 requests per 10 minutes).
 */
@Injectable({ providedIn: 'root' })
export class FinalExamApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/exam`;

  /** Issue (or re-send) the student's one-time access code by email. */
  requestAccess(certId: string): Observable<RequestExamAccessResponseDto> {
    const body: RequestExamAccessRequestDto = { certId };
    return this.http.post<RequestExamAccessResponseDto>(`${this.base}/request-access`, body);
  }
}
