/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Button, Input as IosInput, SectionBadge } from '@ui';

/**
 * Admin sign-in page — `POST /auth/admin/login` via `AuthStore.loginAdmin`.
 *
 * Staff-only entry point at `/admin/login` (outside the learner `/auth/*` flow):
 * no registration, no social login, no password-reset self-service — admin
 * accounts are provisioned internally (see `docs/backend-analysis.md` §5.2).
 * Reuses the shared auth shell + design-system primitives for visual parity
 * with the rest of the app.
 */
@Component({
  selector: 'ios-admin-login-page',
  imports: [
    ReactiveFormsModule,
    AuthHeader,
    AuthFooter,
    AccentBars,
    IosInput,
    Button,
    SectionBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars top="10.4rem" />
        <section class="w-full z-2 max-w-xl bg-white border border-gray-200 rounded-xl p-6 md:p-8">
          <header class="mb-6">
            <ios-section-badge
              class="mb-3 inline-block"
              variant="muted-light"
              [text]="lang.t('admin.login.badge')"
            />
            <h1 class="text-2xl font-bold text-ios-brand-dark">
              {{ lang.t('admin.login.title') }}
            </h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ lang.t('admin.login.subtitle') }}
            </p>
          </header>

          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            novalidate
            class="flex flex-col gap-4"
            aria-labelledby="admin-login-heading"
          >
            <h2
              id="admin-login-heading"
              class="sr-only absolute w-px h-px -m-px overflow-hidden clip-0"
            >
              {{ lang.t('admin.login.title') }}
            </h2>

            <!-- Email -->
            <ios-input
              id="email"
              [label]="lang.t('admin.login.emailLabel')"
              type="email"
              autocomplete="username"
              [control]="form.controls.email"
              [placeholder]="lang.t('admin.login.emailPlaceholder')"
              [errorText]="hasError('email') ? lang.t('admin.login.emailError') : ''"
            />

            <!-- Password -->
            <ios-input
              id="password"
              [label]="lang.t('admin.login.passwordLabel')"
              type="password"
              autocomplete="current-password"
              [control]="form.controls.password"
              [placeholder]="lang.t('admin.login.passwordPlaceholder')"
              [errorText]="hasError('password') ? lang.t('admin.login.passwordError') : ''"
            />

            <!-- Server-side error (invalid credentials, inactive account, etc.) -->
            @if (errorMessage()) {
              <p
                role="alert"
                aria-live="polite"
                class="text-sm p-2 rounded bg-red-50 text-red-700 border border-red-200"
              >
                {{ errorMessage() }}
              </p>
            }

            <ios-button
              type="submit"
              variant="primary"
              [fullWidth]="true"
              [loading]="isPending()"
              class="mt-2"
            >
              {{ lang.t('admin.login.submit') }}
            </ios-button>
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
export class AdminLoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly lang = inject(LanguageService);

  protected readonly form = this.fb.group({
    email: this.fb.control('', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.control('', {
      validators: [Validators.required],
    }),
  });

  protected readonly isPending = computed(() => this.auth.submitState().status === 'pending');
  protected readonly errorMessage = computed(() => {
    const s = this.auth.submitState();
    return s.status === 'error' ? s.message : '';
  });

  /** Where the admin was trying to go before the admin gate redirected them. */
  private readonly returnUrl = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('returnUrl'))),
    { initialValue: null },
  );

  protected hasError = (controlName: 'email' | 'password'): boolean => {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  };

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    void this.auth.loginAdmin({ identifier: email, password }, this.returnUrl()).catch(() => {
      /* error already surfaced via AuthStore.submitState() */
    });
  }
}

export default AdminLoginPage;
