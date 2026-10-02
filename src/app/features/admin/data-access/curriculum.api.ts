import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type CreateLessonBody,
  type CreateLessonResponseDto,
  type CreateModuleBody,
  type CurriculumResponseDto,
  type UpdateLessonBody,
  type UpdateModuleBody,
} from './curriculum.dto';
import { toAdminCurriculum } from './curriculum.mappers';
import { type AdminCurriculum } from './curriculum.model';

/**
 * Admin curriculum transport (BE-I-13 / B1).
 *
 *   GET    /admin/certs/:id/curriculum  — full tree, all statuses (content_creator+)
 *   POST   /admin/modules               — create a module (content_creator+)
 *   PATCH  /admin/modules/:id           — update / reactivate (content_creator+)
 *   DELETE /admin/modules/:id           — soft-delete (active=false, learning_admin)
 *   POST   /admin/lessons               — create a lesson (content_creator+)
 *   PATCH  /admin/lessons/:id           — update / reactivate (content_creator+)
 *   DELETE /admin/lessons/:id           — soft-delete (active=false, learning_admin)
 *
 * Every write is wrapped in a `{ data }` envelope by the backend; we don't need
 * the echoed row (the store refetches the whole curriculum), so writes resolve
 * to `void` — except lesson create, whose id the Word import needs.
 */
@Injectable({ providedIn: 'root' })
export class AdminCurriculumApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin`;

  /** `GET /admin/certs/:id/curriculum` — the cert's modules + lessons (all statuses). */
  getCurriculum(certId: string): Observable<AdminCurriculum> {
    return this.http
      .get<CurriculumResponseDto>(`${this.base}/certs/${certId}/curriculum`)
      .pipe(map((res) => toAdminCurriculum(res.data)));
  }

  createModule(body: CreateModuleBody): Observable<void> {
    return this.http.post<void>(`${this.base}/modules`, body).pipe(map(() => undefined));
  }

  updateModule(id: string, body: UpdateModuleBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/modules/${id}`, body).pipe(map(() => undefined));
  }

  /** `DELETE /admin/modules/:id` — soft-delete (sets active=false). learning_admin. */
  deactivateModule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/modules/${id}`).pipe(map(() => undefined));
  }

  /**
   * `DELETE /admin/modules/:id/permanent` — hard delete with its lessons
   * (learning_admin). 409 while active or once a student completed a lesson.
   */
  permanentDeleteModule(id: string): Observable<void> {
    return this.http.delete(`${this.base}/modules/${id}/permanent`).pipe(map(() => undefined));
  }

  /** Resolves with the new lesson's id — its content is imported into it next. */
  createLesson(body: CreateLessonBody): Observable<string> {
    return this.http
      .post<CreateLessonResponseDto>(`${this.base}/lessons`, body)
      .pipe(map((res) => res.data.id));
  }

  updateLesson(id: string, body: UpdateLessonBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/lessons/${id}`, body).pipe(map(() => undefined));
  }

  /** `DELETE /admin/lessons/:id` — soft-delete (sets active=false). learning_admin. */
  deactivateLesson(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lessons/${id}`).pipe(map(() => undefined));
  }

  /**
   * `DELETE /admin/lessons/:id/permanent` — hard delete (learning_admin). 409
   * while active or once a student completed it.
   */
  permanentDeleteLesson(id: string): Observable<void> {
    return this.http.delete(`${this.base}/lessons/${id}/permanent`).pipe(map(() => undefined));
  }
}
