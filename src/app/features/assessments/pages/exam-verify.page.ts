/* eslint-disable @typescript-eslint/unbound-method -- Angular's `Validators.*` are class statics passed by reference (same sanctioned pattern as the auth form pages). */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars } from '@ui';

import { LanguageService } from '@core/i18n';
import { problemDetailMessage } from '@core/http';

import { ExamApi } from '../data-access/exam.api';
import { type ExamReadyNavState } from '../data-access/exam.model';

/**
 * `ios-exam-verify-page` — validate a one-time exam access code and capture the
 * pre-exam identity attestation, then hand off to the ready page.
 *
 * Real backend flow (reconciled with the Figma email-link mock, which predates
 * the real API): the admin assigns an exam → the student receives a one-time
 * access CODE by email → the student enters it here. On submit we call
 * `POST /exam/validate-access` (does NOT consume the code) and, on success,
 * navigate to the ready page carrying the code + resolved exam metadata.
 *
 * Identity attestation (full name / ID) is collected per journeys p.4, but the
 * `POST /exam/pre-exam-confirmation` call is NOT made here — it needs a `certId`
 * the frontend cannot obtain at this point (validate-access does not return it;
 * the marketing cert pages use slugs, not the backend UUID — see BE-I-24). The
 * backend still enforces confirmation for purchase-enrolled students by rejecting
 * `start` with a 409, which the ready page surfaces.
 *
 * Design reference: Figma nodes 13271-13551 (kept shell/branding; body is now a form).
 */
@Component({
  selector: 'ios-exam-verify-page',
  imports: [ReactiveFormsModule, RouterLink, AuthHeader, AuthFooter, AccentBars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <div class="flex flex-col flex-1 pt-16">
        <nav
          class="w-full border-b border-ios-surface-soft bg-white flex items-center
                 px-4 md:px-20 h-[70px]"
          [attr.aria-label]="lang.t('assessments.verify.pageNavAriaLabel')"
        >
          <div class="flex items-center gap-4">
            <a
              routerLink="/dashboard"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                     bg-ios-surface-soft text-ios-fg-13 transition-colors hover:bg-ios-surface-hover
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                     focus-visible:ring-ios-brand-primary/50"
              [attr.aria-label]="lang.t('assessments.verify.backAriaLabel')"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5" />
                <path d="M12 5l-7 7 7 7" />
              </svg>
            </a>
            <span class="font-semibold text-ios-fg-13 text-base leading-tight" dir="auto">
              {{ lang.t('assessments.verify.title') }}
            </span>
          </div>
        </nav>

        <main class="relative flex-1 flex flex-col items-center px-4 py-12">
          <ios-accent-bars top="7rem" start="27.5%" end="27.5%" />

          <div class="relative z-10 w-full max-w-[606px]">
            <p class="text-lg font-medium text-ios-fg-8 leading-relaxed mb-8">
              {{ lang.t('assessments.verify.codeIntro') }}
            </p>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6" novalidate>
              <!-- Access code -->
              <div class="flex flex-col gap-2">
                <label for="exam-code" class="text-base font-semibold text-ios-fg-11">
                  {{ lang.t('assessments.verify.codeLabel') }}
                </label>
                <input
                  id="exam-code"
                  type="text"
                  formControlName="code"
                  autocomplete="off"
                  spellcheck="false"
                  [attr.aria-invalid]="isInvalid('code')"
                  [attr.aria-describedby]="isInvalid('code') ? 'exam-code-error' : null"
                  class="h-14 w-full rounded-xl border border-ios-surface-hover bg-white px-4
                         text-ios-fg-13 text-base transition-colors placeholder:text-ios-fg-7
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  [placeholder]="lang.t('assessments.verify.codePlaceholder')"
                />
                @if (isInvalid('code')) {
                  <p
                    id="exam-code-error"
                    class="text-sm font-medium text-ios-danger-mid"
                    aria-live="polite"
                  >
                    {{ lang.t('assessments.verify.codeRequired') }}
                  </p>
                }
              </div>

              <!-- Full name (attestation) -->
              <div class="flex flex-col gap-2">
                <label for="exam-name" class="text-base font-semibold text-ios-fg-11">
                  {{ lang.t('assessments.verify.nameLabel') }}
                </label>
                <input
                  id="exam-name"
                  type="text"
                  formControlName="fullName"
                  autocomplete="name"
                  dir="auto"
                  [attr.aria-invalid]="isInvalid('fullName')"
                  [attr.aria-describedby]="isInvalid('fullName') ? 'exam-name-error' : null"
                  class="h-14 w-full rounded-xl border border-ios-surface-hover bg-white px-4
                         text-ios-fg-13 text-base transition-colors placeholder:text-ios-fg-7
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                />
                @if (isInvalid('fullName')) {
                  <p
                    id="exam-name-error"
                    class="text-sm font-medium text-ios-danger-mid"
                    aria-live="polite"
                  >
                    {{ lang.t('assessments.verify.nameRequired') }}
                  </p>
                }
              </div>

              <!-- ID number (optional) -->
              <div class="flex flex-col gap-2">
                <label for="exam-id" class="text-base font-semibold text-ios-fg-11">
                  {{ lang.t('assessments.verify.idLabel') }}
                </label>
                <input
                  id="exam-id"
                  type="text"
                  formControlName="idNumber"
                  autocomplete="off"
                  class="h-14 w-full rounded-xl border border-ios-surface-hover bg-white px-4
                         text-ios-fg-13 text-base transition-colors placeholder:text-ios-fg-7
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                />
              </div>

              @if (errorMessage()) {
                <p
                  class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
                  role="alert"
                >
                  {{ errorMessage() }}
                </p>
              }

              <button
                type="submit"
                [disabled]="submitting()"
                class="flex h-14 w-full items-center justify-center rounded-xl
                       bg-ios-brand-primary text-ios-brand-primary-soft font-semibold text-lg
                       transition-colors hover:bg-ios-brand-primary-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-brand-primary/50
                       disabled:opacity-50 disabled:pointer-events-none"
              >
                {{
                  submitting()
                    ? lang.t('assessments.verify.validating')
                    : lang.t('assessments.verify.continue')
                }}
              </button>
            </form>
          </div>
        </main>

        <ios-auth-footer />
      </div>
    </div>
  `,
})
export class ExamVerifyPage {
  protected readonly lang = inject(LanguageService);
  private readonly api = inject(ExamApi);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    code: this.fb.control('', { validators: [Validators.required] }),
    fullName: this.fb.control('', { validators: [Validators.required] }),
    idNumber: this.fb.control(''),
  });

  protected readonly submitting = signal(false);
  private readonly _error = signal<string | null>(null);
  protected readonly errorMessage = this._error.asReadonly();

  protected isInvalid(control: 'code' | 'fullName'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  protected async onSubmit(): Promise<void> {
    this._error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // `idNumber` is collected as an attestation but not sent — the
    // pre-exam-confirmation call needs a certId the FE cannot obtain here (BE-I-24).
    const { code, fullName } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      const preview = await firstValueFrom(this.api.validateAccess(code.trim()));
      const state: ExamReadyNavState = {
        code: code.trim(),
        examId: preview.exam.id,
        examTitle: preview.exam.title,
        durationMinutes: preview.exam.durationMinutes,
        fullName: fullName.trim() || undefined,
      };
      await this.router.navigate(['/assessments/ready'], { state });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        this._error.set(this.lang.t('assessments.verify.invalidCode'));
      } else {
        this._error.set(
          problemDetailMessage(err) ?? this.lang.t('assessments.verify.genericError'),
        );
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

export default ExamVerifyPage;
