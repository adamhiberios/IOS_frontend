import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '@core/http';
import { environment } from '@env/environment';

import { type BlogImportPreviewResponseDto } from './lesson-import.dto';
import { toLessonImportResult } from './lesson-import.mappers';
import { type LessonImportResult } from './lesson-import.model';

/**
 * Word → blog article HTML conversion (backend `docs/content-import.md`).
 *
 *   POST /admin/blog/:id/content/import?locale=xx — convert only
 *
 * Same converter and report as the lesson import. The backend writes nothing:
 * the blog store saves `html` with the ordinary `PATCH /admin/blog/:id`
 * (`contentHtml`, English) or `PATCH /admin/blog/:id/translations` (other
 * locales), so validation, reading time and search re-indexing stay on one path.
 */
@Injectable({ providedIn: 'root' })
export class AdminBlogImportApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/blog`;

  /**
   * Upload one article's .docx for `locale` and get its HTML back.
   *
   * Sends `multipart/form-data` under `file`; the Content-Type header is left
   * to the browser so the multipart boundary is included. A readable .docx is
   * always a 200 — blocking problems are in `errors`. An unreadable file is a
   * 400 whose `errors[0].code` says why; the dialog shows it inline, so the
   * global error toast is suppressed.
   */
  convert(articleId: string, file: File, locale = 'en'): Observable<LessonImportResult> {
    const body = new FormData();
    body.append('file', file, file.name);

    return this.http
      .post<BlogImportPreviewResponseDto>(`${this.base}/${articleId}/content/import`, body, {
        params: { locale },
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map((res) => toLessonImportResult(res.data)));
  }
}
