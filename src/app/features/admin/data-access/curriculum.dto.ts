/**
 * Wire shapes for the admin curriculum management page (BE-I-13 / B1).
 *
 *   GET /admin/certs/:id/curriculum → `{ data: AdminCurriculumDto }`
 *
 * Returns **every** module and lesson for a certificate regardless of active
 * state (soft-deleted rows included), ordered by position, with full admin
 * fields (active, timestamps, translations). Module/lesson CRUD reuses the
 * existing `POST/PATCH/DELETE /admin/modules|lessons` endpoints (see
 * `learning-admin.controller.ts`).
 */

/** Per-locale module fields. `en` is auto-mirrored from the canonical row. */
export interface ModuleLocaleFieldsDto {
  readonly title?: string;
  readonly description?: string;
}

/** Per-locale lesson fields. Note the body key is `content_html` (backend). */
export interface LessonLocaleFieldsDto {
  readonly title?: string;
  readonly content_html?: string;
}

export interface AdminLessonDto {
  readonly id: string;
  readonly moduleId: string;
  readonly title: string;
  readonly contentText: string | null;
  readonly videoUrl: string | null;
  readonly position: number;
  readonly durationSeconds: number | null;
  readonly active: boolean;
  readonly translations: Readonly<Record<string, LessonLocaleFieldsDto>> | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminModuleDto {
  readonly id: string;
  readonly certId: string;
  readonly title: string;
  readonly description: string | null;
  readonly position: number;
  readonly active: boolean;
  readonly translations: Readonly<Record<string, ModuleLocaleFieldsDto>> | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lessons: readonly AdminLessonDto[];
}

export interface AdminCurriculumDto {
  readonly certId: string;
  readonly programCode: string;
  readonly title: string;
  readonly modules: readonly AdminModuleDto[];
}

/** `{ data }` envelope returned by `GET /admin/certs/:id/curriculum`. */
export interface CurriculumResponseDto {
  readonly data: AdminCurriculumDto;
}

// ── Write bodies (module/lesson CRUD) ────────────────────────────────────────

/** `POST /admin/modules`. */
export interface CreateModuleBody {
  readonly certId: string;
  readonly title: string;
  readonly description?: string;
  readonly position?: number;
}

/** `PATCH /admin/modules/:id` (partial). `active` toggles soft-delete state. */
export interface UpdateModuleBody {
  readonly title?: string;
  readonly description?: string;
  readonly position?: number;
  readonly active?: boolean;
}

/** `POST /admin/lessons`. */
export interface CreateLessonBody {
  readonly moduleId: string;
  readonly title: string;
  readonly contentText?: string;
  readonly videoUrl?: string;
  readonly position?: number;
  readonly durationSeconds?: number;
}

/** `PATCH /admin/lessons/:id` (partial). `active` toggles soft-delete state. */
export interface UpdateLessonBody {
  readonly title?: string;
  readonly contentText?: string;
  readonly videoUrl?: string;
  readonly position?: number;
  readonly durationSeconds?: number;
  readonly active?: boolean;
}
