import { type LessonImportIssueDto, type LessonImportPreviewDto } from './lesson-import.dto';
import { type LessonImportIssue, type LessonImportResult } from './lesson-import.model';

function toIssue(dto: LessonImportIssueDto): LessonImportIssue {
  return { code: dto.code, message: dto.message, detail: dto.detail ?? {} };
}

/** Shared by the lesson and blog imports — only the fields both reports carry. */
export function toLessonImportResult(
  dto: Pick<LessonImportPreviewDto, 'canSave' | 'html' | 'errors' | 'warnings'>,
): LessonImportResult {
  return {
    canSave: dto.canSave,
    html: dto.html,
    errors: dto.errors.map(toIssue),
    warnings: dto.warnings.map(toIssue),
  };
}
