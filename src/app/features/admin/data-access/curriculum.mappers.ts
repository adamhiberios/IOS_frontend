import {
  type AdminCurriculumDto,
  type AdminLessonDto,
  type AdminModuleDto,
  type CreateLessonBody,
  type CreateModuleBody,
  type UpdateLessonBody,
  type UpdateModuleBody,
} from './curriculum.dto';
import {
  type AdminCurriculum,
  type AdminLesson,
  type AdminModule,
  type LessonDraft,
  type ModuleDraft,
} from './curriculum.model';

export function toAdminLesson(dto: AdminLessonDto): AdminLesson {
  return {
    id: dto.id,
    moduleId: dto.moduleId,
    title: dto.title,
    contentText: dto.contentText,
    videoUrl: dto.videoUrl,
    position: dto.position,
    durationSeconds: dto.durationSeconds,
    active: dto.active,
    translations: dto.translations ?? {},
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toAdminModule(dto: AdminModuleDto): AdminModule {
  return {
    id: dto.id,
    certId: dto.certId,
    title: dto.title,
    description: dto.description,
    position: dto.position,
    active: dto.active,
    translations: dto.translations ?? {},
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    lessons: dto.lessons.map(toAdminLesson),
  };
}

export function toAdminCurriculum(dto: AdminCurriculumDto): AdminCurriculum {
  return {
    certId: dto.certId,
    programCode: dto.programCode,
    title: dto.title,
    modules: dto.modules.map(toAdminModule),
  };
}

// ── Draft → write body ───────────────────────────────────────────────────────
//
// Optional text fields are omitted when blank on create (let backend defaults
// apply) but sent as-is on update (so an emptied field is persisted). Canonical
// title edits preserve existing ar/fr translations server-side (buildTranslations
// re-mirrors only `en`), so we never send `translations` from here.

export function toCreateModuleBody(draft: ModuleDraft, certId: string): CreateModuleBody {
  const description = draft.description.trim();
  return {
    certId,
    title: draft.title.trim(),
    ...(description ? { description } : {}),
    position: draft.position,
  };
}

export function toUpdateModuleBody(draft: ModuleDraft): UpdateModuleBody {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    position: draft.position,
  };
}

export function toCreateLessonBody(draft: LessonDraft, moduleId: string): CreateLessonBody {
  const videoUrl = draft.videoUrl.trim();
  return {
    moduleId,
    title: draft.title.trim(),
    // Required and non-empty on the backend — never omitted, unlike videoUrl.
    contentText: draft.contentText.trim(),
    ...(videoUrl ? { videoUrl } : {}),
    position: draft.position,
    durationSeconds: draft.durationSeconds,
  };
}

export function toUpdateLessonBody(draft: LessonDraft): UpdateLessonBody {
  return {
    title: draft.title.trim(),
    contentText: draft.contentText.trim(),
    videoUrl: draft.videoUrl.trim(),
    position: draft.position,
    durationSeconds: draft.durationSeconds,
  };
}
