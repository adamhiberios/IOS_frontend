/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Button, IconButton, Input as IosInput, PasswordStrength } from '@ui';

import { matchFieldsValidator } from '../utils/match-fields.validator';
import {
  STRONG_PASSWORD_MIN_LENGTH,
  strongPasswordValidator,
} from '../utils/strong-password.validator';

/**
 * New Password page (EPIC 3 — UI only, backend mocked).
 *
 * Composition:
 *   - `<ios-auth-header>` and `<ios-auth-footer>` from `@layouts/auth-shell`
 *   - `<ios-input>`, `<ios-accent-bars>`, `<ios-password-strength>` from `@ui`
 */
@Component({
  selector: 'ios-new-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthHeader,
    AuthFooter,
    AccentBars,
    Button,
    IconButton,
    IosInput,
    PasswordStrength,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars [showEnd]="false" top="13.5rem" />
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
                {{ lang.t('auth.newPassword.title') }}
              </h1>
              <p class="text-base text-gray-500 mt-1">
                {{ lang.t('auth.newPassword.subtitle') }}
              </p>
            </div>
          </div>

          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            novalidate
            class="flex flex-col gap-4"
            aria-labelledby="newpass-heading"
          >
            <h2
              id="newpass-heading"
              class="sr-only absolute w-px h-px -m-px overflow-hidden clip-0"
            >
              {{ lang.t('auth.newPassword.title') }}
            </h2>

            <!-- New Password -->
            <ios-input
              id="password"
              [label]="lang.t('auth.newPassword.passwordLabel')"
              type="password"
              [control]="form.controls.password"
              [placeholder]="lang.t('auth.newPassword.passwordPlaceholder')"
            />

            <!-- Password Strength -->
            <ios-password-strength class="mb-2" [rules]="passwordRules()" />

            <!-- Confirm Password -->
            <ios-input
              id="confirmPassword"
              [label]="lang.t('auth.newPassword.confirmLabel')"
              type="password"
              [control]="form.controls.confirmPassword"
              [placeholder]="lang.t('auth.newPassword.confirmPlaceholder')"
              [errorText]="
                hasError('confirmPassword', 'mismatch')
                  ? lang.t('auth.newPassword.confirmMismatch')
                  : ''
              "
            />

            <!-- Submit Button -->
            <ios-button
              type="submit"
              variant="primary"
              [fullWidth]="true"
              [loading]="mockSubmitState() === 'pending'"
              class="mt-2"
            >
              {{ lang.t('auth.newPassword.submit') }}
            </ios-button>
          </form>

          <p class="text-center text-xs text-gray-400 mt-6">
            {{ lang.t('common.copyright') }}
          </p>
        </section>
      </main>

      <!-- Success Popup -->
      @if (showPopup()) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-title"
        >
          <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
            <div class="flex flex-col items-center gap-6">
              <!-- Success Icon -->
              <div class="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center">
                <svg
                  class="w-20 h-20 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <!-- Title -->
              <h2 id="popup-title" class="text-2xl font-semibold text-center text-gray-800">
                {{ lang.t('auth.newPassword.popupTitle') }}
              </h2>

              <!-- Button -->
              <ios-button variant="primary" [fullWidth]="true" (clicked)="goToLogin()">
                {{ lang.t('auth.newPassword.popupButton') }}
              </ios-button>
            </div>
          </div>
        </div>
      }

      <ios-auth-footer />
    </div>
  `,
})
export class NewPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly lang = inject(LanguageService);
  protected readonly mockSubmitState = signal<'idle' | 'pending' | 'submitted'>('idle');
  protected readonly showPopup = signal(false);

  protected readonly form = this.fb.group(
    {
      password: this.fb.control('', {
        validators: [Validators.required, strongPasswordValidator()],
      }),
      confirmPassword: this.fb.control('', {
        validators: [Validators.required],
      }),
    },
    {
      validators: [matchFieldsValidator('password', 'confirmPassword')],
    },
  );

  private readonly passwordValue = toSignal(
    this.form.controls.password.valueChanges.pipe(startWith(this.form.controls.password.value)),
    { initialValue: this.form.controls.password.value },
  );

  protected readonly passwordRules = computed(() => {
    const value = this.passwordValue() ?? '';
    return {
      minLength: value.length >= STRONG_PASSWORD_MIN_LENGTH,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      digit: /[0-9]/.test(value),
      special: /[!@#$%^&*]/.test(value),
    };
  });

  protected hasError = (controlName: string, errorKey: string): boolean => {
    const control = this.form.get(controlName);
    return !!(control?.touched && control.hasError(errorKey));
  };

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.mockSubmitState.set('pending');
    queueMicrotask(() => {
      this.mockSubmitState.set('submitted');
      this.showPopup.set(true);
    });
  }

  protected goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }
}

export default NewPasswordPage;
