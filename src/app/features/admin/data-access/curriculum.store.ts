import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { AdminCurriculumApi } from './curriculum.api';
import {
  toCreateLessonBody,
  toCreateModuleBody,
  toUpdateLessonBody,
  toUpdateModuleBody,
} from './curriculum.mappers';
import {
  type AdminCurriculum,
  type AdminModule,
  type LessonDraft,
  type ModuleDraft,
  activeFirstByPosition,
} from './curriculum.model';

/** Certs offered in the picker (backend max page size). */
const CERT_PICKER_LIMIT = 100;

/** A certificate option for the picker. */
export interface CertOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Signal store for admin curriculum management (BE-I-13 / B1).
 *
 * Owns the cert-picker options (via {@link AdminCatalogApi}), the selected cert,
 * that cert's full curriculum (all statuses), and module/lesson create / edit /
 * reactivate / deactivate actions. Business logic lives here; the page binds
 * signals. Lesson-quiz authoring (B5) and the translation editor are follow-ups.
 */
@Injectable({ providedIn: 'root' })
export class AdminCurriculumStore {
  private readonly api = inject(AdminCurriculumApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly lang = inject(LanguageService);

  private readonly _certs = signal<readonly CertOption[]>([]);
  private readonly _certsLoading = signal(false);
  private readonly _certsError = signal<string | null>(null);
  private readonly _certId = signal<string | null>(null);

  private readonly _curriculum = signal<AdminCurriculum | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  /** `${type}:${id}` (or `${type}:new`) of the in-flight write, for row spinners. */
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();
  readonly certsError = this._certsError.asReadonly();
  readonly certId = this._certId.asReadonly();

  readonly curriculum = this._curriculum.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();

  /** Modules active-first (each with its lessons active-first) — the render list. */
  readonly modules = computed<readonly AdminModule[]>(() => {
    const curriculum = this._curriculum();
    if (!curriculum) return [];
    return activeFirstByPosition(curriculum.modules).map((m) => ({
      ...m,
      lessons: activeFirstByPosition(m.lessons),
    }));
  });

  readonly isEmpty = computed(
    () =>
      this._certId() !== null &&
      !this._loading() &&
      this._error() === null &&
      (this._curriculum()?.modules.length ?? 0) === 0,
  );

  /** Load the certificate options for the picker (active certs only). */
  async loadCerts(): Promise<void> {
    if (this._certsLoading()) return;
    this._certsLoading.set(true);
    this._certsError.set(null);
    try {
      const page = await firstValueFrom(
        this.catalog.list({ active: true, limit: CERT_PICKER_LIMIT }),
      );
      this._certs.set(
        page.items.map((c) => ({ id: c.id, label: `${c.title} (${c.programCode})` })),
      );
    } catch (err) {
      this._certsError.set(problemDetailMessage(err) ?? this.lang.t('admin.curriculum.certsError'));
    } finally {
      this._certsLoading.set(false);
    }
  }

  /** Select a certificate and load its curriculum. Clears when `null`/empty. */
  async setCert(certId: string | null): Promise<void> {
    const next = certId || null;
    if (next === this._certId()) return;
    this._certId.set(next);
    this._curriculum.set(null);
    this._error.set(null);
    this._actionError.set(null);
    if (next !== null) await this.load();
  }

  /** Reload the current cert's curriculum. */
  async load(): Promise<void> {
    const certId = this._certId();
    if (certId === null) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      this._curriculum.set(await firstValueFrom(this.api.getCurriculum(certId)));
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.curriculum.error'));
    } finally {
      this._loading.set(false);
    }
  }

  // ── Module actions ─────────────────────────────────────────────────────────

  async saveModule(draft: ModuleDraft, id?: string): Promise<boolean> {
    const certId = this._certId();
    if (certId === null) return false;
    return this.runAction(`module:${id ?? 'new'}`, () =>
      id
        ? firstValueFrom(this.api.updateModule(id, toUpdateModuleBody(draft)))
        : firstValueFrom(this.api.createModule(toCreateModuleBody(draft, certId))),
    );
  }

  /** Reactivate a soft-deleted module (`PATCH { active: true }`). */
  async reactivateModule(id: string): Promise<boolean> {
    return this.runAction(`module:${id}`, () =>
      firstValueFrom(this.api.updateModule(id, { active: true })),
    );
  }

  /** Soft-delete a module (`DELETE`, learning_admin). */
  async deactivateModule(id: string): Promise<boolean> {
    return this.runAction(`module:${id}`, () => firstValueFrom(this.api.deactivateModule(id)));
  }

  // ── Lesson actions ─────────────────────────────────────────────────────────

  async saveLesson(draft: LessonDraft, moduleId: string, id?: string): Promise<boolean> {
    return this.runAction(`lesson:${id ?? 'new'}`, () =>
      id
        ? firstValueFrom(this.api.updateLesson(id, toUpdateLessonBody(draft)))
        : firstValueFrom(this.api.createLesson(toCreateLessonBody(draft, moduleId))),
    );
  }

  /** Reactivate a soft-deleted lesson (`PATCH { active: true }`). */
  async reactivateLesson(id: string): Promise<boolean> {
    return this.runAction(`lesson:${id}`, () =>
      firstValueFrom(this.api.updateLesson(id, { active: true })),
    );
  }

  /** Soft-delete a lesson (`DELETE`, learning_admin). */
  async deactivateLesson(id: string): Promise<boolean> {
    return this.runAction(`lesson:${id}`, () => firstValueFrom(this.api.deactivateLesson(id)));
  }

  /** Clear a lingering row/form-action error (e.g. when a dialog closes). */
  clearActionError(): void {
    this._actionError.set(null);
  }

  /**
   * Run a single write with a shared pending/error lifecycle, then refetch the
   * whole curriculum so positions / active flags stay consistent. Returns `true`
   * on success; the failure reason is exposed via {@link actionError}.
   */
  private async runAction(pendingKey: string, action: () => Promise<unknown>): Promise<boolean> {
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(pendingKey);
    this._actionError.set(null);
    try {
      await action();
      await this.load();
      return true;
    } catch (err) {
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.curriculum.saveError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }
}
