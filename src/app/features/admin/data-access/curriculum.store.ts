import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { type ProblemDetails, problemDetailMessage } from '@core/http';
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
import { AdminLessonImportApi } from './lesson-import.api';
import { type LessonImportIssue, isKnownIssueCode } from './lesson-import.model';

/**
 * A Word document that could not become lesson content. Its message is already
 * translated and shown as the dialog's error; nothing was saved to the body.
 */
class LessonContentError extends Error {}

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
 *
 * Lesson bodies come from Word (IDD-317 / IDD-318): the admin uploads a .docx,
 * the backend converts it to HTML, and the HTML is saved to the lesson right
 * away. Learners then receive that stored HTML from `GET /learning/lessons/:id`.
 */
@Injectable({ providedIn: 'root' })
export class AdminCurriculumStore {
  private readonly api = inject(AdminCurriculumApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly lessonImport = inject(AdminLessonImportApi);
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
  /** Non-blocking notes from the last Word document saved (missing alt text, …). */
  private readonly _importWarnings = signal<readonly string[]>([]);

  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();
  readonly certsError = this._certsError.asReadonly();
  readonly certId = this._certId.asReadonly();

  readonly curriculum = this._curriculum.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly importWarnings = this._importWarnings.asReadonly();

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

  /** Permanently delete an inactive module (IDD-389, learning_admin). */
  async permanentDeleteModule(id: string): Promise<boolean> {
    return this.runAction(`module:${id}`, () => firstValueFrom(this.api.permanentDeleteModule(id)));
  }

  // ── Lesson actions ─────────────────────────────────────────────────────────

  /**
   * Save a lesson, taking its body from a Word document.
   *
   * - **Edit**: with a file, the document is converted first and its HTML goes
   *   out in the same PATCH as the other fields; without one the stored body is
   *   left untouched.
   * - **Create** (file required): the lesson is created inactive with a stub
   *   body, because the conversion needs its id; the document is then converted
   *   and one PATCH stores the HTML and activates the lesson.
   *
   * `onCreated` reports the new id as soon as the row exists, so if the
   * document is then rejected the dialog can carry on as an edit of that
   * (still inactive, invisible to learners) lesson instead of creating another.
   * `activate` makes an edit also activate the lesson — used for exactly that
   * retry.
   */
  async saveLesson(
    draft: LessonDraft,
    moduleId: string,
    opts: {
      readonly id?: string;
      readonly file?: File | null;
      readonly activate?: boolean;
      readonly onCreated?: (id: string) => void;
    } = {},
  ): Promise<boolean> {
    const { id, file, activate, onCreated } = opts;
    this._importWarnings.set([]);
    const ok = await this.runAction(`lesson:${id ?? 'new'}`, async () => {
      if (id) {
        const html = file ? await this.convertDocx(id, file) : undefined;
        await firstValueFrom(
          this.api.updateLesson(id, {
            ...toUpdateLessonBody(draft, html),
            ...(activate ? { active: true } : {}),
          }),
        );
        return;
      }

      if (!file) throw new LessonContentError(this.lang.t('admin.lessonImport.fileRequired'));
      const newId = await firstValueFrom(
        this.api.createLesson(toCreateLessonBody(draft, moduleId)),
      );
      onCreated?.(newId);
      try {
        const html = await this.convertDocx(newId, file);
        await firstValueFrom(this.api.updateLesson(newId, { contentText: html, active: true }));
      } catch (err) {
        // The inactive row exists now — show it in the list behind the dialog.
        void this.load();
        throw err;
      }
    });
    // Notes about a document that didn't end up saved would only mislead.
    if (!ok) this._importWarnings.set([]);
    return ok;
  }

  /**
   * Convert a .docx to lesson HTML. Throws {@link LessonContentError} with a
   * translated message when the document cannot be used.
   */
  private async convertDocx(lessonId: string, file: File): Promise<string> {
    let result;
    try {
      result = await firstValueFrom(this.lessonImport.convert(lessonId, file));
    } catch (err) {
      throw new LessonContentError(this.convertErrorText(err));
    }
    if (!result.canSave) {
      throw new LessonContentError(
        [
          this.lang.t('admin.lessonImport.errorsIntro'),
          ...result.errors.map((i) => this.issueText(i)),
        ].join(' '),
      );
    }
    this._importWarnings.set(result.warnings.map((i) => this.issueText(i)));
    return result.html;
  }

  /**
   * Localised text for an import issue. Codes are stable API; the server's
   * English `message` is only the fallback for a code this build doesn't know.
   */
  issueText(issue: LessonImportIssue): string {
    if (!isKnownIssueCode(issue.code)) return issue.message;
    // The converter's own wording is the only useful content of this one.
    if (issue.code === 'CONVERTER_WARNING' && issue.message) return issue.message;
    return this.lang.t(`admin.lessonImport.issues.${issue.code}`, issue.detail);
  }

  /** An unreadable file is a 400 whose `errors[0].code` says why. */
  private convertErrorText(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const first = (err.error as ProblemDetails | null)?.errors?.[0];
      if (first && isKnownIssueCode(first.code)) {
        return this.issueText({ code: first.code, message: first.message, detail: {} });
      }
      if (err.status === 503) return this.lang.t('admin.lessonImport.storageUnavailable');
    }
    return problemDetailMessage(err) ?? this.lang.t('admin.lessonImport.uploadError');
  }

  clearImportWarnings(): void {
    this._importWarnings.set([]);
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

  /** Permanently delete an inactive lesson (IDD-389, learning_admin). */
  async permanentDeleteLesson(id: string): Promise<boolean> {
    return this.runAction(`lesson:${id}`, () => firstValueFrom(this.api.permanentDeleteLesson(id)));
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
      this._actionError.set(
        err instanceof LessonContentError
          ? err.message
          : (problemDetailMessage(err) ?? this.lang.t('admin.curriculum.saveError')),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }
}
