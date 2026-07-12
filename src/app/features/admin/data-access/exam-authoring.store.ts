import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { AdminExamAuthoringApi } from './exam-authoring.api';
import { type AdminExam, type ExamDraft } from './exam-authoring.model';

/** Certs offered in the picker (backend max page size). */
const CERT_PICKER_LIMIT = 100;

/** A certificate option for the picker. */
export interface CertOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Signal store for admin exam authoring (list + lifecycle).
 *
 * Owns the cert-picker options (via {@link AdminCatalogApi}), the selected cert,
 * that cert's exams (all statuses, ordered by examOrder) and the create/update/
 * publish/unpublish/delete actions. Business logic lives here; the page only
 * binds signals. Question authoring is a follow-up increment.
 */
@Injectable({ providedIn: 'root' })
export class AdminExamAuthoringStore {
  private readonly api = inject(AdminExamAuthoringApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly lang = inject(LanguageService);

  private readonly _certs = signal<readonly CertOption[]>([]);
  private readonly _certsLoading = signal(false);
  private readonly _certsError = signal<string | null>(null);
  private readonly _certId = signal<string | null>(null);

  private readonly _exams = signal<readonly AdminExam[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();
  readonly certsError = this._certsError.asReadonly();
  readonly certId = this._certId.asReadonly();

  /** Exams in backend order (examOrder ASC) — the meaningful sequence for a cert. */
  readonly exams = this._exams.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly isEmpty = computed(
    () =>
      this._certId() !== null &&
      !this._loading() &&
      this._error() === null &&
      this._exams().length === 0,
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
      this._certsError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.examAuthoring.certsError'),
      );
    } finally {
      this._certsLoading.set(false);
    }
  }

  /** Select a certificate and load its exams. Clears when `null`/empty. */
  async setCert(certId: string | null): Promise<void> {
    const next = certId || null;
    if (next === this._certId()) return;
    this._certId.set(next);
    this._exams.set([]);
    this._error.set(null);
    this._actionError.set(null);
    if (next !== null) await this.load();
  }

  /** Reload the current cert's exams. */
  async load(): Promise<void> {
    const certId = this._certId();
    if (certId === null) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      this._exams.set(await firstValueFrom(this.api.listExams(certId)));
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.examAuthoring.error'));
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create (`id` omitted) or update an exam's metadata, then refresh. Returns
   * `true` on success; the failure reason is exposed via {@link actionError}.
   */
  async save(draft: ExamDraft, id?: string): Promise<boolean> {
    const certId = this._certId();
    if (certId === null) return false;
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(id ?? 'new');
    this._actionError.set(null);
    try {
      if (id) {
        await firstValueFrom(this.api.update(id, draft));
      } else {
        await firstValueFrom(this.api.create(certId, draft));
      }
      await this.load();
      return true;
    } catch (err) {
      this._actionError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.examAuthoring.saveError'),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  /**
   * Publish a draft exam, then refresh. On the publish-gate failure the backend
   * returns a generic message (the structured `reasons[]` are dropped by its
   * exception filter — see BE-I-14), surfaced here as {@link actionError}.
   */
  async publish(id: string): Promise<boolean> {
    return this.runRowAction(id, () => firstValueFrom(this.api.publish(id)));
  }

  /** Revert a published exam to draft, then refresh (learning_admin). */
  async unpublish(id: string): Promise<boolean> {
    return this.runRowAction(id, () => firstValueFrom(this.api.unpublish(id)));
  }

  /** Hard-delete an unused draft exam, then refresh (learning_admin). */
  async remove(id: string): Promise<boolean> {
    return this.runRowAction(id, () => firstValueFrom(this.api.remove(id)));
  }

  /** Clear a lingering row/form-action error (e.g. when a dialog closes). */
  clearActionError(): void {
    this._actionError.set(null);
  }

  private async runRowAction(id: string, action: () => Promise<unknown>): Promise<boolean> {
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(id);
    this._actionError.set(null);
    try {
      await action();
      await this.load();
      return true;
    } catch (err) {
      this._actionError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.examAuthoring.actionError'),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }
}
