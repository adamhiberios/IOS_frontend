/* eslint-disable @typescript-eslint/unbound-method --
 * Angular's `Validators.*` are class statics; passing them by reference here is
 * the canonical Reactive Forms idiom. The unbound-method rule cannot tell them
 * apart from real instance method leaks.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs/operators';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import {
  AccentBars,
  Button,
  Checkbox,
  Dropdown,
  Input as IosInput,
  PasswordStrength,
  SocialButton,
  WarningCard,
  type SocialProvider,
} from '@ui';

import { matchFieldsValidator } from '../utils/match-fields.validator';
import {
  STRONG_PASSWORD_MIN_LENGTH,
  strongPasswordValidator,
} from '../utils/strong-password.validator';

/** Country / region options. Replace with API resolver once auth API ships. */
const COUNTRIES: readonly { code: string; name: string }[] = [
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'EG', name: 'Egypt' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'QA', name: 'Qatar' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

const SOCIALS: readonly SocialProvider[] = ['google', 'apple', 'linkedin'];

/**
 * Register page (EPIC 3 — UI only, backend mocked).
 *
 * Composition:
 *   - `<ios-auth-header>` and `<ios-auth-footer>` from `@layouts/auth-shell`
 *   - `<ios-input>`, `<ios-warning-card>`, `<ios-password-strength>`,
 *     `<ios-social-button>` from `@ui`
 */
@Component({
  selector: 'ios-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthHeader,
    AuthFooter,
    AccentBars,
    Button,
    Checkbox,
    Dropdown,
    IosInput,
    WarningCard,
    PasswordStrength,
    SocialButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars />
        <section
          class="w-full z-[2] max-w-xl bg-white border border-gray-200 rounded-xl p-6 md:p-8"
        >
          <header class="mb-6">
            <h1 class="text-2xl font-bold text-ios-brand-dark">
              {{ lang.t('auth.register.title') }}
            </h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ lang.t('auth.register.subtitle') }}
            </p>
          </header>

          <ios-warning-card class="block mb-5">
            {{ lang.t('auth.register.nameCertWarning.pre')
            }}<strong>{{ lang.t('auth.register.nameCertWarning.bold') }}</strong
            >{{ lang.t('auth.register.nameCertWarning.post') }}
          </ios-warning-card>

          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            novalidate
            class="flex flex-col gap-4"
            aria-labelledby="register-heading"
          >
            <h2 id="register-heading" class="sr-only">{{ lang.t('auth.register.title') }}</h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ios-input
                id="firstName"
                [label]="lang.t('auth.register.firstNameLabel')"
                [placeholder]="lang.t('auth.register.firstNamePlaceholder')"
                autocomplete="given-name"
                [required]="true"
                [control]="form.controls.firstName"
                [errorText]="lang.t('auth.register.firstNameError')"
              />
              <ios-input
                id="lastName"
                [label]="lang.t('auth.register.lastNameLabel')"
                [placeholder]="lang.t('auth.register.lastNamePlaceholder')"
                autocomplete="family-name"
                [required]="true"
                [control]="form.controls.lastName"
                [errorText]="lang.t('auth.register.lastNameError')"
              />
            </div>

            <div class="flex flex-col">
              <ios-dropdown
                id="country"
                [label]="lang.t('auth.register.countryLabel')"
                [options]="countryOptions"
                [placeholder]="lang.t('auth.register.countryPlaceholder')"
                [required]="true"
                [value]="form.controls.country.value"
                (valueChange)="form.controls.country.setValue($event)"
              />
              @if (hasError('country', 'required')) {
                <p role="alert" class="mt-1 text-xs text-ios-brand-primary">
                  {{ lang.t('auth.register.countryError') }}
                </p>
              }
            </div>

            <ios-input
              id="username"
              [label]="lang.t('auth.register.usernameLabel')"
              [placeholder]="lang.t('auth.register.usernamePlaceholder')"
              autocomplete="username"
              [required]="true"
              [control]="form.controls.username"
              [errorText]="usernameErrorText()"
            />

            <ios-input
              id="email"
              [label]="lang.t('auth.register.emailLabel')"
              type="email"
              [placeholder]="lang.t('auth.register.emailPlaceholder')"
              autocomplete="email"
              [required]="true"
              [control]="form.controls.email"
              [errorText]="emailErrorText()"
            />

            <div class="flex flex-col">
              <ios-input
                id="password"
                [label]="lang.t('auth.register.passwordLabel')"
                type="password"
                [placeholder]="lang.t('auth.register.passwordPlaceholder')"
                autocomplete="new-password"
                [required]="true"
                [control]="form.controls.password"
                [errorText]="passwordErrorText()"
              />
              <ios-password-strength class="mt-2" [rules]="passwordRules()" />
            </div>

            <ios-input
              id="confirmPassword"
              [label]="lang.t('auth.register.confirmPasswordLabel')"
              type="password"
              [placeholder]="lang.t('auth.register.confirmPasswordPlaceholder')"
              autocomplete="new-password"
              [required]="true"
              [control]="form.controls.confirmPassword"
              [errorText]="confirmPasswordErrorText()"
            />

            <div class="flex flex-col gap-2 mt-2">
              <ios-checkbox id="newsletter" formControlName="newsletter">
                {{ lang.t('auth.register.newsletter') }}
              </ios-checkbox>

              <ios-checkbox
                id="privacy"
                formControlName="privacy"
                [describedBy]="hasError('privacy', 'required') ? 'privacy-error' : ''"
              >
                {{ lang.t('auth.register.privacy') }}
                <a
                  routerLink="/privacy"
                  class="underline font-medium text-ios-brand-primary"
                  target="_blank"
                  rel="noopener"
                  >{{ lang.t('auth.register.privacyLink') }}</a
                >.
              </ios-checkbox>
              @if (hasError('privacy', 'required')) {
                <p id="privacy-error" role="alert" class="text-xs text-ios-brand-primary">
                  {{ lang.t('auth.register.privacyRequired') }}
                </p>
              }
            </div>

            @if (errorMessage()) {
              <p
                role="alert"
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
              {{ lang.t('auth.register.submit') }}
            </ios-button>
          </form>

          <div class="flex items-center gap-3 my-5">
            <span class="flex-1 h-px bg-gray-200"></span>
            <span class="text-sm text-gray-500 whitespace-nowrap">
              {{ lang.t('common.orContinueWith') }}
            </span>
            <span class="flex-1 h-px bg-gray-200"></span>
          </div>

          <ul class="flex justify-center gap-4" aria-label="Continue with a social provider">
            @for (provider of socials; track provider) {
              <li>
                <ios-social-button [provider]="provider" (selected)="onSocialSelect($event)" />
              </li>
            }
          </ul>

          <p class="text-center text-sm text-gray-600 mt-6">
            {{ lang.t('auth.register.hasAccount') }}
            <a routerLink="/auth/login" class="text-ios-brand-primary font-medium underline">
              {{ lang.t('auth.register.loginLink') }}
            </a>
          </p>
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class RegisterPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly lang = inject(LanguageService);
  protected readonly countryOptions: { value: string; label: string }[] = COUNTRIES.map((c) => ({
    value: c.code,
    label: c.name,
  }));
  protected readonly socials = SOCIALS;
  protected readonly minLength = STRONG_PASSWORD_MIN_LENGTH;

  protected readonly form = this.fb.group(
    {
      firstName: this.fb.control('', { validators: [Validators.required] }),
      lastName: this.fb.control('', { validators: [Validators.required] }),
      country: this.fb.control('', { validators: [Validators.required] }),
      username: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
      }),
      email: this.fb.control('', {
        validators: [Validators.required, Validators.email],
      }),
      password: this.fb.control('', {
        validators: [Validators.required, strongPasswordValidator()],
      }),
      confirmPassword: this.fb.control('', {
        validators: [Validators.required],
      }),
      newsletter: this.fb.control(false),
      privacy: this.fb.control(false, {
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: [matchFieldsValidator('password', 'confirmPassword')] },
  );

  /** Bridges the password value to a signal so OnPush re-renders cleanly
   * (zoneless change detection — see CLAUDE.md §3). */
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
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value),
    };
  });

  protected readonly submitted = signal(false);

  /** UI bindings derived from the AuthStore submit-state machine. */
  protected readonly isPending = computed(() => this.auth.submitState().status === 'pending');
  protected readonly errorMessage = computed(() => {
    const s = this.auth.submitState();
    return s.status === 'error' ? s.message : '';
  });

  /* ------------------------------------------------------------------------
   * Per-field error text helpers. Reads from LanguageService so they are
   * reactive to locale changes.
   * ---------------------------------------------------------------------- */

  protected readonly usernameErrorText = computed(() => {
    const c = this.form.controls.username;
    if (c.hasError('required')) return this.lang.t('auth.register.usernameRequired');
    if (c.hasError('minlength')) return this.lang.t('auth.register.usernameMinLength');
    return '';
  });

  protected readonly emailErrorText = computed(() => {
    const c = this.form.controls.email;
    if (c.hasError('required')) return this.lang.t('auth.register.emailRequired');
    if (c.hasError('email')) return this.lang.t('auth.register.emailInvalid');
    return '';
  });

  protected readonly passwordErrorText = computed(() => {
    const c = this.form.controls.password;
    if (c.hasError('required')) return this.lang.t('auth.register.passwordRequired');
    if (c.hasError('strongPassword')) return this.lang.t('auth.register.passwordWeak');
    return '';
  });

  protected readonly confirmPasswordErrorText = computed(() => {
    const c = this.form.controls.confirmPassword;
    if (c.hasError('required')) return this.lang.t('auth.register.confirmPasswordRequired');
    if (c.hasError('mismatch')) return this.lang.t('auth.register.confirmPasswordMismatch');
    return '';
  });

  protected hasError(controlName: string, errorKey: string): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;
    const exposed = control.touched || control.dirty || this.submitted();
    return exposed && control.hasError(errorKey);
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    void this.auth
      .register({
        firstName: v.firstName,
        lastName: v.lastName,
        country: v.country,
        username: v.username,
        email: v.email,
        password: v.password,
        newsletter: v.newsletter,
      })
      .catch(() => {
        /* error already in AuthStore.submitState() */
      });
  }

  protected onSocialSelect(_provider: SocialProvider): void {
    // Mocked — real OAuth handoff lands with the auth API in a later task.
  }
}

export default RegisterPage;
