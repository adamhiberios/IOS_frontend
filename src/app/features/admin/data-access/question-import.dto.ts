/**
 * Wire shapes for bulk question import (backend `docs/question-import.md`).
 * Every JSON endpoint wraps its payload in `{ data }`.
 *
 *   GET  /admin/imports/questions/template?target=…                  → .xlsx blob
 *   POST /admin/imports/questions/:target/:targetId/preview          → { data: PreviewDto }
 *   POST /admin/imports/questions/:target/:targetId/:importId/commit → { data: CommitDto }
 *   POST /admin/imports/questions/:target/:targetId/:importId/undo   → { data: UndoDto }
 *
 * `preview` takes `multipart/form-data` under the field name `file` and returns
 * **200 even for an invalid file** — problems live in `report`, not in the HTTP
 * status. Only an unreadable file (wrong type, corrupt, oversized) is a 4xx.
 */

export interface ImportIssueDto {
  readonly row: number | null;
  readonly column: string | null;
  readonly code: string;
  readonly message: string;
}

export interface ImportReportDto {
  readonly target: string;
  readonly targetId: string;
  readonly schemaVersion: number;
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly errors: ImportIssueDto[];
  readonly warnings: ImportIssueDto[];
  readonly truncated: boolean;
}

/**
 * A staged question. Loosely typed on purpose: the backend emits two different
 * shapes here (option-based for exam/mock, answer-text for quiz) and this is a
 * read-only display payload, so narrowing happens in the mapper.
 */
export interface ImportPreviewQuestionDto {
  readonly position: number | null;
  readonly questionText: string;
  readonly sourceRow: number;
  readonly questionType?: string;
  readonly marks?: number;
  readonly options?: unknown;
  readonly correctAnswer?: string;
}

export interface ImportPreviewDto {
  readonly importId: string | null;
  readonly report: ImportReportDto;
  readonly fileHash: string;
  readonly expiresInSeconds: number;
  readonly preview: ImportPreviewQuestionDto[];
}

export interface ImportCommitDto {
  readonly importId: string;
  readonly target: string;
  readonly targetId: string;
  readonly created: number;
  readonly createdIds: string[];
  readonly undoExpiresInSeconds: number;
}

export interface ImportUndoDto {
  readonly importId: string;
  readonly deleted: number;
}

export interface ImportPreviewResponseDto {
  readonly data: ImportPreviewDto;
}

export interface ImportCommitResponseDto {
  readonly data: ImportCommitDto;
}

export interface ImportUndoResponseDto {
  readonly data: ImportUndoDto;
}
