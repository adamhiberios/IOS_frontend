/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { interval, map } from 'rxjs';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Button, Input as IosInput, SectionBadge } from '@ui';

/**
 * Admin sign-in page — `POST /auth/admin/login` via `AuthStore.loginAdmin`, with
 * the two-step **OTP** flow when the backend has `ADMIN_OTP_ENABLED` (C1):
 * password → (if challenged) 6-digit emailed code → `AuthStore.verifyAdminOtp`.
 *
 * ⚠️ Auth-flow surface (`core/auth`) — architect + security review required
 * before shipping (CLAUDE §8/§13). No token/challenge is ever stored outside the
 * in-memory `AuthStore`; a failed/abandoned OTP leaves no partial session.
 *
 * Staff-only entry at `/admin/login`: no registration/social/reset self-service.
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
        <ios-accent-bars top="14rem" />
        <section class="w-full z-2 max-w-xl bg-white border border-gray-200 rounded-xl p-6 md:p-8">
          @if (auth.otpChallenge(); as challenge) {
            <!-- ── Step 2: OTP code ─────────────────────────────────────── -->
            <header class="mb-6">
              <ios-section-badge
                class="mb-3 inline-block"
                variant="muted-light"
                [text]="lang.t('admin.login.badge')"
              />
              <h1 class="text-2xl font-bold text-ios-brand-dark">
                {{ lang.t('admin.otp.title') }}
              </h1>
              <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.otp.subtitle') }}</p>
            </header>

            <form
              [formGroup]="otpForm"
              (ngSubmit)="onVerify()"
              novalidate
              class="flex flex-col gap-4"
            >
              <ios-input
                id="otp-code"
                [label]="lang.t('admin.otp.codeLabel')"
                type="text"
                autocomplete="one-time-code"
                [control]="otpForm.controls.code"
                [placeholder]="lang.t('admin.otp.codePlaceholder')"
                [errorText]="hasOtpError() ? lang.t('admin.otp.codeError') : ''"
              />

              @if (secondsLeft() > 0) {
                <p class="text-sm text-gray-500" aria-live="polite">
                  {{ lang.t('admin.otp.expiresIn', { seconds: secondsLeft() }) }}
                </p>
              } @else {
                <p class="text-sm text-red-700" role="alert">{{ lang.t('admin.otp.expired') }}</p>
              }

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
                {{ lang.t('admin.otp.verify') }}
              </ios-button>

              <button
                type="button"
                (click)="onBackToPassword()"
                class="text-sm text-ios-brand-primary-mid font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40 rounded"
              >
                {{ lang.t('admin.otp.back') }}
              </button>
            </form>
          } @else {
            <!-- ── Step 1: email + password ─────────────────────────────── -->
            <header class="mb-6">
              <ios-section-badge
                class="mb-3 inline-block"
                variant="muted-light"
                [text]="lang.t('admin.login.badge')"
              />
              <h1 class="text-2xl font-bold text-ios-brand-dark">
                {{ lang.t('admin.login.title') }}
              </h1>
              <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.login.subtitle') }}</p>
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

              <ios-input
                id="email"
                [label]="lang.t('admin.login.emailLabel')"
                type="email"
                autocomplete="username"
                [control]="form.controls.email"
                [placeholder]="lang.t('admin.login.emailPlaceholder')"
                [errorText]="hasError('email') ? lang.t('admin.login.emailError') : ''"
              />

              <ios-input
                id="password"
                [label]="lang.t('admin.login.passwordLabel')"
                type="password"
                autocomplete="current-password"
                [control]="form.controls.password"
                [placeholder]="lang.t('admin.login.passwordPlaceholder')"
                [errorText]="hasError('password') ? lang.t('admin.login.passwordError') : ''"
              />

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
          }

          <p class="text-center text-xs text-gray-400 mt-6">{{ lang.t('common.copyright') }}</p>
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class AdminLoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly lang = inject(LanguageService);

  protected readonly form = this.fb.group({
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    password: this.fb.control('', { validators: [Validators.required] }),
  });

  protected readonly otpForm = this.fb.group({
    code: this.fb.control('', { validators: [Validators.required, Validators.pattern(/^\d{6}$/)] }),
  });

  protected readonly isPending = computed(() => this.auth.submitState().status === 'pending');
  protected readonly errorMessage = computed(() => {
    const s = this.auth.submitState();
    return s.status === 'error' ? s.message : '';
  });

  /** Where the admin was trying to go before the admin gate redirected them. */
  private readonly returnUrl = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('returnUrl'))),
    {
      initialValue: null,
    },
  );

  // ── OTP countdown ──────────────────────────────────────────────────────────
  private readonly uiTick = toSignal(interval(1000), { initialValue: 0 });
  private otpDeadlineMs = 0;
  protected readonly secondsLeft = computed(() => {
    this.uiTick(); // re-evaluate each second
    if (!this.auth.otpChallenge()) return 0;
    return Math.max(0, Math.ceil((this.otpDeadlineMs - Date.now()) / 1000));
  });

  constructor() {
    // Anchor the countdown whenever a fresh challenge arrives (depends only on the
    // challenge, so it does not re-run every tick).
    effect(() => {
      const challenge = this.auth.otpChallenge();
      if (challenge) this.otpDeadlineMs = Date.now() + challenge.expiresInSeconds * 1000;
    });
  }

  protected hasError = (controlName: 'email' | 'password'): boolean => {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  };

  protected hasOtpError(): boolean {
    const c = this.otpForm.controls.code;
    return c.invalid && (c.touched || c.dirty);
  }

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

  protected onVerify(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    void this.auth.verifyAdminOtp(this.otpForm.controls.code.value).catch(() => {
      /* error already surfaced via AuthStore.submitState() */
    });
  }

  protected onBackToPassword(): void {
    this.otpForm.reset();
    this.auth.cancelAdminOtp();
  }
}

export default AdminLoginPage;
