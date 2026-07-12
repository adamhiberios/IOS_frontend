import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { toHttpParams } from '@core/http';
import { environment } from '@env/environment';

import {
  type AssignExamBody,
  type AssignExamResponseDto,
  type PublishedExamsResponseDto,
} from './exam-assign.dto';
import { toIssuedAccessCode, toPublishedExam } from './exam-assign.mappers';
import { type IssuedAccessCode, type PublishedExam } from './exam-assign.model';

/**
 * Admin exam-assignment transport (`learning_admin`, super_admin bypass).
 *
 *   GET  /admin/exam?certId=  — a cert's PUBLISHED exams (ordered by examOrder)
 *   POST /admin/exam/assign   — issue a one-time access code for a student
 *
 * Assignment omits `examId` to auto-assign the next unattempted exam. The plain
 * code in the response is shown once and never retrievable again.
 */
@Injectable({ providedIn: 'root' })
export class AdminExamAssignApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/exam`;

  /** `GET /admin/exam?certId=` — the cert's published exams. */
  listPublishedExams(certId: string): Observable<readonly PublishedExam[]> {
    const params = toHttpParams({ certId });
    return this.http
      .get<PublishedExamsResponseDto>(this.base, { params })
      .pipe(map((res) => res.data.map(toPublishedExam)));
  }

  /** `POST /admin/exam/assign` — assign an exam (or auto-assign) and issue a code. */
  assign(body: AssignExamBody): Observable<IssuedAccessCode> {
    // Omit examId entirely when auto-assigning — the backend whitelists body keys.
    const payload: AssignExamBody = body.examId
      ? { userId: body.userId, certId: body.certId, examId: body.examId }
      : { userId: body.userId, certId: body.certId };
    return this.http
      .post<AssignExamResponseDto>(`${this.base}/assign`, payload)
      .pipe(map(toIssuedAccessCode));
  }
}
