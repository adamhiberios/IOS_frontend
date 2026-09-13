import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type ImportCommitResponseDto,
  type ImportPreviewResponseDto,
  type ImportUndoResponseDto,
} from './question-import.dto';
import {
  toImportCommitResult,
  toImportPreview,
  toImportUndoResult,
} from './question-import.mappers';
import {
  type ImportCommitResult,
  type ImportPreview,
  type ImportTarget,
  type ImportUndoResult,
} from './question-import.model';

/**
 * Bulk question-import transport (backend `docs/question-import.md`).
 *
 *   GET  /admin/imports/questions/template?target=…                  — .xlsx blob
 *   POST /admin/imports/questions/:target/:targetId/preview          — validate + stage
 *   POST /admin/imports/questions/:target/:targetId/:importId/commit — apply
 *   POST /admin/imports/questions/:target/:targetId/:importId/undo   — roll back
 *
 * `targetId` means a different thing per target: an exam id for `exam`, a
 * **certificate** id for `mock`, a quiz id for `quiz`.
 */
@Injectable({ providedIn: 'root' })
export class AdminQuestionImportApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/imports/questions`;

  /**
   * `GET …/template?target=…` — the .xlsx template for a target.
   *
   * Returned as a Blob so the caller can hand it to a download. The template is
   * generated server-side from the same column definitions the parser reads, so
   * it can never drift from what the import will accept — which is why we don't
   * build one client-side.
   */
  downloadTemplate(target: ImportTarget): Observable<Blob> {
    return this.http.get(`${this.base}/template`, {
      params: { target },
      responseType: 'blob',
    });
  }

  /**
   * `POST …/:target/:targetId/preview` — validate a file and stage it.
   *
   * Sends `multipart/form-data` under the field name `file`. The Content-Type
   * header is deliberately NOT set: the browser must add it itself so the
   * multipart boundary is included.
   *
   * Resolves with **200 even for an invalid file** — per-row problems live in
   * `report.errors`, and `importId` is then `null`. Only an unreadable file
   * (wrong type, corrupt, oversized) or an unwritable destination rejects.
   */
  preview(target: ImportTarget, targetId: string, file: File): Observable<ImportPreview> {
    const body = new FormData();
    body.append('file', file, file.name);

    return this.http
      .post<ImportPreviewResponseDto>(`${this.base}/${target}/${targetId}/preview`, body)
      .pipe(map((res) => toImportPreview(res.data)));
  }

  /**
   * `POST …/:target/:targetId/:importId/commit` — apply a staged import.
   *
   * All-or-nothing, and append-only: existing questions are never modified or
   * reordered. A second commit of the same `importId` is a 409.
   */
  commit(target: ImportTarget, targetId: string, importId: string): Observable<ImportCommitResult> {
    return this.http
      .post<ImportCommitResponseDto>(`${this.base}/${target}/${targetId}/${importId}/commit`, {})
      .pipe(map((res) => toImportCommitResult(res.data)));
  }

  /**
   * `POST …/:target/:targetId/:importId/undo` — remove exactly the questions
   * that commit created. Open for a short window afterwards; `learning_admin`
   * only, since it is a delete.
   */
  undo(target: ImportTarget, targetId: string, importId: string): Observable<ImportUndoResult> {
    return this.http
      .post<ImportUndoResponseDto>(`${this.base}/${target}/${targetId}/${importId}/undo`, {})
      .pipe(map((res) => toImportUndoResult(res.data)));
  }
}
