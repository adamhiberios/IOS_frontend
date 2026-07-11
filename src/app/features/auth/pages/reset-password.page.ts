/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '@core/auth';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Button, IconButton, Input as IosInput, WarningCard } from '@ui';

/**
 * Forgot-password page — requests a reset link via `POST /auth/forgot-password`.
 *
 * The backend always responds 200 (anti-enumeration), so a successful call
 * always shows the same "check your email" confirmation regardless of whether
 * the address is registered.
 *
 * Composition:
 *   - `<ios-auth-header>` and `<ios-auth-footer>` from `@layouts/auth-shell`
 *   - `<ios-input>`, `<ios-accent-bars>`, `<ios-warning-card>` from `@ui`
 */
@Component({
  selector: 'ios-reset-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthHeader,
    AuthFooter,
    AccentBars,
    Button,
    IconButton,
    IosInput,
    WarningCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars [showEnd]="false" top="15.5rem" />
        <section class="w-full z-2 max-w-xl bg-white border border-gray-200 rounded-xl p-6 md:p-8">
          <!-- Back Button + Header -->
          <div class="flex items-start gap-4 mb-6">
            <ios-icon-button
              variant="filled"
              size="md"
              [ariaLabel]="lang.t('common.back')"
              routerLink="/auth/login"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </ios-icon-button>
            <div>
              <h1 class="text-3xl font-bold text-ios-brand-dark">
                {{ lang.t('auth.resetPassword.title') }}
              </h1>
              <p class="text-base text-gray-500 mt-1">
                {{ lang.t('auth.resetPassword.subtitle') }}
              </p>
            </div>
          </div>

          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            novalidate
            class="flex flex-col gap-6"
            aria-labelledby="reset-heading"
          >
            <h2 id="reset-heading" class="sr-only absolute w-px h-px -m-px overflow-hidden clip-0">
              {{ lang.t('auth.resetPassword.title') }}
            </h2>

            <!-- Warning Card -->
            <ios-warning-card>
              {{ lang.t('auth.resetPassword.warningText') }}
            </ios-warning-card>

            <!-- Email -->
            <ios-input
              id="email"
              [label]="lang.t('auth.resetPassword.emailLabel')"
              type="email"
              [control]="form.controls.email"
              [placeholder]="lang.t('auth.resetPassword.emailPlaceholder')"
              [errorText]="hasError() ? lang.t('auth.resetPassword.emailError') : ''"
            />

            <!-- Submit Button -->
            <ios-button
              type="submit"
              variant="primary"
              [fullWidth]="true"
              [loading]="submitState() === 'pending'"
            >
              {{ lang.t('auth.resetPassword.submit') }}
            </ios-button>

            @if (submitState() === 'submitted') {
              <p class="text-center text-green-600 text-sm p-3 bg-green-50 rounded-lg">
                {{ lang.t('auth.resetPassword.successMessage') }}
              </p>
            }

            @if (errorMessage()) {
              <p
                class="text-center text-red-600 text-sm p-3 bg-red-50 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                {{ errorMessage() }}
              </p>
            }
          </form>

          <p class="text-center text-xs text-gray-400 mt-6">
            {{ lang.t('common.copyright') }}
          </p>
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly lang = inject(LanguageService);
  protected readonly submitState = signal<'idle' | 'pending' | 'submitted'>('idle');
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.group({
    email: this.fb.control('', {
      validators: [Validators.required, Validators.email],
    }),
  });

  protected hasError = (): boolean => {
    const control = this.form.controls.email;
    return !!(control?.invalid && control?.touched);
  };

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitState.set('pending');
    this.errorMessage.set('');
    this.authApi.requestPasswordReset(this.form.controls.email.value).subscribe({
      next: () => this.submitState.set('submitted'),
      error: (err: unknown) => {
        this.submitState.set('idle');
        this.errorMessage.set(problemDetailMessage(err) ?? this.lang.t('auth.errors.unknownError'));
      },
    });
  }
}

export default ResetPasswordPage;
