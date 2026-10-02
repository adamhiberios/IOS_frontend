import { HttpErrorResponse } from '@angular/common/http';

import { type ProblemDetails, problemDetailMessage } from '@core/http';

import { type LessonImportIssue, isKnownIssueCode } from './lesson-import.model';

/**
 * Shared wording for the Word (.docx) import — lessons and blog articles use
 * the same backend converter (`docs/content-import.md`), so they report the
 * same issue codes. Translations live under `admin.lessonImport.*`; a target
 * may override individual codes whose wording names the target (see
 * {@link ImportTarget.issueOverrides}).
 */

/** Translate function — `LanguageService.t`. */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * A Word document that could not become content. Its message is already
 * translated and shown as the dialog's error; nothing was saved to the body.
 */
export class ContentImportError extends Error {}

/** Per-target wording: which codes are re-worded and under which i18n prefix. */
export interface ImportTarget {
  readonly issueOverrides?: {
    readonly prefix: string;
    readonly codes: readonly string[];
  };
}

/**
 * Localised text for an import issue. Codes are stable API; the server's
 * English `message` is only the fallback for a code this build doesn't know.
 */
export function importIssueText(
  t: Translate,
  issue: LessonImportIssue,
  target: ImportTarget = {},
): string {
  if (!isKnownIssueCode(issue.code)) return issue.message;
  // The converter's own wording is the only useful content of this one.
  if (issue.code === 'CONVERTER_WARNING' && issue.message) return issue.message;
  const overrides = target.issueOverrides;
  const prefix =
    overrides && overrides.codes.includes(issue.code)
      ? overrides.prefix
      : 'admin.lessonImport.issues';
  return t(`${prefix}.${issue.code}`, issue.detail);
}

/** An unreadable file is a 400 whose `errors[0].code` says why. */
export function importErrorText(t: Translate, err: unknown, target: ImportTarget = {}): string {
  if (err instanceof HttpErrorResponse) {
    const first = (err.error as ProblemDetails | null)?.errors?.[0];
    if (first && isKnownIssueCode(first.code)) {
      return importIssueText(t, { code: first.code, message: first.message, detail: {} }, target);
    }
    if (err.status === 503) return t('admin.lessonImport.storageUnavailable');
  }
  return problemDetailMessage(err) ?? t('admin.lessonImport.uploadError');
}
