/**
 * Wire shapes for the Word → lesson content import
 * (backend `docs/lesson-content-import.md`).
 *
 *   POST /admin/lessons/:lessonId/content/import?locale=en  (multipart, field `file`)
 *     → `{ data: LessonImportPreviewDto }`
 *
 * The call writes nothing to the lesson: the admin reviews `previewHtml` and
 * saves `html` through the ordinary `PATCH /admin/lessons/:id`.
 */

export interface LessonImportIssueDto {
  /** Stable machine-readable code — switch on this, not on `message`. */
  readonly code: string;
  readonly message: string;
  readonly detail?: Readonly<Record<string, string | number>>;
}

export interface LessonImportImageDto {
  readonly key: string;
  readonly contentType: string;
  readonly bytes: number;
  readonly altText: string | null;
  /** Signed GET URL, valid for `urlExpiresInSeconds`. */
  readonly url: string;
}

export interface LessonImportStatsDto {
  readonly characters: number;
  readonly headings: number;
  readonly images: number;
  readonly callouts: {
    readonly exam: number;
    readonly takeaway: number;
    readonly example: number;
    readonly note: number;
  };
}

export interface LessonImportPreviewDto {
  readonly lessonId: string;
  readonly locale: string;
  /** `contentText` for English, otherwise `translations.{locale}.content_html`. */
  readonly saveField: string;
  /** False when `errors` is non-empty. */
  readonly canSave: boolean;
  /** The HTML to SAVE — images carry `data-media-key` and no `src`. */
  readonly html: string;
  /** The same HTML with a signed `src` on every image — RENDER this. */
  readonly previewHtml: string;
  readonly urlExpiresInSeconds: number;
  readonly images: readonly LessonImportImageDto[];
  readonly stats: LessonImportStatsDto;
  readonly errors: readonly LessonImportIssueDto[];
  readonly warnings: readonly LessonImportIssueDto[];
}

export interface LessonImportPreviewResponseDto {
  readonly data: LessonImportPreviewDto;
}

/**
 * `POST /admin/blog/:id/content/import` — the same report as a lesson, keyed by
 * `articleId`. Blog images are public: `html` carries a permanent `<img src>`,
 * `previewHtml` is identical and `urlExpiresInSeconds` is `null`.
 */
export interface BlogImportPreviewDto extends Omit<
  LessonImportPreviewDto,
  'lessonId' | 'urlExpiresInSeconds'
> {
  readonly articleId: string;
  readonly urlExpiresInSeconds: null;
}

export interface BlogImportPreviewResponseDto {
  readonly data: BlogImportPreviewDto;
}
