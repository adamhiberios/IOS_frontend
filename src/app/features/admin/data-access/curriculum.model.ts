/**
 * Frontend domain model for admin curriculum management (BE-I-13 / B1).
 * Mirrors `curriculum.dto.ts`.
 *
 * Modules and lessons include soft-deleted rows (`active: false`); the page
 * surfaces active-first and offers reactivate / deactivate. Nullable text
 * fields stay nullable so the UI can render an explicit "not set".
 */

export interface ModuleLocaleFields {
  readonly title?: string;
  readonly description?: string;
}

export interface LessonLocaleFields {
  readonly title?: string;
  readonly content_html?: string;
}

export interface AdminLesson {
  readonly id: string;
  readonly moduleId: string;
  readonly title: string;
  readonly contentText: string | null;
  readonly videoUrl: string | null;
  readonly position: number;
  readonly durationSeconds: number | null;
  readonly active: boolean;
  readonly translations: Readonly<Record<string, LessonLocaleFields>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminModule {
  readonly id: string;
  readonly certId: string;
  readonly title: string;
  readonly description: string | null;
  readonly position: number;
  readonly active: boolean;
  readonly translations: Readonly<Record<string, ModuleLocaleFields>>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lessons: readonly AdminLesson[];
}

export interface AdminCurriculum {
  readonly certId: string;
  readonly programCode: string;
  readonly title: string;
  readonly modules: readonly AdminModule[];
}

/** Editable module fields (create + edit share this shape; `active` is toggled separately). */
export interface ModuleDraft {
  readonly title: string;
  readonly description: string;
  readonly position: number;
}

/** Editable lesson fields (create + edit share this shape; `active` is toggled separately). */
export interface LessonDraft {
  readonly title: string;
  readonly contentText: string;
  readonly videoUrl: string;
  readonly position: number;
  readonly durationSeconds: number;
}

/**
 * Non-canonical locale codes (i.e. not `en`) that carry any translated field.
 * Used to show a compact "translated: AR, FR" indicator; the translation
 * editor itself is a follow-up increment (like catalog / exam translations).
 */
export function translatedLocales(
  translations: Readonly<Record<string, ModuleLocaleFields | LessonLocaleFields>>,
): readonly string[] {
  return Object.entries(translations)
    .filter(([locale, fields]) => locale !== 'en' && hasAnyField(fields))
    .map(([locale]) => locale)
    .sort();
}

function hasAnyField(fields: ModuleLocaleFields | LessonLocaleFields): boolean {
  return Object.values(fields).some((v) => typeof v === 'string' && v.trim().length > 0);
}

/** Stable sort placing active rows first, then by ascending position. */
export function activeFirstByPosition<T extends { active: boolean; position: number }>(
  rows: readonly T[],
): readonly T[] {
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      if (a.row.active !== b.row.active) return a.row.active ? -1 : 1;
      if (a.row.position !== b.row.position) return a.row.position - b.row.position;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}
