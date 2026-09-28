import { type LessonImportIssueDto, type LessonImportPreviewDto } from './lesson-import.dto';
import { type LessonImportIssue, type LessonImportResult } from './lesson-import.model';

function toIssue(dto: LessonImportIssueDto): LessonImportIssue {
  return { code: dto.code, message: dto.message, detail: dto.detail ?? {} };
}

export function toLessonImportResult(dto: LessonImportPreviewDto): LessonImportResult {
  return {
    canSave: dto.canSave,
    html: dto.html,
    errors: dto.errors.map(toIssue),
    warnings: dto.warnings.map(toIssue),
  };
}
