import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type CreateLessonBody,
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
 * to `void`.
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

  createLesson(body: CreateLessonBody): Observable<void> {
    return this.http.post<void>(`${this.base}/lessons`, body).pipe(map(() => undefined));
  }

  updateLesson(id: string, body: UpdateLessonBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/lessons/${id}`, body).pipe(map(() => undefined));
  }

  /** `DELETE /admin/lessons/:id` — soft-delete (sets active=false). learning_admin. */
  deactivateLesson(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lessons/${id}`).pipe(map(() => undefined));
  }
}
