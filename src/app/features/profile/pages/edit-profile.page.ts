import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs/operators';
import { LucideArrowLeft } from '@lucide/angular';

import { CanadaFlag, Input, IosIcon, Select, provideIcons, type SelectOption } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import { ProfileCancelEditDialog } from '../components/cancel-edit-dialog';
import { ProfileInfoUpdatedDialog } from '../components/info-updated-dialog';
import { ProfileStore } from '../data-access/profile.store';

/** Countries offered in the dropdown — the backend field is a free string, so
 *  the current stored value is always merged in (see `countryOptions`). */
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

/** Ensure a stored value that isn't in the preset list is still selectable, so
 *  editing an unrelated field never silently drops it (backend fields are free
 *  strings). */
function withValue(options: SelectOption[], value: string): SelectOption[] {
  const v = value.trim();
  if (!v || options.some((o) => o.value === v)) return options;
  return [{ value: v, label: v }, ...options];
}

/**
 * `ios-edit-profile-page` — form for updating location + professional
 * information and phone via `PATCH /me`.
 *
 * Figma: node 13068-5382 (Dashborad-General / Update information).
 *
 * `firstName`, `lastName`, and `email` are shown read-only — they are LOCKED
 * server-side (they appear on issued certificates) and `PATCH /me` rejects
 * them. Country/city are optional here (the backend does not require them; a
 * null profile field must not block saving other edits). Avatar image upload is
 * not possible (BE-I-08) — the avatar is display-only.
 *
 * Bottom action bar: Cancel | Save information. "Cancel" opens
 * `ProfileCancelEditDialog`; "Save information" calls `ProfileStore.updateProfile()`.
 * On success, `ProfileInfoUpdatedDialog` is shown; "Ok" returns to the profile.
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
    NgOptimizedImage,
    ProfileCancelEditDialog,
    ProfileInfoUpdatedDialog,
  ],
  providers: [provideIcons(LucideArrowLeft)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-ios-surface-soft">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 h-[70px] flex items-center">
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
          class="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col gap-6"
          [attr.aria-label]="lang.t('profile.edit.formLabel')"
        >
          <!-- ── Personal informations ──────────────────────────────────── -->
          <section aria-labelledby="edit-personal-heading">
            <div class="flex flex-col lg:flex-row gap-6 items-start">
              <h2
                id="edit-personal-heading"
                class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-full lg:w-[228px] shrink-0"
              >
                {{ lang.t('profile.edit.personalInfo') }}
              </h2>

              <div
                class="flex-1 w-full bg-ios-surface-mid rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 items-start"
              >
                <!-- Avatar (display-only — no upload endpoint, BE-I-08) -->
                <div class="flex flex-col gap-4 items-center shrink-0">
                  <div
                    class="size-[82px] rounded-full border border-ios-line bg-[#fdfdfd] overflow-hidden flex items-center justify-center"
                    aria-hidden="true"
                  >
                    @if (store.profile()?.avatarUrl; as avatar) {
                      <img
                        [ngSrc]="avatar"
                        alt=""
                        class="w-full h-full object-cover"
                        width="82"
                        height="82"
                      />
                    } @else {
                      <span class="text-[24px] font-bold leading-[1.2] text-ios-fg">
                        {{ store.initials() }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Vertical divider -->
                <div class="self-stretch w-px bg-ios-line shrink-0" aria-hidden="true"></div>

                <!-- Fields — first/last name + email are display-only (locked) -->
                <div class="flex-1 flex flex-col gap-6">
                  <!-- First Name + Last Name (locked; opacity-40) -->
                  <div
                    class="flex flex-col sm:flex-row gap-4 items-start opacity-40 pointer-events-none"
                  >
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

                  <!-- Email (locked) + Phone (editable) -->
                  <div class="flex flex-col sm:flex-row gap-4 items-start">
                    <div class="flex-1 flex flex-col gap-1 opacity-40 pointer-events-none">
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
                    <ios-input
                      class="flex-1"
                      id="phone"
                      type="tel"
                      autocomplete="tel"
                      [label]="lang.t('profile.edit.phoneLabel')"
                      [placeholder]="lang.t('profile.edit.phonePlaceholder')"
                      [control]="form.controls.phone"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Location informations ──────────────────────────────────── -->
          <section aria-labelledby="edit-location-heading">
            <div class="flex flex-col lg:flex-row gap-6 items-start">
              <h2
                id="edit-location-heading"
                class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-full lg:w-[228px] shrink-0"
              >
                {{ lang.t('profile.edit.locationInfo') }}
              </h2>

              <div
                class="flex-1 w-full bg-ios-surface-mid rounded-2xl p-4 md:p-6 flex flex-col gap-8"
              >
                <!-- Country + City row -->
                <div class="flex flex-col sm:flex-row gap-4 items-start">
                  <div class="flex-1">
                    <ios-select
                      id="country"
                      [label]="lang.t('profile.edit.countryLabel')"
                      [placeholder]="lang.t('profile.edit.countryPlaceholder')"
                      [options]="countryOptions()"
                      [control]="form.controls.country"
                    />
                  </div>
                  <div class="flex-1">
                    <ios-select
                      id="city"
                      [label]="lang.t('profile.edit.cityLabel')"
                      [placeholder]="lang.t('profile.edit.cityPlaceholder')"
                      [options]="cityOptions()"
                      [control]="form.controls.city"
                    />
                  </div>
                </div>

                <!-- Street + Address + Postal row -->
                <div class="flex flex-col sm:flex-row gap-2.5 items-start">
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
            <div class="flex flex-col lg:flex-row gap-6 items-start">
              <h2
                id="edit-professional-heading"
                class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-full lg:w-[228px] shrink-0"
              >
                {{ lang.t('profile.edit.professionalInfo') }}
              </h2>

              <div class="flex-1 w-full bg-ios-surface-mid rounded-2xl p-4 md:p-6">
                <div class="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
                  <div class="flex-1">
                    <ios-select
                      id="occupation"
                      [label]="lang.t('profile.edit.occupationLabel')"
                      [placeholder]="lang.t('profile.edit.occupationPlaceholder')"
                      [options]="occupationOptions()"
                      [control]="form.controls.occupation"
                    />
                  </div>
                  <div class="flex-1">
                    <ios-select
                      id="position"
                      [label]="lang.t('profile.edit.positionLabel')"
                      [placeholder]="lang.t('profile.edit.positionPlaceholder')"
                      [options]="positionOptions()"
                      [control]="form.controls.position"
                    />
                  </div>
                  <ios-input
                    class="flex-1"
                    id="companyName"
                    [label]="lang.t('profile.edit.companyLabel')"
                    [placeholder]="lang.t('profile.edit.companyPlaceholder')"
                    [control]="form.controls.company"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- ── Submit error ────────────────────────────────────────────── -->
          @if (store.submitError(); as err) {
            <p role="alert" class="text-end text-sm font-medium text-ios-brand-primary">
              {{ err }}
            </p>
          }

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
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-sm"
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

  /** Guards the one-time form hydration from the loaded profile. */
  private patched = false;

  protected readonly form = this.fb.group({
    firstName: this.fb.control(''),
    lastName: this.fb.control(''),
    email: this.fb.control(''),
    phone: this.fb.control(''),
    country: this.fb.control(''),
    city: this.fb.control(''),
    street: this.fb.control(''),
    address: this.fb.control(''),
    postalCode: this.fb.control(''),
    occupation: this.fb.control(''),
    position: this.fb.control(''),
    company: this.fb.control(''),
  });

  /** Country options with the current stored value merged in. */
  protected readonly countryOptions = computed(() =>
    withValue(COUNTRY_OPTIONS, this.countryValue()),
  );

  /** City options for the selected country, with the stored value merged in. */
  protected readonly cityOptions = computed(() => {
    const base = CITY_OPTIONS[this.countryValue()] ?? CITY_OPTIONS['default'];
    return withValue(base, this.cityValue());
  });

  protected readonly occupationOptions = computed(() =>
    withValue(OCCUPATION_OPTIONS, this.occupationValue()),
  );
  protected readonly positionOptions = computed(() =>
    withValue(POSITION_OPTIONS, this.positionValue()),
  );

  /* Track the select-bound control values as signals so the option lists react
   * (no `.subscribe()` in the component — banned pattern; use `toSignal`). */
  private readonly countryValue = toSignal(
    this.form.controls.country.valueChanges.pipe(startWith(this.form.controls.country.value)),
    { initialValue: '' },
  );
  private readonly cityValue = toSignal(
    this.form.controls.city.valueChanges.pipe(startWith(this.form.controls.city.value)),
    { initialValue: '' },
  );
  private readonly occupationValue = toSignal(
    this.form.controls.occupation.valueChanges.pipe(startWith(this.form.controls.occupation.value)),
    { initialValue: '' },
  );
  private readonly positionValue = toSignal(
    this.form.controls.position.valueChanges.pipe(startWith(this.form.controls.position.value)),
    { initialValue: '' },
  );

  constructor() {
    // Hydrate the form once the profile has loaded (load is async).
    effect(() => {
      const p = this.store.profile();
      if (!p || this.patched) return;
      this.patched = true;
      this.form.patchValue({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone ?? '',
        country: p.country ?? '',
        city: p.city ?? '',
        street: p.street ?? '',
        address: p.address ?? '',
        postalCode: p.postalCode ?? '',
        occupation: p.occupation ?? '',
        position: p.position ?? '',
        company: p.company ?? '',
      });
    });
  }

  ngOnInit(): void {
    this.store.resetSubmitStatus();
    void this.store.load();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    void this.store.updateProfile({
      phone: v.phone,
      country: v.country,
      city: v.city,
      street: v.street,
      address: v.address,
      postalCode: v.postalCode,
      occupation: v.occupation,
      position: v.position,
      company: v.company,
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
