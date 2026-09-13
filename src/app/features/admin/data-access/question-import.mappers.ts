import {
  type ImportCommitDto,
  type ImportIssueDto,
  type ImportPreviewDto,
  type ImportPreviewQuestionDto,
  type ImportReportDto,
  type ImportUndoDto,
} from './question-import.dto';
import {
  type ImportCommitResult,
  type ImportIssue,
  type ImportPreview,
  type ImportPreviewOption,
  type ImportPreviewQuestion,
  type ImportReport,
  type ImportTarget,
  type ImportUndoResult,
  isImportTarget,
} from './question-import.model';

/**
 * Fall back to `exam` for an unrecognised target string. The value only ever
 * originates from a request this app made, so a mismatch means the backend
 * added a target this build doesn't know — echoing it back untyped would be
 * worse than defaulting.
 */
function toTarget(value: string): ImportTarget {
  return isImportTarget(value) ? value : 'exam';
}

export function toImportIssue(dto: ImportIssueDto): ImportIssue {
  return {
    row: dto.row,
    column: dto.column,
    code: dto.code,
    message: dto.message,
  };
}

export function toImportReport(dto: ImportReportDto): ImportReport {
  return {
    target: toTarget(dto.target),
    targetId: dto.targetId,
    schemaVersion: dto.schemaVersion,
    totalRows: dto.totalRows,
    validRows: dto.validRows,
    errorCount: dto.errorCount,
    warningCount: dto.warningCount,
    errors: dto.errors.map(toImportIssue),
    warnings: dto.warnings.map(toImportIssue),
    truncated: dto.truncated,
  };
}

/**
 * Normalize the `options` field, which arrives in one of three shapes:
 * `{optionText,isCorrect}[]` (exam/mock), `string[]` (quiz multiple-choice),
 * or `null` (quiz free-text). Anything unrecognised becomes `null` rather than
 * being rendered as `[object Object]`.
 */
function toPreviewOptions(raw: unknown): readonly ImportPreviewOption[] | readonly string[] | null {
  if (!Array.isArray(raw)) return null;

  if (raw.every((o): o is string => typeof o === 'string')) {
    return raw;
  }

  if (
    raw.every(
      (o): o is ImportPreviewOption =>
        typeof o === 'object' && o !== null && 'optionText' in o && 'isCorrect' in o,
    )
  ) {
    return raw.map((o) => ({ optionText: String(o.optionText), isCorrect: Boolean(o.isCorrect) }));
  }

  return null;
}

export function toImportPreviewQuestion(dto: ImportPreviewQuestionDto): ImportPreviewQuestion {
  return {
    position: dto.position,
    questionText: dto.questionText,
    sourceRow: dto.sourceRow,
    questionType: dto.questionType,
    marks: dto.marks,
    options: toPreviewOptions(dto.options),
    correctAnswer: dto.correctAnswer,
  };
}

export function toImportPreview(dto: ImportPreviewDto): ImportPreview {
  return {
    importId: dto.importId,
    report: toImportReport(dto.report),
    fileHash: dto.fileHash,
    expiresInSeconds: dto.expiresInSeconds,
    preview: dto.preview.map(toImportPreviewQuestion),
  };
}

export function toImportCommitResult(dto: ImportCommitDto): ImportCommitResult {
  return {
    importId: dto.importId,
    target: toTarget(dto.target),
    targetId: dto.targetId,
    created: dto.created,
    createdIds: dto.createdIds,
    undoExpiresInSeconds: dto.undoExpiresInSeconds,
  };
}

export function toImportUndoResult(dto: ImportUndoDto): ImportUndoResult {
  return {
    importId: dto.importId,
    deleted: dto.deleted,
  };
}
