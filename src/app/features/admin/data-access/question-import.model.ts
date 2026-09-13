/**
 * Domain models for bulk question import (backend `docs/question-import.md`).
 *
 * One spreadsheet loads many questions into one of three banks. The flow is
 * two-phase — `preview` validates and stages, `commit` applies — so nothing
 * reaches the database until the admin has seen the report.
 */

/** The three question banks an import can target. */
export type ImportTarget = 'exam' | 'mock' | 'quiz';

export const IMPORT_TARGETS: readonly ImportTarget[] = ['exam', 'mock', 'quiz'] as const;

export function isImportTarget(value: string): value is ImportTarget {
  return (IMPORT_TARGETS as readonly string[]).includes(value);
}

/** Accepted upload types — mirrors the backend's magic-byte sniffing. */
export const IMPORT_FILE_ACCEPT = '.xlsx,.csv';

/** Backend rejects anything larger; checked client-side to save a round trip. */
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Backend row cap per file. Shown in the picker hint. */
export const IMPORT_MAX_ROWS = 500;

/**
 * One problem with one cell, or with the row/file when `column`/`row` is null.
 *
 * `row` is the row number **as Excel displays it** — the header is row 1, so
 * the first question is row 2. Surfaced verbatim so an admin can navigate
 * straight to the offending cell.
 */
export interface ImportIssue {
  readonly row: number | null;
  readonly column: string | null;
  /** Stable machine code (e.g. `CORRECT_NOT_IN_OPTIONS`) — safe to switch on. */
  readonly code: string;
  readonly message: string;
}

/** What the preview endpoint found. Errors block the import; warnings don't. */
export interface ImportReport {
  readonly target: ImportTarget;
  readonly targetId: string;
  readonly schemaVersion: number;
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorCount: number;
  readonly warningCount: number;
  /** Capped by the backend; `truncated` says whether more exist. */
  readonly errors: readonly ImportIssue[];
  readonly warnings: readonly ImportIssue[];
  readonly truncated: boolean;
}

/**
 * Result of a preview. `importId` is `null` when the file has errors — nothing
 * was staged, so there is nothing to commit.
 */
export interface ImportPreview {
  readonly importId: string | null;
  readonly report: ImportReport;
  readonly fileHash: string;
  readonly expiresInSeconds: number;
  /** First few normalized questions, for eyeballing the answer key. */
  readonly preview: readonly ImportPreviewQuestion[];
}

/**
 * A staged question as it would be stored. The shape differs per target: exam
 * and mock carry `options[{optionText,isCorrect}]`, quizzes carry a literal
 * `correctAnswer` plus a plain string option list.
 */
export interface ImportPreviewQuestion {
  readonly position: number | null;
  readonly questionText: string;
  readonly sourceRow: number;
  readonly questionType?: string;
  readonly marks?: number;
  readonly options?: readonly ImportPreviewOption[] | readonly string[] | null;
  readonly correctAnswer?: string;
}

export interface ImportPreviewOption {
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** Result of applying a staged import. */
export interface ImportCommitResult {
  readonly importId: string;
  readonly target: ImportTarget;
  readonly targetId: string;
  readonly created: number;
  readonly createdIds: readonly string[];
  /** Seconds the undo window stays open. */
  readonly undoExpiresInSeconds: number;
}

/** Result of undoing a committed import. */
export interface ImportUndoResult {
  readonly importId: string;
  readonly deleted: number;
}

/**
 * Discriminates the two preview-question shapes without a cast at the call
 * site — exam/mock options are objects, quiz options are plain strings.
 */
export function isOptionObject(
  option: ImportPreviewOption | string,
): option is ImportPreviewOption {
  return typeof option === 'object' && option !== null && 'optionText' in option;
}
