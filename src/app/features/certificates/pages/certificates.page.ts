import { ChangeDetectionStrategy, Component, type OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon, provideIcons } from '@ui';

import { DashboardNavbar } from '@layouts';
import {
  resolveBadgeAsset,
  resolveCertFamily,
} from '@features/dashboard/data-access/dashboard.model';
import { CoursesStore } from '@features/courses/data-access/courses.store';
import { EnrolledCertRow } from '../components/enrolled-cert-row';
import type { EnrolledCertHeader } from '../data-access/certificates.model';

@Component({
  selector: 'ios-certificates-page',
  imports: [DashboardNavbar, EnrolledCertRow, CanadaFlag, RouterLink, IosIcon],
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
              routerLink="/dashboard"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/30"
              [attr.aria-label]="lang.t('dashboard.breadcrumb.backToDashboard')"
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
                    >{{ lang.t('dashboard.breadcrumb.dashboard') }}</a
                  >
                </li>
                <li class="font-medium text-ios-fg-8" aria-hidden="true">/</li>
                <li>
                  <span class="font-semibold text-ios-fg-13" aria-current="page">{{
                    lang.t('dashboard.nav.myCertificates')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <main class="flex-1 bg-white" id="main-content">
        <!--
          One row per **actually enrolled** certificate, from GET /learning/progress.
          This used to render a hardcoded [ESM_P_HEADER] fixture, which is why the
          page listed certifications the student had never enrolled in.
        -->
        @if (courses.progressError(); as message) {
          <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-10 text-center" role="alert">
            <p class="text-[15px] font-medium text-ios-fg-13">{{ message }}</p>
          </div>
        } @else if (courses.progressLoading() && enrolledCerts().length === 0) {
          <p
            class="max-w-[1400px] mx-auto px-4 md:px-8 py-10 text-center text-ios-fg-8"
            role="status"
            aria-live="polite"
          >
            {{ lang.t('dashboard.certs.materialsLoading') }}
          </p>
        } @else if (enrolledCerts().length === 0) {
          <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
            <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center">
              <p class="text-[15px] text-ios-fg-8">{{ lang.t('dashboard.certs.noEnrolments') }}</p>
              <a
                routerLink="/certifications"
                class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ios-fg-13 px-5 font-semibold text-white hover:bg-ios-fg transition-colors"
              >
                {{ lang.t('dashboard.certs.browseCertifications') }}
              </a>
            </div>
          </div>
        } @else {
          @for (cert of enrolledCerts(); track cert.code) {
            <ios-enrolled-cert-row [cert]="cert" (viewDetails)="onViewDetails($event)" />
          }
        }
      </main>

      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class CertificatesPage implements OnInit {
  protected readonly lang = inject(LanguageService);
  protected readonly courses = inject(CoursesStore);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  /**
   * The student's real enrolments (`GET /learning/progress`), shaped for the
   * existing row component.
   *
   * `family` / `badgeAsset` are **derived from the program code** via the
   * helpers introduced for the dashboard rewire (`4a11ae9`) — the backend has no
   * family or badge field, and reusing those helpers keeps the two surfaces
   * showing the same artwork for the same programme.
   *
   * `hasCertificate` is `false` here rather than guessed: whether a credential
   * has been issued lives behind `GET /me/certificates` (the credentials
   * feature), and progress alone cannot answer it. Showing a download
   * affordance that may 404 is worse than omitting it.
   */
  protected readonly enrolledCerts = computed<readonly EnrolledCertHeader[]>(() =>
    this.courses.progress().map((p) => ({
      code: p.programCode,
      family: resolveCertFamily(p.programCode),
      familyLabel: p.programCode.split('-')[0],
      certType: '',
      fullName: p.title,
      badgeAsset: resolveBadgeAsset(p.programCode),
      progressPercent: Math.round(p.percentComplete),
      isActive: true,
      hasCertificate: false,
    })),
  );

  ngOnInit(): void {
    void this.courses.loadProgress();
  }

  protected onViewDetails(code: string): void {
    void this.router.navigate(['/dashboard/certificates', code]);
  }
}

export default CertificatesPage;
