/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApi } from '@core/auth';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Button, Input as IosInput } from '@ui';

/**
 * `ios-verify-email-page` — completes email verification from the registration
 * email link (`POST /auth/verify-email`, `?token=`), and offers a resend form
 * (`POST /auth/resend-verification`) when the token is missing/expired/used.
 *
 * ⚠️ Touches `core/auth` (adds `AuthApi.verifyEmail`) — flagged for architect +
 * security review per CLAUDE §8/§13, though it only wires an existing endpoint
 * and never handles tokens/passwords in storage.
 */
@Component({
  selector: 'ios-verify-email-page',
  imports: [ReactiveFormsModule, RouterLink, AuthHeader, AuthFooter, AccentBars, Button, IosInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars [showEnd]="false" top="15.5rem" />
        <section class="w-full z-2 max-w-xl bg-white border border-gray-200 rounded-xl p-6 md:p-8">
          @switch (status()) {
            @case ('verifying') {
              <div class="flex flex-col items-center gap-4 py-8 text-center" aria-live="polite">
                <div
                  class="w-10 h-10 rounded-full border-4 border-ios-surface-hover border-t-ios-brand-primary animate-spin"
                  aria-hidden="true"
                ></div>
                <p class="text-ios-fg-10 font-medium">{{ lang.t('auth.verifyEmail.verifying') }}</p>
              </div>
            }
            @case ('success') {
              <div class="flex flex-col items-center gap-4 py-6 text-center" role="status">
                <div
                  class="flex items-center justify-center w-14 h-14 rounded-full bg-green-100"
                  aria-hidden="true"
                >
                  <svg
                    class="w-7 h-7 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 class="text-xl font-bold text-ios-fg-13">
                  {{ lang.t('auth.verifyEmail.successTitle') }}
                </h1>
                <p class="text-ios-fg-8">{{ lang.t('auth.verifyEmail.successBody') }}</p>
                <a
                  routerLink="/auth/login"
                  [queryParams]="{ verified: 1 }"
                  class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-ios-brand-primary
                         px-6 font-semibold text-ios-brand-primary-soft transition-colors
                         hover:bg-ios-brand-primary-hover focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-offset-2 focus-visible:ring-ios-brand-primary/50"
                  >{{ lang.t('auth.verifyEmail.goToLogin') }}</a
                >
              </div>
            }
            @default {
              <!-- Missing / invalid / expired token → offer a resend. -->
              <div class="flex flex-col gap-2 mb-6 text-center">
                <h1 class="text-xl font-bold text-ios-fg-13">
                  {{ lang.t('auth.verifyEmail.invalidTitle') }}
                </h1>
                <p class="text-ios-fg-8">
                  {{ errorMessage() ?? lang.t('auth.verifyEmail.invalidBody') }}
                </p>
              </div>

              @if (resendState() === 'sent') {
                <p
                  class="text-center text-green-600 text-sm p-3 bg-green-50 rounded-lg"
                  role="status"
                >
                  {{ lang.t('auth.verifyEmail.resendSent') }}
                </p>
              } @else {
                <form
                  [formGroup]="form"
                  (ngSubmit)="onResend()"
                  class="flex flex-col gap-4"
                  novalidate
                >
                  <ios-input
                    id="verify-email"
                    [label]="lang.t('auth.verifyEmail.emailLabel')"
                    type="email"
                    [control]="form.controls.email"
                    [placeholder]="lang.t('auth.verifyEmail.emailPlaceholder')"
                    [errorText]="emailInvalid() ? lang.t('auth.verifyEmail.emailError') : ''"
                  />
                  <ios-button
                    type="submit"
                    variant="primary"
                    [fullWidth]="true"
                    [loading]="resendState() === 'pending'"
                  >
                    {{ lang.t('auth.verifyEmail.resend') }}
                  </ios-button>
                </form>
              }

              <p class="text-center text-sm text-ios-fg-8 mt-6">
                <a
                  routerLink="/auth/login"
                  class="text-ios-brand-primary-mid font-medium hover:underline"
                >
                  {{ lang.t('auth.verifyEmail.backToLogin') }}
                </a>
              </p>
            }
          }
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class VerifyEmailPage {
  protected readonly lang = inject(LanguageService);
  private readonly authApi = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly status = signal<'verifying' | 'success' | 'invalid'>('verifying');
  private readonly _error = signal<string | null>(null);
  protected readonly errorMessage = this._error.asReadonly();
  protected readonly resendState = signal<'idle' | 'pending' | 'sent'>('idle');

  protected readonly form = this.fb.group({
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
  });

  protected emailInvalid(): boolean {
    const c = this.form.controls.email;
    return c.invalid && (c.touched || c.dirty);
  }

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      void this.verify(token);
    } else {
      // Landed here without a link — go straight to the resend affordance.
      this.status.set('invalid');
      this._error.set(this.lang.t('auth.verifyEmail.noTokenBody'));
    }
  }

  private async verify(token: string): Promise<void> {
    try {
      await firstValueFrom(this.authApi.verifyEmail(token));
      this.status.set('success');
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('auth.verifyEmail.invalidBody'));
      this.status.set('invalid');
    }
  }

  protected async onResend(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.resendState.set('pending');
    try {
      await firstValueFrom(this.authApi.resendVerification(this.form.controls.email.value));
      this.resendState.set('sent');
    } catch (err) {
      // Anti-enumeration: the backend responds identically whether or not the
      // address exists; a genuine transport error lets the user retry.
      this._error.set(problemDetailMessage(err) ?? this.lang.t('auth.verifyEmail.genericError'));
      this.resendState.set('idle');
    }
  }
}

export default VerifyEmailPage;
