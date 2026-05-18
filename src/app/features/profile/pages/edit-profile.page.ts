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
import { LucideArrowLeft, LucidePencil } from '@lucide/angular';

import { CanadaFlag, Input, IosIcon, Select, provideIcons, type SelectOption } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import { ProfileCancelEditDialog } from '../components/cancel-edit-dialog';
import { ProfileInfoUpdatedDialog } from '../components/info-updated-dialog';
import { ProfileStore } from '../data-access/profile.store';

/** Countries available in the dropdown — extend as needed. */
const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'Canada', label: 'Canada' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Germany', label: 'Germany' },
  { value: 'France', label: 'France' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
];

const CITY_OPTIONS: Record<string, SelectOption[]> = {
  Canada: [
    { value: 'Victoria', label: 'Victoria' },
    { value: 'Vancouver', label: 'Vancouver' },
    { value: 'Toronto', label: 'Toronto' },
    { value: 'Ottawa', label: 'Ottawa' },
    { value: 'Montreal', label: 'Montreal' },
  ],
  default: [
    { value: 'City 1', label: 'City 1' },
    { value: 'City 2', label: 'City 2' },
  ],
};

const OCCUPATION_OPTIONS: SelectOption[] = [
  { value: 'Graphic designer', label: 'Graphic designer' },
  { value: 'Software engineer', label: 'Software engineer' },
  { value: 'Project manager', label: 'Project manager' },
  { value: 'Product owner', label: 'Product owner' },
  { value: 'Scrum master', label: 'Scrum master' },
  { value: 'Business analyst', label: 'Business analyst' },
  { value: 'Other', label: 'Other' },
];

const POSITION_OPTIONS: SelectOption[] = [
  { value: 'Team leader', label: 'Team leader' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Mid-level', label: 'Mid-level' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Director', label: 'Director' },
  { value: 'Manager', label: 'Manager' },
];

/**
 * `ios-edit-profile-page` — form for updating personal, location, and
 * professional information.
 *
 * Figma: node 13068-5382 (Dashborad-General / Update information).
 *
 * Three sections rendered as labelled cards:
 *   1. Personal informations  — avatar, first/last name (read-only), email (read-only)
 *   2. Location informations  — country, city (selects), street, address, postal code
 *   3. Professional Information — occupation, position (selects), company name
 *
 * Bottom action bar: Cancel | Save information.
 * "Cancel" opens `ProfileCancelEditDialog`; "Save information" calls `ProfileStore.updateProfile()`.
 * On success, `ProfileInfoUpdatedDialog` is shown; "Ok" navigates back to `/dashboard/profile`.
 */
@Component({
  selector: 'ios-edit-profile-page',
  imports: [
    DashboardNavbar,
    ReactiveFormsModule,
    RouterLink,
    IosIcon,
    CanadaFlag,
    Input,
    Select,
    ProfileCancelEditDialog,
    ProfileInfoUpdatedDialog,
  ],
  providers: [provideIcons(LucideArrowLeft, LucidePencil)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-ios-surface-soft">
        <div class="max-w-[1400px] mx-auto px-8 h-[70px] flex items-center">
          <div class="flex items-center gap-4">
            <a
              routerLink="/dashboard/profile"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none"
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
                    class="font-medium text-ios-fg-8 hover:text-ios-fg-13 transition-colors"
                    >{{ lang.t('profile.breadcrumb.dashboard') }}</a
                  >
                </li>
                <li class="font-medium text-ios-fg-8" aria-hidden="true">/</li>
                <li>
                  <a
                    routerLink="/dashboard/profile"
                    class="font-medium text-ios-fg-8 hover:text-ios-fg-13 transition-colors"
                    >{{ lang.t('profile.breadcrumb.profile') }}</a
                  >
                </li>
                <li class="font-medium text-ios-fg-8" aria-hidden="true">/</li>
                <li>
                  <span class="font-semibold text-ios-fg-13" aria-current="page">{{
                    lang.t('profile.breadcrumb.updateInformation')
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
          [attr.aria-label]="lang.t('profile.edit.formLabel')"
        >
          <!-- ── Personal informations ──────────────────────────────────── -->
          <section aria-labelledby="edit-personal-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="edit-personal-heading"
                class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-[228px] shrink-0"
              >
                {{ lang.t('profile.edit.personalInfo') }}
              </h2>

              <div class="flex-1 bg-ios-surface-mid rounded-2xl p-6 flex gap-8 items-start">
                <!-- Avatar + change image -->
                <div class="flex flex-col gap-4 items-center shrink-0">
                  <div
                    class="size-[82px] rounded-full border border-ios-line bg-[#fdfdfd] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span class="text-[24px] font-bold leading-[1.2] text-ios-fg">
                      {{ store.initials() }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="flex items-center gap-2 text-[16px] font-semibold leading-[1.4] text-ios-fg hover:text-ios-fg-mid transition-colors focus-visible:outline-none rounded"
                    [attr.aria-label]="lang.t('profile.edit.changeImage')"
                  >
                    <ios-icon name="pencil" class="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span class="whitespace-nowrap">{{ lang.t('profile.edit.changeImage') }}</span>
                  </button>
                </div>

                <!-- Vertical divider -->
                <div class="self-stretch w-px bg-ios-line shrink-0" aria-hidden="true"></div>

                <!-- Fields — first/last name + email are display-only (opacity-40) -->
                <div class="flex-1 flex flex-col gap-6">
                  <!-- First Name + Last Name (read-only per Figma; opacity-40) -->
                  <div class="flex gap-4 items-start opacity-40 pointer-events-none">
                    <div class="flex-1 flex flex-col gap-1">
                      <label
                        for="firstName"
                        class="px-2 text-[16px] font-semibold leading-[1.4] text-ios-fg"
                      >
                        {{ lang.t('profile.edit.firstName') }}
                      </label>
                      <div class="bg-ios-surface-mid border border-ios-line rounded-lg p-3">
                        <input
                          id="firstName"
                          type="text"
                          formControlName="firstName"
                          readonly
                          class="w-full bg-transparent text-[16px] font-bold leading-[1.3] text-ios-fg outline-none focus:outline-none focus:shadow-none cursor-not-allowed"
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                    <div class="flex-1 flex flex-col gap-1">
                      <label
                        for="lastName"
                        class="px-2 text-[16px] font-semibold leading-[1.4] text-ios-fg"
                      >
                        {{ lang.t('profile.edit.lastName') }}
                      </label>
                      <div class="bg-ios-surface-mid border border-ios-line rounded-lg p-3">
                        <input
                          id="lastName"
                          type="text"
                          formControlName="lastName"
                          readonly
                          class="w-full bg-transparent text-[16px] font-bold leading-[1.3] text-ios-fg outline-none focus:outline-none focus:shadow-none cursor-not-allowed"
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Email (read-only per Figma) -->
                  <div class="flex items-start opacity-40 pointer-events-none">
                    <div class="flex-1 flex flex-col gap-1">
                      <label
                        for="email"
                        class="px-2 text-[16px] font-semibold leading-[1.4] text-ios-fg"
                      >
                        {{ lang.t('profile.edit.email') }}
                      </label>
                      <div class="bg-ios-surface-mid border border-ios-line rounded-lg p-3">
                        <input
                          id="email"
                          type="email"
                          formControlName="email"
                          readonly
                          class="w-full bg-transparent text-[16px] font-bold leading-[1.3] text-ios-fg outline-none focus:outline-none focus:shadow-none cursor-not-allowed"
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Location informations ──────────────────────────────────── -->
          <section aria-labelledby="edit-location-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="edit-location-heading"
                class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-[228px] shrink-0"
              >
                {{ lang.t('profile.edit.locationInfo') }}
              </h2>

              <div class="flex-1 bg-ios-surface-mid rounded-2xl p-6 flex flex-col gap-8">
                <!-- Country + City row -->
                <div class="flex gap-4 items-start">
                  <div class="flex-1">
                    <ios-select
                      id="country"
                      [label]="lang.t('profile.edit.countryLabel')"
                      [placeholder]="lang.t('profile.edit.countryPlaceholder')"
                      [options]="countryOptions"
                      [control]="form.controls.country"
                      [required]="true"
                      [errorText]="lang.t('profile.edit.countryError')"
                    />
                  </div>
                  <div class="flex-1">
                    <ios-select
                      id="city"
                      [label]="lang.t('profile.edit.cityLabel')"
                      [placeholder]="lang.t('profile.edit.cityPlaceholder')"
                      [options]="cityOptions()"
                      [control]="form.controls.city"
                      [required]="true"
                      [errorText]="lang.t('profile.edit.cityError')"
                    />
                  </div>
                </div>

                <!-- Street + Address + Postal row -->
                <div class="flex gap-2.5 items-start">
                  <ios-input
                    class="flex-1"
                    id="street"
                    [label]="lang.t('profile.edit.streetLabel')"
                    [placeholder]="lang.t('profile.edit.streetPlaceholder')"
                    [control]="form.controls.street"
                  />
                  <ios-input
                    class="flex-1"
                    id="address"
                    [label]="lang.t('profile.edit.addressLabel')"
                    [placeholder]="lang.t('profile.edit.addressPlaceholder')"
                    [control]="form.controls.address"
                  />
                  <ios-input
                    class="flex-1"
                    id="postalCode"
                    [label]="lang.t('profile.edit.postalLabel')"
                    [placeholder]="lang.t('profile.edit.postalPlaceholder')"
                    [control]="form.controls.postalCode"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- ── Professional Information ───────────────────────────────── -->
          <section aria-labelledby="edit-professional-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="edit-professional-heading"
                class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-[228px] shrink-0"
              >
                {{ lang.t('profile.edit.professionalInfo') }}
              </h2>

              <div class="flex-1 bg-ios-surface-mid rounded-2xl p-6">
                <div class="flex gap-8 items-start">
                  <div class="flex-1">
                    <ios-select
                      id="occupation"
                      [label]="lang.t('profile.edit.occupationLabel')"
                      [placeholder]="lang.t('profile.edit.occupationPlaceholder')"
                      [options]="occupationOptions"
                      [control]="form.controls.occupation"
                    />
                  </div>
                  <div class="flex-1">
                    <ios-select
                      id="position"
                      [label]="lang.t('profile.edit.positionLabel')"
                      [placeholder]="lang.t('profile.edit.positionPlaceholder')"
                      [options]="positionOptions"
                      [control]="form.controls.position"
                    />
                  </div>
                  <ios-input
                    class="flex-1"
                    id="companyName"
                    [label]="lang.t('profile.edit.companyLabel')"
                    [placeholder]="lang.t('profile.edit.companyPlaceholder')"
                    [control]="form.controls.companyName"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- ── Action buttons ──────────────────────────────────────────── -->
          <div class="flex items-center justify-end gap-4 mt-2 pb-2">
            <!-- Cancel -->
            <button
              type="button"
              class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-ios-surface-soft text-ios-fg-10 text-[16px] font-semibold leading-[1.4] hover:bg-ios-surface-hover transition-colors focus-visible:outline-none whitespace-nowrap"
              (click)="showCancelDialog.set(true)"
            >
              {{ lang.t('profile.edit.cancel') }}
            </button>
            <!-- Save information -->
            <button
              type="submit"
              class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-ios-fg-13 text-white text-[16px] font-semibold leading-[1.4] hover:bg-ios-fg transition-colors focus-visible:outline-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
              [disabled]="store.submitStatus() === 'pending'"
            >
              @if (store.submitStatus() === 'pending') {
                <span
                  class="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                ></span>
              }
              {{ lang.t('profile.edit.save') }}
            </button>
          </div>
        </form>
      </main>

      <!-- ── Footer ────────────────────────────────────────────────────── -->
      <footer class="bg-ios-fg w-full py-4 shrink-0">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-sm"
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

    @if (store.submitStatus() === 'success') {
      <ios-profile-info-updated-dialog (confirmed)="onInfoSaved()" />
    }
  `,
})
export class EditProfilePage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  protected readonly store = inject(ProfileStore);
  protected readonly lang = inject(LanguageService);

  protected readonly showCancelDialog = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly countryOptions = COUNTRY_OPTIONS;
  protected readonly occupationOptions = OCCUPATION_OPTIONS;
  protected readonly positionOptions = POSITION_OPTIONS;

  /** Dynamic city options based on selected country. */
  protected readonly cityOptions = computed<SelectOption[]>(() => {
    const country = this.form?.controls.country.value ?? '';
    return CITY_OPTIONS[country] ?? CITY_OPTIONS['default'];
  });

  protected readonly form = this.fb.group({
    firstName: this.fb.control(''),
    lastName: this.fb.control(''),
    email: this.fb.control(''),
    country: this.fb.control('', [Validators.required]),
    city: this.fb.control('', [Validators.required]),
    street: this.fb.control(''),
    address: this.fb.control(''),
    postalCode: this.fb.control(''),
    occupation: this.fb.control(''),
    position: this.fb.control(''),
    companyName: this.fb.control(''),
  });

  ngOnInit(): void {
    this.store.load();
    this.store.resetSubmitStatus();
    const profile = this.store.profile();
    if (profile) {
      this.patchForm(
        profile.personal.firstName,
        profile.personal.lastName,
        profile.personal.email,
        profile.personal.country,
        profile.personal.city,
        profile.personal.street,
        profile.personal.address,
        profile.personal.postalCode,
        profile.professional.occupation,
        profile.professional.position,
        profile.professional.companyName,
      );
    }
  }

  private patchForm(
    firstName: string,
    lastName: string,
    email: string,
    country: string,
    city: string,
    street: string,
    address: string,
    postalCode: string,
    occupation: string,
    position: string,
    companyName: string,
  ): void {
    this.form.patchValue({
      firstName,
      lastName,
      email,
      country,
      city,
      street,
      address,
      postalCode,
      occupation,
      position,
      companyName,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    void this.store.updateProfile({
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      country: v.country,
      city: v.city,
      street: v.street,
      address: v.address,
      postalCode: v.postalCode,
      occupation: v.occupation,
      position: v.position,
      companyName: v.companyName,
    });
  }

  protected onCancelConfirmed(): void {
    this.showCancelDialog.set(false);
    void this.router.navigate(['/dashboard/profile']);
  }

  protected onInfoSaved(): void {
    this.store.resetSubmitStatus();
    void this.router.navigate(['/dashboard/profile']);
  }
}

export default EditProfilePage;
