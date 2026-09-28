/**
 * Frontend model for lesson content from Word (IDD-317 / IDD-318).
 * Mirrors `lesson-import.dto.ts`; limits mirror the backend's
 * `lesson-import.constants.ts`.
 */

/** Largest .docx the backend accepts (`MAX_DOCX_BYTES`). */
export const LESSON_IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;

/** `accept` for the file input — .docx only; old .doc is rejected server-side. */
export const LESSON_IMPORT_FILE_ACCEPT =
  '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Issue codes the backend reports. Each has a translated message under
 * `admin.lessonImport.issues.*`; an unknown future code falls back to the
 * server's English `message`.
 */
export const LESSON_IMPORT_ISSUE_CODES = [
  'FILE_EMPTY',
  'FILE_TOO_LARGE',
  'NOT_A_DOCX',
  'LEGACY_OR_PROTECTED',
  'FILE_UNREADABLE',
  'CONTENT_EMPTY',
  'CONTENT_TOO_LONG',
  'TITLE_HEADING_REMOVED',
  'HEADING_1_IN_CONTENT',
  'CALLOUT_LABEL_UNKNOWN',
  'CALLOUT_WITHOUT_LABEL',
  'STYLE_NOT_MAPPED',
  'IMAGE_MISSING_ALT',
  'IMAGE_UNSUPPORTED_TYPE',
  'IMAGE_TOO_LARGE',
  'IMAGE_LIMIT_REACHED',
  'CONVERTER_WARNING',
] as const;

export type LessonImportIssueCode = (typeof LESSON_IMPORT_ISSUE_CODES)[number];

export function isKnownIssueCode(code: string): code is LessonImportIssueCode {
  return (LESSON_IMPORT_ISSUE_CODES as readonly string[]).includes(code);
}

export interface LessonImportIssue {
  readonly code: string;
  readonly message: string;
  readonly detail: Readonly<Record<string, string | number>>;
}

/** The converted document. */
export interface LessonImportResult {
  readonly canSave: boolean;
  /** Stored form (images by `data-media-key`) — saved as the lesson's `contentText`. */
  readonly html: string;
  /** Blocking — the document must be fixed and uploaded again. */
  readonly errors: readonly LessonImportIssue[];
  /** Non-blocking — the content is saved; worth telling the admin. */
  readonly warnings: readonly LessonImportIssue[];
}
