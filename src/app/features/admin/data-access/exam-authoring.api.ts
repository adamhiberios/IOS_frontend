import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type CreateExamBody,
  type ExamListResponseDto,
  type UpdateExamBody,
} from './exam-authoring.dto';
import { toAdminExam } from './exam-authoring.mappers';
import { type AdminExam } from './exam-authoring.model';

/**
 * Admin exam-authoring transport (`docs/backend-analysis.md` §6.5).
 *
 *   GET    /admin/certs/:certId/exams  — a cert's exams (all statuses + count)
 *   POST   /admin/certs/:certId/exams  — create a DRAFT exam (content_creator+)
 *   PATCH  /admin/exams/:examId        — update meta (409 EXAM_LOCKED if published)
 *   POST   /admin/exams/:examId/publish   — publish gate (learning_admin)
 *   POST   /admin/exams/:examId/unpublish — revert to draft (learning_admin)
 *   DELETE /admin/exams/:examId        — hard-delete an unused draft (learning_admin)
 *
 * This service covers the exam list + lifecycle. Question authoring
 * (`/admin/exams/:examId/questions*`) is added in a follow-up.
 */
@Injectable({ providedIn: 'root' })
export class AdminExamAuthoringApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin`;

  /** `GET /admin/certs/:certId/exams` — the cert's exams (ordered by examOrder). */
  listExams(certId: string): Observable<readonly AdminExam[]> {
    return this.http
      .get<ExamListResponseDto>(`${this.base}/certs/${certId}/exams`)
      .pipe(map((res) => res.data.map(toAdminExam)));
  }

  /** `POST /admin/certs/:certId/exams` — create a draft exam. */
  create(certId: string, body: CreateExamBody): Observable<void> {
    return this.http
      .post<void>(`${this.base}/certs/${certId}/exams`, body)
      .pipe(map(() => undefined));
  }

  /** `PATCH /admin/exams/:examId` — update exam metadata (draft only for examOrder). */
  update(examId: string, body: UpdateExamBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/exams/${examId}`, body).pipe(map(() => undefined));
  }

  /** `POST /admin/exams/:examId/publish` — run the publish gate. */
  publish(examId: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/exams/${examId}/publish`, {})
      .pipe(map(() => undefined));
  }

  /** `POST /admin/exams/:examId/unpublish` — revert to draft. */
  unpublish(examId: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/exams/${examId}/unpublish`, {})
      .pipe(map(() => undefined));
  }

  /** `DELETE /admin/exams/:examId` — hard-delete an unused draft. */
  remove(examId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/exams/${examId}`).pipe(map(() => undefined));
  }
}
