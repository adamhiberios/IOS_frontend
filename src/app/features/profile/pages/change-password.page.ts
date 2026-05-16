/* eslint-disable @typescript-eslint/unbound-method */
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';
import { LucideArrowLeft, LucideEye, LucideEyeOff } from '@lucide/angular';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import {
  STRONG_PASSWORD_MIN_LENGTH,
  strongPasswordValidator,
} from '../../auth/utils/strong-password.validator';
import { matchFieldsValidator } from '../../auth/utils/match-fields.validator';
import { ProfileCancelEditDialog } from '../components/cancel-edit-dialog';
import { ProfilePasswordUpdatedDialog } from '../components/password-updated-dialog';
import { ProfileStore } from '../data-access/profile.store';

/**
 * `ios-change-password-page` — form for updating the user's password.
 *
 * Figma: node 13225-6209 (Change Password).
 *
 * Layout:
 *   ┌─ navbar ────────────────────────────────────────────────────────────┐
 *   ├─ breadcrumb: Dashboard / Profile / Change Password ─────────────── ┤
 *   │                                                                     │
 *   │  Password informations  ┌────────────────────────────────────────┐  │
 *   │                         │ Old Password                           │  │
 *   │                         │ New Password + strength meter          │  │
 *   │                         │ Confirm New Password                   │  │
 *   │                         └────────────────────────────────────────┘  │
 *   │                                 [Cancel] [Save information] ──── │
 *   ├─ footer ──────────────────────────────────────────────────────────┤
 *   └─────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-change-password-page',
  imports: [
    DashboardNavbar,
    ReactiveFormsModule,
    RouterLink,
    IosIcon,
    CanadaFlag,
    ProfileCancelEditDialog,
    ProfilePasswordUpdatedDialog,
  ],
  providers: [provideIcons(LucideArrowLeft, LucideEye, LucideEyeOff)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-[#f1f1f1]">
        <div class="max-w-[1400px] mx-auto px-8 h-[70px] flex items-center">
          <div class="flex items-center gap-4">
            <a
              routerLink="/dashboard/profile"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f1f1f1] text-[#272827] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none"
              [attr.aria-label]="lang.t('profile.breadcrumb.backToProfile')"
            >
              <ios-icon name="arrow-left" class="w-5 h-5" aria-hidden="true" />
            </a>
            <nav aria-label="Breadcrumb">
              <ol
                class="flex items-center gap-3 text-base leading-[1.4] whitespace-nowrap"
                role="list"
              >
                <li>
                  <a
                    routerLink="/dashboard"
                    class="font-medium text-[#666766] hover:text-[#141514] transition-colors"
                    >{{ lang.t('profile.breadcrumb.dashboard') }}</a
                  >
                </li>
                <li class="font-medium text-[#666766]" aria-hidden="true">/</li>
                <li>
                  <a
                    routerLink="/dashboard/profile"
                    class="font-medium text-[#666766] hover:text-[#141514] transition-colors"
                    >{{ lang.t('profile.breadcrumb.profile') }}</a
                  >
                </li>
                <li class="font-medium text-[#666766]" aria-hidden="true">/</li>
                <li>
                  <span class="font-semibold text-[#141514]" aria-current="page">{{
                    lang.t('profile.breadcrumb.changePassword')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          novalidate
          class="max-w-[1400px] mx-auto px-8 py-8 flex flex-col gap-6"
          [attr.aria-label]="lang.t('profile.changePassword.formLabel')"
        >
          <!-- ── Password informations ──────────────────────────────────── -->
          <section aria-labelledby="pwd-section-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="pwd-section-heading"
                class="text-[18px] font-semibold leading-[1.4] text-[#141514] w-[228px] shrink-0"
              >
                {{ lang.t('profile.changePassword.sectionHeading') }}
              </h2>

              <div class="flex-1 bg-[#f6f6f6] rounded-2xl p-6 flex flex-col gap-6">
                <!-- Old Password -->
                <div class="flex flex-col gap-1 h-[86px]">
                  <div class="flex items-center px-2">
                    <label
                      for="oldPassword"
                      class="text-[18px] font-semibold leading-[1.4] text-[#272827]"
                    >
                      {{ lang.t('profile.changePassword.oldPasswordLabel') }}
                    </label>
                  </div>
                  <div class="relative">
                    <div
                      class="bg-[#f6f6f6] border border-[#c4c5c4] rounded-lg p-4 flex items-center gap-2 focus-within:border-[#272827] transition-colors"
                      [class.border-ios-brand-primary]="
                        hasError('oldPassword', 'required') ||
                        hasError('oldPassword', 'wrongPassword')
                      "
                    >
                      <input
                        id="oldPassword"
                        [type]="showOld() ? 'text' : 'password'"
                        formControlName="oldPassword"
                        [placeholder]="lang.t('profile.changePassword.oldPasswordPlaceholder')"
                        class="flex-1 min-w-0 bg-transparent text-[18px] font-medium leading-[1.4] text-[#272827] placeholder:text-[#959695] outline-none focus:outline-none focus:shadow-none"
                        [attr.aria-describedby]="
                          hasError('oldPassword', 'required') ? 'oldPassword-error' : null
                        "
                        [attr.aria-invalid]="
                          hasError('oldPassword', 'required') ||
                          hasError('oldPassword', 'wrongPassword')
                            ? 'true'
                            : null
                        "
                      />
                      <button
                        type="button"
                        class="text-[#959695] hover:text-[#272827] transition-colors focus-visible:outline-none"
                        [attr.aria-label]="
                          showOld()
                            ? lang.t('profile.changePassword.hidePassword')
                            : lang.t('profile.changePassword.showPassword')
                        "
                        (click)="showOld.set(!showOld())"
                      >
                        <ios-icon
                          [name]="showOld() ? 'eye-off' : 'eye'"
                          class="w-5 h-5"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    @if (hasError('oldPassword', 'required')) {
                      <p
                        id="oldPassword-error"
                        role="alert"
                        class="mt-1 text-xs text-ios-brand-primary"
                      >
                        {{ lang.t('profile.changePassword.oldPasswordRequired') }}
                      </p>
                    }
                  </div>
                </div>

                <!-- New Password + strength meter -->
                <div class="flex flex-col gap-3">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center px-2">
                      <label
                        for="newPassword"
                        class="text-[18px] font-semibold leading-[1.4] text-[#272827]"
                      >
                        {{ lang.t('profile.changePassword.newPasswordLabel') }}
                      </label>
                    </div>
                    <div class="relative">
                      <div
                        class="bg-[#f6f6f6] border border-[#c4c5c4] rounded-lg p-4 flex items-center gap-2 focus-within:border-[#272827] transition-colors"
                        [class.border-ios-brand-primary]="
                          hasError('newPassword', 'required') ||
                          hasError('newPassword', 'weakPassword')
                        "
                      >
                        <input
                          id="newPassword"
                          [type]="showNew() ? 'text' : 'password'"
                          formControlName="newPassword"
                          [placeholder]="lang.t('profile.changePassword.newPasswordPlaceholder')"
                          class="flex-1 min-w-0 bg-transparent text-[18px] font-medium leading-[1.4] text-[#272827] placeholder:text-[#959695] outline-none focus:outline-none focus:shadow-none"
                          [attr.aria-describedby]="'pwd-hint newPassword-error'"
                          [attr.aria-invalid]="
                            hasError('newPassword', 'weakPassword') ? 'true' : null
                          "
                        />
                        <button
                          type="button"
                          class="text-[#959695] hover:text-[#272827] transition-colors focus-visible:outline-none"
                          [attr.aria-label]="
                            showNew()
                              ? lang.t('profile.changePassword.hidePassword')
                              : lang.t('profile.changePassword.showPassword')
                          "
                          (click)="showNew.set(!showNew())"
                        >
                          <ios-icon
                            [name]="showNew() ? 'eye-off' : 'eye'"
                            class="w-5 h-5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Strength meter — 4 bars matching Figma -->
                  <div class="flex gap-4 items-center" role="presentation" aria-hidden="true">
                    @for (bar of strengthBars(); track $index) {
                      <div
                        class="flex-1 h-2 rounded-full transition-colors duration-150"
                        [class]="bar"
                      ></div>
                    }
                  </div>

                  <!-- Hint text -->
                  <div class="px-2" id="pwd-hint">
                    <p class="text-[16px] font-medium leading-[1.4] text-[#959695]">
                      {{ lang.t('profile.changePassword.passwordHint') }}
                    </p>
                  </div>
                </div>

                <!-- Confirm New Password -->
                <div class="flex flex-col gap-1 h-[86px]">
                  <div class="flex items-center px-2">
                    <label
                      for="confirmPassword"
                      class="text-[18px] font-semibold leading-[1.4] text-[#272827]"
                    >
                      {{ lang.t('profile.changePassword.confirmPasswordLabel') }}
                    </label>
                  </div>
                  <div class="relative">
                    <div
                      class="bg-[#f6f6f6] border border-[#c4c5c4] rounded-lg p-4 flex items-center gap-2 focus-within:border-[#272827] transition-colors"
                      [class.border-ios-brand-primary]="hasError('confirmPassword', 'mismatch')"
                    >
                      <input
                        id="confirmPassword"
                        [type]="showConfirm() ? 'text' : 'password'"
                        formControlName="confirmPassword"
                        [placeholder]="lang.t('profile.changePassword.confirmPasswordPlaceholder')"
                        class="flex-1 min-w-0 bg-transparent text-[18px] font-medium leading-[1.4] text-[#272827] placeholder:text-[#959695] outline-none focus:outline-none focus:shadow-none"
                        [attr.aria-describedby]="
                          hasError('confirmPassword', 'mismatch') ? 'confirmPassword-error' : null
                        "
                        [attr.aria-invalid]="
                          hasError('confirmPassword', 'mismatch') ? 'true' : null
                        "
                      />
                      <button
                        type="button"
                        class="text-[#959695] hover:text-[#272827] transition-colors focus-visible:outline-none"
                        [attr.aria-label]="
                          showConfirm()
                            ? lang.t('profile.changePassword.hidePassword')
                            : lang.t('profile.changePassword.showPassword')
                        "
                        (click)="showConfirm.set(!showConfirm())"
                      >
                        <ios-icon
                          [name]="showConfirm() ? 'eye-off' : 'eye'"
                          class="w-5 h-5"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    @if (hasError('confirmPassword', 'mismatch')) {
                      <p
                        id="confirmPassword-error"
                        role="alert"
                        class="mt-1 text-xs text-ios-brand-primary"
                      >
                        {{ lang.t('profile.changePassword.passwordMismatch') }}
                      </p>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>
          <!-- ── Action buttons ──────────────────────────────────────────── -->
          <div class="flex items-center justify-end gap-4 mt-2 pb-2">
            <!-- Cancel -->
            <button
              type="button"
              class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#f1f1f1] text-[#373837] text-[16px] font-semibold leading-[1.4] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none whitespace-nowrap"
              (click)="showCancelDialog.set(true)"
            >
              {{ lang.t('profile.changePassword.cancel') }}
            </button>
            <!-- Save information -->
            <button
              type="submit"
              class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#141514] text-white text-[16px] font-semibold leading-[1.4] hover:bg-[#272827] transition-colors focus-visible:outline-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
              [disabled]="store.passwordSubmitStatus() === 'pending'"
            >
              @if (store.passwordSubmitStatus() === 'pending') {
                <span
                  class="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                ></span>
              }
              {{ lang.t('profile.changePassword.save') }}
            </button>
          </div>
        </form>
      </main>

      <!-- ── Footer ────────────────────────────────────────────────────── -->
      <footer class="bg-[#272827] w-full py-4 shrink-0">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-[#959695] text-sm"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: year.toString() }) }}</span>
        </div>
      </footer>
    </div>

    <!-- ── Dialogs ────────────────────────────────────────────────────── -->

    @if (showCancelDialog()) {
      <ios-profile-cancel-edit-dialog
        (dismissed)="showCancelDialog.set(false)"
        (confirmed)="onCancelConfirmed()"
      />
    }

    @if (store.passwordSubmitStatus() === 'success') {
      <ios-profile-password-updated-dialog (confirmed)="onPasswordSaved()" />
    }
  `,
})
export class ChangePasswordPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  protected readonly store = inject(ProfileStore);
  protected readonly lang = inject(LanguageService);

  protected readonly showCancelDialog = signal(false);
  protected readonly showOld = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly form = this.fb.group(
    {
      oldPassword: this.fb.control('', [Validators.required]),
      newPassword: this.fb.control('', [Validators.required, strongPasswordValidator()]),
      confirmPassword: this.fb.control('', [Validators.required]),
    },
    {
      validators: [matchFieldsValidator('newPassword', 'confirmPassword')],
    },
  );

  /** Track new password value as a signal to drive the strength meter. */
  private readonly newPasswordValue = toSignal(
    this.form.controls.newPassword.valueChanges.pipe(
      startWith(this.form.controls.newPassword.value),
    ),
    { initialValue: '' },
  );

  /** Password rules used by the 4-bar strength meter. */
  private readonly passwordRules = computed(() => {
    const value = this.newPasswordValue() ?? '';
    return {
      minLength: value.length >= STRONG_PASSWORD_MIN_LENGTH,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      digit: /[0-9]/.test(value),
      special: /[!@#$%^&*]/.test(value),
    };
  });

  /**
   * 4-bar strength indicator classes matching Figma design.
   * Maps 0–5 rule passes to 4 color segments.
   */
  protected readonly strengthBars = computed<string[]>(() => {
    const r = this.passwordRules();
    const passing = [r.minLength, r.uppercase, r.lowercase, r.digit, r.special].filter(
      Boolean,
    ).length;
    // Map 5 rules → 4 bars
    const filled = passing === 0 ? 0 : passing <= 1 ? 1 : passing <= 3 ? 2 : passing <= 4 ? 3 : 4;
    const activeColor =
      filled <= 1
        ? 'bg-red-400'
        : filled <= 2
          ? 'bg-orange-400'
          : filled <= 3
            ? 'bg-yellow-400'
            : 'bg-emerald-500';
    return Array.from({ length: 4 }, (_u, i) =>
      i < filled ? `${activeColor} opacity-100` : 'bg-[#dcdcdc] opacity-100',
    );
  });

  ngOnInit(): void {
    this.store.resetPasswordSubmitStatus();
  }

  protected hasError(controlName: string, errorKey: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control.hasError(errorKey));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    void this.store.changePassword({
      oldPassword: v.oldPassword,
      newPassword: v.newPassword,
      confirmPassword: v.confirmPassword,
    });
  }

  protected onCancelConfirmed(): void {
    this.showCancelDialog.set(false);
    void this.router.navigate(['/dashboard/profile']);
  }

  protected onPasswordSaved(): void {
    this.store.resetPasswordSubmitStatus();
    void this.router.navigate(['/dashboard/profile']);
  }
}

export default ChangePasswordPage;
