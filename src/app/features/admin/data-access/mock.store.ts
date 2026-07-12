import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { AdminMockQuestionsApi } from './mock.api';
import { type MockQuestion, type MockQuestionDraft } from './mock.model';

/** How many certificates to offer in the picker (backend max page size). */
const CERT_PICKER_LIMIT = 100;

/** A certificate option for the bank picker. */
export interface CertOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Signal store for admin mock-question authoring.
 *
 * Owns the cert-picker options, the selected certificate, that cert's full
 * question bank (the endpoint is not paginated) and the create/update/
 * deactivate/reactivate actions. Business logic lives here; the page only binds
 * signals. Active questions are shown first (admin-list convention).
 */
@Injectable({ providedIn: 'root' })
export class AdminMockQuestionsStore {
  private readonly api = inject(AdminMockQuestionsApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly lang = inject(LanguageService);

  private readonly _certs = signal<readonly CertOption[]>([]);
  private readonly _certsLoading = signal(false);
  private readonly _certsError = signal<string | null>(null);
  private readonly _certId = signal<string | null>(null);

  private readonly _questions = signal<readonly MockQuestion[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();
  readonly certsError = this._certsError.asReadonly();
  readonly certId = this._certId.asReadonly();

  /** Active questions first, then inactive; position order preserved within each group. */
  readonly questions = computed(() =>
    [...this._questions()].sort((a, b) => Number(b.active) - Number(a.active)),
  );
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly isEmpty = computed(
    () =>
      this._certId() !== null &&
      !this._loading() &&
      this._error() === null &&
      this._questions().length === 0,
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
      this._certsError.set(problemDetailMessage(err) ?? this.lang.t('admin.mock.certsError'));
    } finally {
      this._certsLoading.set(false);
    }
  }

  /** Select a certificate and load its question bank. Clears when `null`/empty. */
  async setCert(certId: string | null): Promise<void> {
    const next = certId || null;
    if (next === this._certId()) return;
    this._certId.set(next);
    this._questions.set([]);
    this._error.set(null);
    this._actionError.set(null);
    if (next !== null) await this.load();
  }

  /** Reload the current cert's question bank. */
  async load(): Promise<void> {
    const certId = this._certId();
    if (certId === null) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const questions = await firstValueFrom(this.api.list(certId));
      this._questions.set(questions);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.mock.error'));
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create (`id` omitted) or update a question, then refresh the bank. Returns
   * `true` on success; the failure reason is exposed via {@link actionError}.
   */
  async save(draft: MockQuestionDraft, id?: string): Promise<boolean> {
    const certId = this._certId();
    if (certId === null) return false;
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(id ?? 'new');
    this._actionError.set(null);
    try {
      if (id) {
        await firstValueFrom(
          this.api.update(id, {
            questionText: draft.questionText,
            questionType: draft.questionType,
            position: draft.position,
            options: draft.options,
          }),
        );
      } else {
        await firstValueFrom(
          this.api.create({
            certId,
            questionText: draft.questionText,
            questionType: draft.questionType,
            position: draft.position,
            options: draft.options,
          }),
        );
      }
      await this.load();
      return true;
    } catch (err) {
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.mock.saveError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  /** Soft-delete (deactivate) a question, then refresh. Requires `learning_admin`. */
  async deactivate(id: string): Promise<boolean> {
    return this.runRowAction(id, () => firstValueFrom(this.api.softDelete(id)));
  }

  /** Re-activate a soft-deleted question, then refresh. */
  async reactivate(id: string): Promise<boolean> {
    return this.runRowAction(id, () => firstValueFrom(this.api.update(id, { active: true })));
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
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.mock.actionError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }
}
