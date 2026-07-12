import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { IosIcon, CanadaFlag, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import { ProfileStore } from '../data-access/profile.store';

/**
 * `ios-profile-page` — read-only view of the user's profile.
 *
 * Figma: node 13215-6311 (Dashborad-Certifications / Profile tab). The Figma
 * "Username" / "IOS ID" fields have no backend equivalent (`GET /me` exposes no
 * such fields), so they are replaced with the real profile data: phone and
 * member-since. `firstName`/`lastName`/`email` are shown read-only (locked on
 * the backend — they appear on issued certificates).
 *
 * Layout:
 *   ┌─ navbar (tabs: Overview | My certificates | Profile★ | Settings) ─┐
 *   ├─ breadcrumb (Dashboard / Profile) ─────────────────────────────── ┤
 *   │  Personal informations   ┌──────────────────────────────────────┐  │
 *   │                          │ [AA] Full Name  Email  Phone         │  │
 *   │                          │      City/Address  Country  Since    │  │
 *   │                          └──────────────────────────────────────┘  │
 *   │  Professional            ┌──────────────────────────────────────┐  │
 *   │  Information             │ Occupation  Company name  Position   │  │
 *   │                          └──────────────────────────────────────┘  │
 *   │                     [Change Password] [Update information] ────── │
 *   └─────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-profile-page',
  imports: [DashboardNavbar, RouterLink, IosIcon, CanadaFlag, DatePipe, NgOptimizedImage],
  providers: [provideIcons(LucideArrowLeft)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-ios-surface-soft">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 h-[70px] flex items-center">
          <div class="flex items-center gap-4">
            <!-- Back button -->
            <a
              routerLink="/dashboard"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none"
              [attr.aria-label]="lang.t('profile.breadcrumb.backToDashboard')"
            >
              <ios-icon name="arrow-left" class="w-5 h-5" aria-hidden="true" />
            </a>
            <!-- Breadcrumb text -->
            <nav aria-label="Breadcrumb">
              <ol
                class="flex items-center gap-3 text-base leading-[1.4] whitespace-nowrap"
                role="list"
              >
                <li>
                  <a
                    routerLink="/dashboard"
                    class="font-medium text-ios-fg-8 hover:text-ios-fg-13 transition-colors"
                  >
                    {{ lang.t('profile.breadcrumb.dashboard') }}
                  </a>
                </li>
                <li class="font-medium text-ios-fg-8" aria-hidden="true">/</li>
                <li>
                  <span class="font-semibold text-ios-fg-13" aria-current="page">{{
                    lang.t('profile.breadcrumb.profile')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
          @if (store.loading() && !store.profile()) {
            <!-- Loading -->
            <div
              class="flex items-center justify-center gap-3 py-24 text-ios-fg-8"
              role="status"
              aria-live="polite"
            >
              <span
                class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ios-fg-8 border-t-transparent"
                aria-hidden="true"
              ></span>
              {{ lang.t('common.loading') }}
            </div>
          } @else if (store.error(); as err) {
            <!-- Error + retry -->
            <div
              class="flex flex-col items-center justify-center gap-4 py-24 text-center"
              role="alert"
            >
              <p class="text-ios-brand-primary font-medium max-w-md">{{ err }}</p>
              <button
                type="button"
                class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-ios-fg text-white text-[16px] font-semibold hover:bg-ios-fg-13 transition-colors focus-visible:outline-none"
                (click)="onRetry()"
              >
                {{ lang.t('common.retry') }}
              </button>
            </div>
          } @else if (store.profile(); as p) {
            <!-- ── Personal informations ────────────────────────────────── -->
            <section aria-labelledby="personal-info-heading">
              <div class="flex flex-col lg:flex-row gap-6 items-start">
                <!-- Section label -->
                <h2
                  id="personal-info-heading"
                  class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-full lg:w-[228px] shrink-0"
                >
                  {{ lang.t('profile.view.personalInfo') }}
                </h2>

                <!-- Card -->
                <div
                  class="flex-1 w-full bg-ios-surface-mid rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 items-start"
                >
                  <!-- Avatar circle -->
                  <div
                    class="shrink-0 size-[82px] rounded-full border border-ios-line bg-[#fdfdfd] overflow-hidden flex items-center justify-center"
                    [attr.aria-label]="lang.t('profile.view.avatarAlt', { name: store.fullName() })"
                  >
                    @if (p.avatarUrl) {
                      <img
                        [ngSrc]="p.avatarUrl"
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

                  <!-- Info grid -->
                  <div class="flex-1 flex flex-col gap-6 text-[16px] md:text-[18px] text-ios-fg">
                    <!-- Row 1: Full Name | Email | Phone -->
                    <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <span class="text-[16px] md:text-[18px] font-medium leading-[1.4]">{{
                          lang.t('profile.view.fullName')
                        }}</span>
                        <span class="text-[16px] md:text-[18px] font-bold leading-[1.2]">{{
                          store.fullName()
                        }}</span>
                      </div>
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <span class="text-[16px] md:text-[18px] font-medium leading-[1.4]">{{
                          lang.t('profile.view.email')
                        }}</span>
                        <span
                          class="text-[16px] md:text-[18px] font-bold leading-[1.2] break-all"
                          >{{ p.email }}</span
                        >
                      </div>
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <span class="text-[16px] md:text-[18px] font-medium leading-[1.4]">{{
                          lang.t('profile.view.phone')
                        }}</span>
                        <span class="text-[16px] md:text-[18px] font-bold leading-[1.2]">{{
                          p.phone || lang.t('profile.view.notSet')
                        }}</span>
                      </div>
                    </div>

                    <!-- Row 2: City/Address | Country | Member since -->
                    <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <span class="text-[16px] md:text-[18px] font-medium leading-[1.4]">{{
                          lang.t('profile.view.cityAddress')
                        }}</span>
                        <span class="text-[16px] md:text-[18px] font-bold leading-[1.2]">{{
                          cityAddress(p.city, p.address)
                        }}</span>
                      </div>
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <span class="text-[16px] md:text-[18px] font-medium leading-[1.4]">{{
                          lang.t('profile.view.countryRegion')
                        }}</span>
                        <span class="text-[16px] md:text-[18px] font-bold leading-[1.2]">{{
                          p.country || lang.t('profile.view.notSet')
                        }}</span>
                      </div>
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <span class="text-[16px] md:text-[18px] font-medium leading-[1.4]">{{
                          lang.t('profile.view.memberSince')
                        }}</span>
                        <span class="text-[16px] md:text-[18px] font-bold leading-[1.2]">{{
                          p.createdAt | date: 'mediumDate'
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- ── Professional Information ─────────────────────────────── -->
            <section aria-labelledby="professional-info-heading">
              <div class="flex flex-col lg:flex-row gap-6 items-start">
                <!-- Section label -->
                <h2
                  id="professional-info-heading"
                  class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 w-full lg:w-[228px] shrink-0"
                >
                  {{ lang.t('profile.view.professionalInfo') }}
                </h2>

                <!-- Card -->
                <div class="flex-1 w-full bg-ios-surface-mid rounded-2xl p-6">
                  <div
                    class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start text-[16px] md:text-[18px] text-ios-fg"
                  >
                    <div class="flex-1 flex flex-col gap-1">
                      <span class="font-medium leading-[1.4]">{{
                        lang.t('profile.view.occupation')
                      }}</span>
                      <span class="font-bold leading-[1.2]">{{
                        p.occupation || lang.t('profile.view.notSet')
                      }}</span>
                    </div>
                    <div class="flex-1 flex flex-col gap-1">
                      <span class="font-medium leading-[1.4]">{{
                        lang.t('profile.view.companyName')
                      }}</span>
                      <span class="font-bold leading-[1.2]">{{
                        p.company || lang.t('profile.view.notSet')
                      }}</span>
                    </div>
                    <div class="flex-1 flex flex-col gap-1">
                      <span class="font-medium leading-[1.4]">{{
                        lang.t('profile.view.position')
                      }}</span>
                      <span class="font-bold leading-[1.2]">{{
                        p.position || lang.t('profile.view.notSet')
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- ── Action buttons ─────────────────────────────────────────── -->
            <div class="flex items-center justify-end gap-3 mt-4">
              <!-- Change Password (outlined / ghost style) -->
              <a
                routerLink="/dashboard/profile/change-password"
                class="inline-flex items-center justify-center h-11 px-6 rounded-xl text-[16px] font-semibold leading-[1.4] text-ios-fg hover:bg-ios-surface-soft transition-colors focus-visible:outline-none whitespace-nowrap"
              >
                {{ lang.t('profile.view.changePassword') }}
              </a>
              <!-- Update information (dark filled) -->
              <a
                routerLink="/dashboard/profile/edit"
                class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-ios-fg text-white text-[16px] font-semibold leading-[1.4] hover:bg-ios-fg-13 transition-colors focus-visible:outline-none whitespace-nowrap"
              >
                {{ lang.t('profile.view.updateInformation') }}
              </a>
            </div>
          }
        </div>
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
  `,
})
export class ProfilePage implements OnInit {
  protected readonly store = inject(ProfileStore);
  protected readonly lang = inject(LanguageService);

  protected readonly year = new Date().getFullYear();

  ngOnInit(): void {
    void this.store.load();
  }

  protected onRetry(): void {
    void this.store.reload();
  }

  /** Compose "City - Address", collapsing to whichever half is present. */
  protected cityAddress(city: string | null, address: string | null): string {
    const parts = [city, address].filter((v): v is string => !!v && v.trim().length > 0);
    return parts.length > 0 ? parts.join(' - ') : this.lang.t('profile.view.notSet');
  }
}

export default ProfilePage;
