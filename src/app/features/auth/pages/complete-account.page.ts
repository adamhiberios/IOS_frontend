/* eslint-disable @typescript-eslint/unbound-method --
 * Angular's `Validators.*` are class statics; passing them by reference here is
 * the canonical Reactive Forms idiom. The unbound-method rule cannot tell them
 * apart from real instance method leaks.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Input as IosInput, Select, type SelectOption } from '@ui';

/** Accepts 7–15 digits after stripping separators; empty value defers to Validators.required. */
function phoneNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value as string;
    const digits = raw.replace(/[\s\-().]/g, '');
    if (!digits) return null;
    if (!/^\d{7,15}$/.test(digits)) return { phoneInvalid: true };
    return null;
  };
}

export interface PhoneCountry {
  code: string; // ISO-3166 alpha-2
  flag: string; // Emoji flag
  dialCode: string; // e.g. "+1"
  name: string;
}

const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: 'AF', flag: '🇦🇫', dialCode: '+93', name: 'Afghanistan' },
  { code: 'AL', flag: '🇦🇱', dialCode: '+355', name: 'Albania' },
  { code: 'DZ', flag: '🇩🇿', dialCode: '+213', name: 'Algeria' },
  { code: 'AR', flag: '🇦🇷', dialCode: '+54', name: 'Argentina' },
  { code: 'AU', flag: '🇦🇺', dialCode: '+61', name: 'Australia' },
  { code: 'AT', flag: '🇦🇹', dialCode: '+43', name: 'Austria' },
  { code: 'AZ', flag: '🇦🇿', dialCode: '+994', name: 'Azerbaijan' },
  { code: 'BH', flag: '🇧🇭', dialCode: '+973', name: 'Bahrain' },
  { code: 'BD', flag: '🇧🇩', dialCode: '+880', name: 'Bangladesh' },
  { code: 'BE', flag: '🇧🇪', dialCode: '+32', name: 'Belgium' },
  { code: 'BR', flag: '🇧🇷', dialCode: '+55', name: 'Brazil' },
  { code: 'CA', flag: '🇨🇦', dialCode: '+1', name: 'Canada' },
  { code: 'CN', flag: '🇨🇳', dialCode: '+86', name: 'China' },
  { code: 'CO', flag: '🇨🇴', dialCode: '+57', name: 'Colombia' },
  { code: 'HR', flag: '🇭🇷', dialCode: '+385', name: 'Croatia' },
  { code: 'CY', flag: '🇨🇾', dialCode: '+357', name: 'Cyprus' },
  { code: 'CZ', flag: '🇨🇿', dialCode: '+420', name: 'Czech Republic' },
  { code: 'DK', flag: '🇩🇰', dialCode: '+45', name: 'Denmark' },
  { code: 'EG', flag: '🇪🇬', dialCode: '+20', name: 'Egypt' },
  { code: 'EE', flag: '🇪🇪', dialCode: '+372', name: 'Estonia' },
  { code: 'ET', flag: '🇪🇹', dialCode: '+251', name: 'Ethiopia' },
  { code: 'FI', flag: '🇫🇮', dialCode: '+358', name: 'Finland' },
  { code: 'FR', flag: '🇫🇷', dialCode: '+33', name: 'France' },
  { code: 'DE', flag: '🇩🇪', dialCode: '+49', name: 'Germany' },
  { code: 'GH', flag: '🇬🇭', dialCode: '+233', name: 'Ghana' },
  { code: 'GR', flag: '🇬🇷', dialCode: '+30', name: 'Greece' },
  { code: 'HK', flag: '🇭🇰', dialCode: '+852', name: 'Hong Kong' },
  { code: 'HU', flag: '🇭🇺', dialCode: '+36', name: 'Hungary' },
  { code: 'IN', flag: '🇮🇳', dialCode: '+91', name: 'India' },
  { code: 'ID', flag: '🇮🇩', dialCode: '+62', name: 'Indonesia' },
  { code: 'IQ', flag: '🇮🇶', dialCode: '+964', name: 'Iraq' },
  { code: 'IE', flag: '🇮🇪', dialCode: '+353', name: 'Ireland' },
  { code: 'IL', flag: '🇮🇱', dialCode: '+972', name: 'Israel' },
  { code: 'IT', flag: '🇮🇹', dialCode: '+39', name: 'Italy' },
  { code: 'JP', flag: '🇯🇵', dialCode: '+81', name: 'Japan' },
  { code: 'JO', flag: '🇯🇴', dialCode: '+962', name: 'Jordan' },
  { code: 'KZ', flag: '🇰🇿', dialCode: '+7', name: 'Kazakhstan' },
  { code: 'KE', flag: '🇰🇪', dialCode: '+254', name: 'Kenya' },
  { code: 'KW', flag: '🇰🇼', dialCode: '+965', name: 'Kuwait' },
  { code: 'LB', flag: '🇱🇧', dialCode: '+961', name: 'Lebanon' },
  { code: 'LY', flag: '🇱🇾', dialCode: '+218', name: 'Libya' },
  { code: 'MY', flag: '🇲🇾', dialCode: '+60', name: 'Malaysia' },
  { code: 'MX', flag: '🇲🇽', dialCode: '+52', name: 'Mexico' },
  { code: 'MA', flag: '🇲🇦', dialCode: '+212', name: 'Morocco' },
  { code: 'NL', flag: '🇳🇱', dialCode: '+31', name: 'Netherlands' },
  { code: 'NZ', flag: '🇳🇿', dialCode: '+64', name: 'New Zealand' },
  { code: 'NG', flag: '🇳🇬', dialCode: '+234', name: 'Nigeria' },
  { code: 'NO', flag: '🇳🇴', dialCode: '+47', name: 'Norway' },
  { code: 'OM', flag: '🇴🇲', dialCode: '+968', name: 'Oman' },
  { code: 'PK', flag: '🇵🇰', dialCode: '+92', name: 'Pakistan' },
  { code: 'PS', flag: '🇵🇸', dialCode: '+970', name: 'Palestine' },
  { code: 'PH', flag: '🇵🇭', dialCode: '+63', name: 'Philippines' },
  { code: 'PL', flag: '🇵🇱', dialCode: '+48', name: 'Poland' },
  { code: 'PT', flag: '🇵🇹', dialCode: '+351', name: 'Portugal' },
  { code: 'QA', flag: '🇶🇦', dialCode: '+974', name: 'Qatar' },
  { code: 'RO', flag: '🇷🇴', dialCode: '+40', name: 'Romania' },
  { code: 'RU', flag: '🇷🇺', dialCode: '+7', name: 'Russia' },
  { code: 'SA', flag: '🇸🇦', dialCode: '+966', name: 'Saudi Arabia' },
  { code: 'SN', flag: '🇸🇳', dialCode: '+221', name: 'Senegal' },
  { code: 'SG', flag: '🇸🇬', dialCode: '+65', name: 'Singapore' },
  { code: 'ZA', flag: '🇿🇦', dialCode: '+27', name: 'South Africa' },
  { code: 'KR', flag: '🇰🇷', dialCode: '+82', name: 'South Korea' },
  { code: 'ES', flag: '🇪🇸', dialCode: '+34', name: 'Spain' },
  { code: 'LK', flag: '🇱🇰', dialCode: '+94', name: 'Sri Lanka' },
  { code: 'SD', flag: '🇸🇩', dialCode: '+249', name: 'Sudan' },
  { code: 'SE', flag: '🇸🇪', dialCode: '+46', name: 'Sweden' },
  { code: 'CH', flag: '🇨🇭', dialCode: '+41', name: 'Switzerland' },
  { code: 'SY', flag: '🇸🇾', dialCode: '+963', name: 'Syria' },
  { code: 'TW', flag: '🇹🇼', dialCode: '+886', name: 'Taiwan' },
  { code: 'TZ', flag: '🇹🇿', dialCode: '+255', name: 'Tanzania' },
  { code: 'TH', flag: '🇹🇭', dialCode: '+66', name: 'Thailand' },
  { code: 'TN', flag: '🇹🇳', dialCode: '+216', name: 'Tunisia' },
  { code: 'TR', flag: '🇹🇷', dialCode: '+90', name: 'Turkey' },
  { code: 'UG', flag: '🇺🇬', dialCode: '+256', name: 'Uganda' },
  { code: 'UA', flag: '🇺🇦', dialCode: '+380', name: 'Ukraine' },
  { code: 'AE', flag: '🇦🇪', dialCode: '+971', name: 'United Arab Emirates' },
  { code: 'GB', flag: '🇬🇧', dialCode: '+44', name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', dialCode: '+1', name: 'United States' },
  { code: 'UZ', flag: '🇺🇿', dialCode: '+998', name: 'Uzbekistan' },
  { code: 'VE', flag: '🇻🇪', dialCode: '+58', name: 'Venezuela' },
  { code: 'VN', flag: '🇻🇳', dialCode: '+84', name: 'Vietnam' },
  { code: 'YE', flag: '🇾🇪', dialCode: '+967', name: 'Yemen' },
];

// ─── Static option lists ──────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const MONTHS_EN: SelectOption[] = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const MONTHS_AR: SelectOption[] = [
  { value: '1', label: 'يناير' },
  { value: '2', label: 'فبراير' },
  { value: '3', label: 'مارس' },
  { value: '4', label: 'أبريل' },
  { value: '5', label: 'مايو' },
  { value: '6', label: 'يونيو' },
  { value: '7', label: 'يوليو' },
  { value: '8', label: 'أغسطس' },
  { value: '9', label: 'سبتمبر' },
  { value: '10', label: 'أكتوبر' },
  { value: '11', label: 'نوفمبر' },
  { value: '12', label: 'ديسمبر' },
];

const MONTHS_FR: SelectOption[] = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const DAYS: SelectOption[] = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

/** Years from (current − 16) down to (current − 100). */
const YEARS: SelectOption[] = Array.from({ length: 85 }, (_, i) => {
  const y = CURRENT_YEAR - 16 - i;
  return { value: String(y), label: String(y) };
});

const CITIES: SelectOption[] = [
  { value: 'riyadh', label: 'Riyadh' },
  { value: 'jeddah', label: 'Jeddah' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi' },
  { value: 'cairo', label: 'Cairo' },
  { value: 'amman', label: 'Amman' },
  { value: 'kuwait_city', label: 'Kuwait City' },
  { value: 'doha', label: 'Doha' },
  { value: 'manama', label: 'Manama' },
  { value: 'muscat', label: 'Muscat' },
  { value: 'toronto', label: 'Toronto' },
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'london', label: 'London' },
  { value: 'berlin', label: 'Berlin' },
  { value: 'paris', label: 'Paris' },
  { value: 'new_york', label: 'New York' },
  { value: 'los_angeles', label: 'Los Angeles' },
  { value: 'sydney', label: 'Sydney' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'istanbul', label: 'Istanbul' },
];

const COUNTRIES: SelectOption[] = [
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'EG', label: 'Egypt' },
  { value: 'JO', label: 'Jordan' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'QA', label: 'Qatar' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'OM', label: 'Oman' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'IQ', label: 'Iraq' },
  { value: 'SY', label: 'Syria' },
  { value: 'YE', label: 'Yemen' },
  { value: 'LY', label: 'Libya' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'MA', label: 'Morocco' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'SD', label: 'Sudan' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'TR', label: 'Turkey' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'IN', label: 'India' },
  { value: 'AU', label: 'Australia' },
];

const OCCUPATIONS: SelectOption[] = [
  { value: 'scrum_master', label: 'Scrum Master' },
  { value: 'product_owner', label: 'Product Owner' },
  { value: 'developer', label: 'Developer' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'agile_coach', label: 'Agile Coach' },
  { value: 'business_analyst', label: 'Business Analyst' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
];

const POSITIONS: SelectOption[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid_level', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director / VP' },
  { value: 'c_suite', label: 'C-Suite' },
];

const STEPS = [1, 2, 3] as const;

// ─── Default phone country ────────────────────────────────────────────────────
const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES.find((c) => c.code === 'CA')!;

/**
 * Complete Account page — 3-step wizard shown after registration.
 *
 * Step 1 — Personal Information: birthday (Month/Day/Year), phone number with
 *           country-code selector (all countries, filterable), city, street,
 *           address, postal/ZIP code.
 * Step 2 — Location: city (select), country (select), address.
 * Step 3 — Professional Information: occupation, company name, position.
 *
 * Internationalisation: month names render in EN / AR / FR automatically;
 * all label strings are stored in the translation files under
 * `auth.completeAccount.*`. Months are locale-aware via `monthOptions()`.
 *
 * Composition mirrors `register.page.ts`:
 *   - `<ios-auth-header>` / `<ios-auth-footer>` from `@layouts/auth-shell`
 *   - `<ios-select>`, `<ios-input>`, `<ios-canada-flag>` from `@ui`
 */
@Component({
  selector: 'ios-complete-account-page',
  imports: [ReactiveFormsModule, AuthHeader, AuthFooter, AccentBars, IosInput, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars />

        <section
          class="w-full z-[2] max-w-2xl bg-white border-2 border-gray-100 rounded-xl
                 p-6 md:px-14 md:py-12 flex flex-col gap-10"
          aria-label="Complete your account"
        >
          <!-- ── Progress pills ─────────────────────────────────────────── -->
          <div
            class="flex items-center gap-2 w-[185px] mx-auto"
            role="progressbar"
            [attr.aria-valuenow]="step()"
            aria-valuemin="1"
            aria-valuemax="3"
            [attr.aria-label]="
              lang.t('auth.completeAccount.progressLabel', { step: String(step()), total: '3' })
            "
          >
            @for (pill of steps; track pill) {
              <div
                class="h-[9px] flex-1 rounded-full transition-colors duration-300"
                [class.bg-ios-brand-primary]="step() >= pill"
                [class.bg-ios-brand-primary-soft]="step() < pill"
              ></div>
            }
          </div>

          <!-- ── Page heading ───────────────────────────────────────────── -->
          <div class="flex flex-col gap-1">
            <h1
              class="font-heading font-bold leading-tight text-ios-fg-13"
              style="font-size: clamp(1.75rem, 4vw, 2.5rem)"
            >
              {{ lang.t('auth.completeAccount.greeting', { name: firstName() }) }}
            </h1>
            <p class="font-semibold text-ios-fg-8 text-lg">
              @if (step() === 1) {
                {{ lang.t('auth.completeAccount.stepSubtitle1') }}
              } @else {
                {{ lang.t('auth.completeAccount.stepSubtitle2') }}
              }
            </p>
          </div>

          <!-- ══════════════════════════════════════════════════════════════
               STEP 1 — Personal Information
               ══════════════════════════════════════════════════════════ -->
          @if (step() === 1) {
            <form
              [formGroup]="step1"
              (ngSubmit)="nextStep()"
              novalidate
              class="flex flex-col gap-4"
              aria-labelledby="step1-heading"
            >
              <h2 id="step1-heading" class="font-heading font-bold text-2xl text-ios-fg-10">
                {{ lang.t('auth.completeAccount.step1Heading') }}
              </h2>

              <!-- Birthday ------------------------------------------------ -->
              <fieldset class="flex flex-col gap-1 border-none p-0 m-0">
                <legend class="text-sm font-heading font-semibold text-ios-brand-dark ps-2 mb-1">
                  {{ lang.t('auth.completeAccount.birthdayLabel') }}
                  <span aria-hidden="true" class="text-ios-brand-primary">*</span>
                </legend>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- No label prop — group label comes from <legend> above -->
                  <ios-select
                    id="birthMonth"
                    label=""
                    [placeholder]="lang.t('auth.completeAccount.monthPlaceholder')"
                    [options]="monthOptions()"
                    [control]="step1.controls.birthMonth"
                    [required]="true"
                    [errorText]="lang.t('auth.completeAccount.monthRequired')"
                    [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
                  />
                  <ios-select
                    id="birthDay"
                    label=""
                    [placeholder]="lang.t('auth.completeAccount.dayPlaceholder')"
                    [options]="days"
                    [control]="step1.controls.birthDay"
                    [required]="true"
                    [errorText]="lang.t('auth.completeAccount.dayRequired')"
                    [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
                  />
                  <ios-select
                    id="birthYear"
                    label=""
                    [placeholder]="lang.t('auth.completeAccount.yearPlaceholder')"
                    [options]="years"
                    [control]="step1.controls.birthYear"
                    [required]="true"
                    [errorText]="lang.t('auth.completeAccount.yearRequired')"
                    [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
                  />
                </div>
              </fieldset>

              <!-- Phone number -------------------------------------------- -->
              <div class="flex flex-col gap-1">
                <label
                  for="phoneNumber"
                  class="block text-sm font-heading font-semibold text-ios-brand-dark ps-2"
                >
                  {{ lang.t('auth.completeAccount.phoneLabel') }}
                  <span aria-hidden="true" class="text-ios-brand-primary">*</span>
                </label>

                <!-- Outer: positioning context for the dropdown + click-outside sentinel -->
                <div class="relative" dir="ltr" data-phone-selector>
                  <!-- Inner row: overflow-hidden only for border-radius clipping -->
                  <div
                    class="flex items-stretch h-12 rounded-lg bg-gray-50 border overflow-hidden
                           transition-colors"
                    [class.border-ios-brand-primary]="phoneHasError()"
                    [class.border-gray-200]="!phoneHasError()"
                  >
                    <!-- Country-code trigger button -->
                    <button
                      type="button"
                      (click)="togglePhoneDropdown()"
                      class="shrink-0 h-full flex items-center gap-1.5 ps-3 pe-2
                             border-e border-gray-200 bg-gray-50 text-ios-brand-dark
                             text-sm font-bold focus:outline-none focus:bg-gray-100
                             transition-colors whitespace-nowrap"
                      [attr.aria-expanded]="phoneDropdownOpen()"
                      aria-haspopup="listbox"
                      [attr.aria-label]="lang.t('auth.completeAccount.selectCountryCode')"
                    >
                      <span class="text-base leading-none">{{ selectedPhoneCountry().flag }}</span>
                      <span>{{ selectedPhoneCountry().dialCode }}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                        class="text-gray-400 transition-transform duration-200"
                        [class.rotate-180]="phoneDropdownOpen()"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    <!-- Number input -->
                    <input
                      id="phoneNumber"
                      type="tel"
                      [placeholder]="lang.t('auth.completeAccount.phonePlaceholder')"
                      autocomplete="tel-national"
                      formControlName="phoneNumber"
                      class="flex-1 min-w-0 px-4 bg-transparent text-sm text-ios-brand-dark
                             placeholder:text-gray-400
                             outline-none ring-0 border-0
                             focus:outline-none focus:ring-0 focus:border-0"
                      [attr.aria-invalid]="phoneHasError() ? 'true' : null"
                      [attr.aria-describedby]="phoneHasError() ? 'phoneNumber-error' : null"
                      aria-required="true"
                    />
                  </div>

                  <!-- Dropdown: sibling of the inner row, not clipped by overflow-hidden -->
                  @if (phoneDropdownOpen()) {
                    <div
                      class="absolute start-0 top-full mt-1 w-64 rounded-xl bg-white
                             border border-gray-200 shadow-xl z-[200] flex flex-col"
                      role="listbox"
                      [attr.aria-label]="lang.t('auth.completeAccount.selectCountryCode')"
                    >
                      <!-- Filter -->
                      <div class="p-2 border-b border-gray-100">
                        <div
                          class="flex items-center gap-2 px-3 h-9 rounded-lg bg-gray-50 border border-gray-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="text-gray-400 flex-shrink-0"
                            aria-hidden="true"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                          <input
                            type="text"
                            [placeholder]="lang.t('auth.completeAccount.searchCountry')"
                            [value]="phoneCountryFilter()"
                            (input)="phoneCountryFilter.set($any($event.target).value)"
                            class="flex-1 min-w-0 bg-transparent text-sm text-ios-brand-dark
                                   placeholder:text-gray-400
                                   outline-none ring-0 border-0"
                            autocomplete="off"
                          />
                          @if (phoneCountryFilter()) {
                            <button
                              type="button"
                              (click)="phoneCountryFilter.set('')"
                              class="text-gray-400 hover:text-gray-600 focus:outline-none"
                              aria-label="Clear"
                            >
                              ×
                            </button>
                          }
                        </div>
                      </div>
                      <!-- List -->
                      <div class="overflow-y-auto max-h-52 py-1" role="group">
                        @if (filteredPhoneCountries().length === 0) {
                          <p class="px-4 py-3 text-sm text-gray-400 text-center">
                            {{ lang.t('auth.completeAccount.noResults') }}
                          </p>
                        }
                        @for (country of filteredPhoneCountries(); track country.code) {
                          <button
                            type="button"
                            role="option"
                            [attr.aria-selected]="country.code === selectedPhoneCountry().code"
                            (click)="selectPhoneCountry(country)"
                            class="w-full px-4 py-2 text-start text-sm font-medium
                                   hover:bg-gray-50 transition-colors
                                   flex items-center gap-3"
                            [class.bg-ios-brand-primary-soft]="
                              country.code === selectedPhoneCountry().code
                            "
                            [class.text-ios-brand-primary]="
                              country.code === selectedPhoneCountry().code
                            "
                          >
                            <span class="text-base shrink-0">{{ country.flag }}</span>
                            <span class="flex-1 truncate">{{ country.name }}</span>
                            <span class="text-xs text-gray-400 shrink-0 font-mono">
                              {{ country.dialCode }}
                            </span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (phoneHasError()) {
                  <p
                    id="phoneNumber-error"
                    role="alert"
                    class="mt-0.5 text-xs text-ios-brand-primary text-start"
                  >
                    {{ phoneErrorText() }}
                  </p>
                }
              </div>

              <!-- City + Street ------------------------------------------- -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ios-select
                  id="city"
                  [label]="lang.t('auth.completeAccount.cityMandatoryLabel')"
                  [placeholder]="lang.t('auth.completeAccount.cityPlaceholder')"
                  [options]="cities"
                  [control]="step1.controls.city"
                  [required]="true"
                  [errorText]="lang.t('auth.completeAccount.cityRequired')"
                  [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
                />
                <ios-input
                  id="street"
                  [label]="lang.t('auth.completeAccount.streetLabel')"
                  [placeholder]="lang.t('auth.completeAccount.streetPlaceholder')"
                  [control]="step1.controls.street"
                />
              </div>

              <!-- Address + ZIP Code -------------------------------------- -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ios-input
                  id="address"
                  [label]="lang.t('auth.completeAccount.addressLabel')"
                  [placeholder]="lang.t('auth.completeAccount.addressPlaceholder')"
                  [control]="step1.controls.address"
                />
                <ios-input
                  id="postalCode"
                  [label]="lang.t('auth.completeAccount.postalLabel')"
                  [placeholder]="lang.t('auth.completeAccount.postalPlaceholder')"
                  [control]="step1.controls.postalCode"
                />
              </div>

              <!-- Next button --------------------------------------------- -->
              <button
                type="submit"
                class="mt-2 w-full h-14 rounded-xl bg-ios-brand-dark text-white font-semibold
                       text-lg transition-colors hover:bg-ios-brand-dark/90
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-ios-brand-dark/50 focus-visible:ring-offset-2"
              >
                {{ lang.t('auth.completeAccount.nextButton') }}
              </button>
            </form>
          }

          <!-- ══════════════════════════════════════════════════════════════
               STEP 2 — Location
               ══════════════════════════════════════════════════════════ -->
          @if (step() === 2) {
            <form
              [formGroup]="step2"
              (ngSubmit)="nextStep()"
              novalidate
              class="flex flex-col gap-4"
              aria-labelledby="step2-heading"
            >
              <h2 id="step2-heading" class="font-heading font-bold text-2xl text-ios-fg-10">
                {{ lang.t('auth.completeAccount.step2Heading') }}
              </h2>

              <ios-select
                id="city2"
                [label]="lang.t('auth.completeAccount.cityMandatoryLabel')"
                [placeholder]="lang.t('auth.completeAccount.citySelectPlaceholder')"
                [options]="cities"
                [control]="step2.controls.city"
                [required]="true"
                [errorText]="lang.t('auth.completeAccount.cityRequired')"
                [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
              />

              <ios-select
                id="country2"
                [label]="lang.t('auth.completeAccount.countryMandatoryLabel')"
                [placeholder]="lang.t('auth.completeAccount.countrySelectPlaceholder')"
                [options]="countries"
                [control]="step2.controls.country"
                [required]="true"
                [errorText]="lang.t('auth.completeAccount.countryRequired')"
                [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
              />

              <ios-input
                id="address2"
                [label]="lang.t('auth.completeAccount.addressLabel')"
                [placeholder]="lang.t('auth.completeAccount.addressSelectPlaceholder')"
                [control]="step2.controls.address"
              />

              <!-- Back + Next --------------------------------------------- -->
              <div class="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-2">
                <button
                  type="button"
                  (click)="prevStep()"
                  class="h-14 px-4 rounded-xl bg-ios-border-light text-ios-brand-dark
                         flex items-center justify-center transition-colors
                         hover:bg-gray-300 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  [attr.aria-label]="lang.t('auth.completeAccount.backAriaLabel')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                    class="rtl:[transform:scaleX(-1)]"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 5l-7 7 7 7" />
                  </svg>
                </button>
                <button
                  type="submit"
                  class="flex-1 h-14 rounded-xl bg-ios-brand-dark text-white font-semibold
                         text-lg transition-colors hover:bg-ios-brand-dark/90
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-ios-brand-dark/50 focus-visible:ring-offset-2"
                >
                  {{ lang.t('auth.completeAccount.nextButton') }}
                </button>
              </div>
            </form>
          }

          <!-- ══════════════════════════════════════════════════════════════
               STEP 3 — Professional Information
               ══════════════════════════════════════════════════════════ -->
          @if (step() === 3) {
            <form
              [formGroup]="step3"
              (ngSubmit)="onSubmit()"
              novalidate
              class="flex flex-col gap-4"
              aria-labelledby="step3-heading"
            >
              <h2 id="step3-heading" class="font-heading font-bold text-2xl text-ios-fg-10">
                {{ lang.t('auth.completeAccount.step3Heading') }}
              </h2>

              <ios-select
                id="occupation"
                [label]="lang.t('auth.completeAccount.occupationLabel')"
                [placeholder]="lang.t('auth.completeAccount.occupationPlaceholder')"
                [options]="occupations"
                [control]="step3.controls.occupation"
                [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
              />

              <ios-input
                id="companyName"
                [label]="lang.t('auth.completeAccount.companyLabel')"
                [placeholder]="lang.t('auth.completeAccount.companyPlaceholder')"
                [control]="step3.controls.companyName"
              />

              <ios-select
                id="position"
                [label]="lang.t('auth.completeAccount.positionLabel')"
                [placeholder]="lang.t('auth.completeAccount.positionPlaceholder')"
                [options]="positions"
                [control]="step3.controls.position"
                [searchPlaceholder]="lang.t('auth.completeAccount.searchPlaceholder')"
              />

              <!-- Back + Save & Continue ---------------------------------- -->
              <div class="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-2">
                <button
                  type="button"
                  (click)="prevStep()"
                  class="h-14 px-4 rounded-xl bg-ios-border-light text-ios-brand-dark
                         flex items-center justify-center transition-colors
                         hover:bg-gray-300 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  [attr.aria-label]="lang.t('auth.completeAccount.backAriaLabel')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                    class="rtl:[transform:scaleX(-1)]"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 5l-7 7 7 7" />
                  </svg>
                </button>
                <button
                  type="submit"
                  [disabled]="isPending()"
                  class="flex-1 h-14 rounded-xl bg-ios-brand-dark text-white font-semibold
                         text-lg transition-colors hover:bg-ios-brand-dark/90
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-ios-brand-dark/50 focus-visible:ring-offset-2
                         disabled:opacity-50 disabled:pointer-events-none"
                >
                  @if (isPending()) {
                    <span
                      class="me-2 inline-block h-4 w-4 animate-spin rounded-full
                             border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    ></span>
                  }
                  {{ lang.t('auth.completeAccount.submitButton') }}
                </button>
              </div>
            </form>
          }

          <!-- ── Copyright ─────────────────────────────────────────────── -->
          <p class="text-center text-xs text-ios-brand-muted font-medium">
            {{ lang.t('auth.completeAccount.copyright', { year: currentYear }) }}
          </p>
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeAllDropdowns()',
  },
})
export class CompleteAccountPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly lang = inject(LanguageService);
  protected readonly currentYear = new Date().getFullYear();

  // ─── Static data ─────────────────────────────────────────────────────────
  protected readonly steps = STEPS;
  protected readonly days = DAYS;
  protected readonly years = YEARS;
  protected readonly cities = CITIES;
  protected readonly countries = COUNTRIES;
  protected readonly occupations = OCCUPATIONS;
  protected readonly positions = POSITIONS;
  protected readonly phoneCountries = PHONE_COUNTRIES;

  /** Month names localised to the active language. */
  protected readonly monthOptions = computed<SelectOption[]>(() => {
    const locale = this.lang.locale();
    if (locale === 'ar') return MONTHS_AR;
    if (locale === 'fr') return MONTHS_FR;
    return MONTHS_EN;
  });

  // ─── Step state ───────────────────────────────────────────────────────────
  protected readonly step = signal<1 | 2 | 3>(1);
  protected readonly step1Submitted = signal(false);
  protected readonly step2Submitted = signal(false);
  protected readonly step3Submitted = signal(false);

  // ─── User display name ────────────────────────────────────────────────────
  protected readonly firstName = computed(() => this.auth.user()?.firstName ?? 'there');

  // ─── Phone country picker ─────────────────────────────────────────────────
  protected readonly selectedPhoneCountry = signal<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  protected readonly phoneDropdownOpen = signal(false);
  protected readonly phoneCountryFilter = signal('');

  protected readonly filteredPhoneCountries = computed(() => {
    const q = this.phoneCountryFilter().trim().toLowerCase();
    return q
      ? PHONE_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q))
      : PHONE_COUNTRIES;
  });

  togglePhoneDropdown(): void {
    this.phoneDropdownOpen.update((v) => !v);
    if (!this.phoneDropdownOpen()) this.phoneCountryFilter.set('');
  }

  selectPhoneCountry(country: PhoneCountry): void {
    this.selectedPhoneCountry.set(country);
    this.phoneDropdownOpen.set(false);
    this.phoneCountryFilter.set('');
  }

  closeAllDropdowns(): void {
    this.phoneDropdownOpen.set(false);
    this.phoneCountryFilter.set('');
  }

  protected onDocumentClick(event: Event): void {
    if (!this.phoneDropdownOpen()) return;
    const target = event.target as HTMLElement | null;
    // Close if click is outside the phone composite field
    if (!target?.closest('[data-phone-selector]')) {
      this.closeAllDropdowns();
    }
  }

  // ─── Step 1 Form — Personal Information ──────────────────────────────────
  protected readonly step1 = this.fb.group({
    birthMonth: this.fb.control('', { validators: [Validators.required] }),
    birthDay: this.fb.control('', { validators: [Validators.required] }),
    birthYear: this.fb.control('', { validators: [Validators.required] }),
    phoneNumber: this.fb.control('', {
      validators: [Validators.required, phoneNumberValidator()],
    }),
    city: this.fb.control('', { validators: [Validators.required] }),
    street: this.fb.control(''),
    address: this.fb.control(''),
    postalCode: this.fb.control(''),
  });

  // ─── Step 2 Form — Location ───────────────────────────────────────────────
  protected readonly step2 = this.fb.group({
    city: this.fb.control('', { validators: [Validators.required] }),
    country: this.fb.control('', { validators: [Validators.required] }),
    address: this.fb.control(''),
  });

  // ─── Step 3 Form — Professional Information ───────────────────────────────
  protected readonly step3 = this.fb.group({
    occupation: this.fb.control(''),
    companyName: this.fb.control(''),
    position: this.fb.control(''),
  });

  // ─── Phone field error tracking ───────────────────────────────────────────
  private readonly phoneTick = toSignal(this.step1.controls.phoneNumber.events, {
    initialValue: null,
  });

  protected readonly phoneHasError = computed(() => {
    this.phoneTick();
    const c = this.step1.controls.phoneNumber;
    return (c.touched || c.dirty || this.step1Submitted()) && c.invalid;
  });

  protected readonly phoneErrorText = computed(() => {
    const c = this.step1.controls.phoneNumber;
    if (c.hasError('required')) return this.lang.t('auth.completeAccount.phoneRequired');
    if (c.hasError('phoneInvalid')) return this.lang.t('auth.completeAccount.phoneInvalid');
    return '';
  });

  // ─── Auth submit state ────────────────────────────────────────────────────
  protected readonly isPending = computed(() => this.auth.submitState().status === 'pending');

  // ─── Navigation ───────────────────────────────────────────────────────────
  protected nextStep(): void {
    const current = this.step();
    if (current === 1) {
      this.step1Submitted.set(true);
      if (this.step1.invalid) {
        this.step1.markAllAsTouched();
        return;
      }
      this.step.set(2);
    } else if (current === 2) {
      this.step2Submitted.set(true);
      if (this.step2.invalid) {
        this.step2.markAllAsTouched();
        return;
      }
      this.step.set(3);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected prevStep(): void {
    if (this.step() > 1) {
      this.step.update((s) => (s - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Final submission (step 3). All step-3 fields are optional.
   * TODO: POST all three step payloads to the profile-completion API.
   */
  protected onSubmit(): void {
    this.step3Submitted.set(true);
    if (this.step3.invalid) {
      this.step3.markAllAsTouched();
      return;
    }
    void this.router.navigateByUrl('/dashboard');
  }

  /** Expose String() to the template for aria-label interpolation. */
  protected readonly String = String;
}

export default CompleteAccountPage;
