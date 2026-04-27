/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Input as IosInput, WarningCard } from '@ui';

/**
 * Reset Password page (EPIC 3 — UI only, backend mocked).
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
            <a
              routerLink="/auth/login"
              class="flex items-center justify-center w-11 h-11 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              aria-label="Go back"
            >
              <svg
                class="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </a>
            <div>
              <h1 class="text-3xl font-bold text-ios-brand-dark">Reset Password</h1>
              <p class="text-base text-gray-500 mt-1">
                Please enter your email to continue Reset Password
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
              Reset password form
            </h2>

            <!-- Warning Card -->
            <ios-warning-card> Will send link to reset password </ios-warning-card>

            <!-- Email -->
            <ios-input
              id="email"
              label="Email"
              type="email"
              [control]="form.controls.email"
              placeholder="Email"
              [errorText]="hasError() ? 'Email required' : ''"
            />

            <!-- Submit Button -->
            <button
              type="submit"
              class="w-full h-14 bg-red-800 text-white text-base font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Continue
            </button>

            @if (mockSubmitState() === 'submitted') {
              <p class="text-center text-green-600 text-sm p-3 bg-green-50 rounded-lg">
                Reset link sent! Check your email. (Mock)
              </p>
            }
          </form>

          <p class="text-center text-xs text-gray-400 mt-6">
            © 2026 Institute of Scrum. All rights reserved.
          </p>
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly mockSubmitState = signal<'idle' | 'pending' | 'submitted'>('idle');

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
    this.mockSubmitState.set('pending');
    queueMicrotask(() => this.mockSubmitState.set('submitted'));
  }
}

export default ResetPasswordPage;
