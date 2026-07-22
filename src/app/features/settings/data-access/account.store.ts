import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AccountApi } from './account.api';
import { type DeleteAccountResult } from './account.model';
import { downloadBlob } from '../utils/download-blob';

/**
 * `AccountStore` — signal store for the self-service GDPR account actions
 * (BE-042 / A2): the personal-data **export** and the **delete** (step-up
 * re-auth) flow.
 *
 * Both actions are one-shot commands: the store tracks pending/error and, for
 * export, triggers the browser download; the caller (the Settings page) owns
 * navigation/logout after a successful delete. Not root-provided — scoped to the
 * settings route so its transient state doesn't outlive the page.
 */
@Injectable()
export class AccountStore {
  private readonly api = inject(AccountApi);
  private readonly lang = inject(LanguageService);

  /* ── export state ── */
  private readonly _exporting = signal(false);
  private readonly _exportError = signal<string | null>(null);

  /* ── delete state ── */
  private readonly _deleting = signal(false);
  private readonly _deleteError = signal<string | null>(null);

  readonly exporting = this._exporting.asReadonly();
  readonly exportError = this._exportError.asReadonly();
  readonly deleting = this._deleting.asReadonly();
  readonly deleteError = this._deleteError.asReadonly();

  /**
   * Fetch the caller's personal-data export and trigger a client download.
   * Returns `true` on success; on failure {@link exportError} carries the reason.
   */
  async exportData(): Promise<boolean> {
    if (this._exporting()) return false;
    this._exporting.set(true);
    this._exportError.set(null);
    try {
      const blob = await firstValueFrom(this.api.export());
      downloadBlob(blob, `ios-lms-export-${this.today()}.json`);
      return true;
    } catch (err) {
      this._exportError.set(
        problemDetailMessage(err) ?? this.lang.t('settings.account.exportError'),
      );
      return false;
    } finally {
      this._exporting.set(false);
    }
  }

  /**
   * Delete (anonymize) the caller's account after password re-auth. Returns the
   * {@link DeleteAccountResult} on success (the caller then clears the session),
   * or `null` on failure ({@link deleteError} carries why — e.g. wrong password).
   */
  async deleteAccount(password: string): Promise<DeleteAccountResult | null> {
    if (this._deleting()) return null;
    this._deleting.set(true);
    this._deleteError.set(null);
    try {
      return await firstValueFrom(this.api.deleteAccount(password));
    } catch (err) {
      this._deleteError.set(
        problemDetailMessage(err) ?? this.lang.t('settings.deleteDialog.error'),
      );
      return null;
    } finally {
      this._deleting.set(false);
    }
  }

  /** Clear a lingering delete error (e.g. when reopening the dialog). */
  clearDeleteError(): void {
    this._deleteError.set(null);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
