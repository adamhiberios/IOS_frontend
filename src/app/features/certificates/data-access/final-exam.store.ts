import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { FinalExamApi } from './final-exam.api';

/**
 * `FinalExamAccessStore` — state for one "Start final exam" CTA. Provided per
 * {@link FinalExamCta} instance (not root) so an error under one button never
 * shows up under another on the same page.
 */
@Injectable()
export class FinalExamAccessStore {
  private readonly api = inject(FinalExamApi);
  private readonly lang = inject(LanguageService);

  private readonly _requesting = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly requesting = this._requesting.asReadonly();
  readonly error = this._error.asReadonly();

  /** Ask the backend to email the access code. Resolves `true` on success. */
  async request(certId: string): Promise<boolean> {
    if (this._requesting()) return false;
    this._requesting.set(true);
    this._error.set(null);
    try {
      await firstValueFrom(this.api.requestAccess(certId));
      return true;
    } catch (err) {
      this._error.set(
        problemDetailMessage(err) ?? this.lang.t('dashboard.certs.examCodeRequestFailed'),
      );
      return false;
    } finally {
      this._requesting.set(false);
    }
  }
}
