import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon, provideIcons } from '@ui';

import { DashboardNavbar } from '@layouts';
import { CertGridCard } from '../components/cert-grid-card';
import { EnrolledCertRow } from '../components/enrolled-cert-row';
import { CertificatesStore } from '../data-access/certificates.store';

@Component({
  selector: 'ios-certificates-page',
  imports: [DashboardNavbar, EnrolledCertRow, CertGridCard, CanadaFlag, RouterLink, IosIcon],
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
        <!-- Hero sections — one per enrolled cert, full-width background -->
        @if (store.enrolledCerts().length > 0) {
          @for (cert of store.enrolledCerts(); track cert.code) {
            <ios-enrolled-cert-row [cert]="cert" (viewDetails)="onViewDetails($event)" />
          }
        }

        <!-- All certifications -->
        <section aria-label="All certifications" class="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
          <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 mb-3">
            {{ lang.t('dashboard.allCertifications') }}
          </h2>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            @for (card of store.allCerts(); track card.code) {
              <ios-cert-grid-card [card]="card" (viewDetails)="onViewDetails($event)" />
            }
          </div>
        </section>
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
export class CertificatesPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CertificatesStore);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  protected onViewDetails(code: string): void {
    void this.router.navigate(['/dashboard/certificates', code]);
  }
}

export default CertificatesPage;
