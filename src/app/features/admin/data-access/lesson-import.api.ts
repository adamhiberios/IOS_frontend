import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '@core/http';
import { environment } from '@env/environment';

import { type LessonImportPreviewResponseDto } from './lesson-import.dto';
import { toLessonImportResult } from './lesson-import.mappers';
import { type LessonImportResult } from './lesson-import.model';

/**
 * Word → lesson HTML conversion (backend `docs/lesson-content-import.md`).
 *
 *   POST /admin/lessons/:lessonId/content/import?locale=en — convert only
 *
 * The backend converts and returns the HTML without writing it; the curriculum
 * store saves it straight away with the ordinary `PATCH /admin/lessons/:id`,
 * so validation, translations and search re-indexing stay on one path.
 */
@Injectable({ providedIn: 'root' })
export class AdminLessonImportApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/lessons`;

  /**
   * Upload one lesson's .docx and get its HTML back.
   *
   * Sends `multipart/form-data` under `file`; the Content-Type header is left
   * to the browser so the multipart boundary is included. A readable .docx is
   * always a 200 — blocking problems are in `errors`. An unreadable file is a
   * 400 whose `errors[0].code` says why; the lesson dialog shows it inline, so
   * the global error toast is suppressed.
   *
   * English (canonical `contentText`) only for now; the per-locale translation
   * editor is a follow-up.
   */
  convert(lessonId: string, file: File): Observable<LessonImportResult> {
    const body = new FormData();
    body.append('file', file, file.name);

    return this.http
      .post<LessonImportPreviewResponseDto>(`${this.base}/${lessonId}/content/import`, body, {
        params: { locale: 'en' },
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map((res) => toLessonImportResult(res.data)));
  }
}
