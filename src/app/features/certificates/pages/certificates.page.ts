import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { LanguageService } from '@core/i18n';
import { CanadaFlag } from '@ui';

import { DashboardNavbar } from '@layouts';
import { CertGridCard } from '../components/cert-grid-card';
import { EnrolledCertRow } from '../components/enrolled-cert-row';
import { type CertDemoMode, CertificatesStore } from '../data-access/certificates.store';

@Component({
  selector: 'ios-certificates-page',
  imports: [DashboardNavbar, EnrolledCertRow, CertGridCard, CanadaFlag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <!-- Breadcrumb -->
        <div class="w-full border-b border-ios-border-light">
          <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <nav aria-label="Breadcrumb">
              <ol class="flex items-center gap-1.5 text-sm text-ios-fg-7" role="list">
                <li>
                  <span>{{ lang.t('dashboard.breadcrumb.dashboard') }}</span>
                </li>
                <li aria-hidden="true" class="text-ios-fg-7">/</li>
                <li>
                  <span class="text-ios-fg font-normal">{{
                    lang.t('dashboard.nav.myCertificates')
                  }}</span>
                </li>
              </ol>
            </nav>

            <!-- Dev helper — remove before production -->
            <div class="flex items-center gap-2 select-none" aria-label="Demo mode switcher">
              <span class="text-xs text-ios-fg-7 font-medium">Demo:</span>
              @for (mode of demoModes; track mode.value) {
                <button
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  [class.bg-ios-brand-gold]="store.demoMode() === mode.value"
                  [class.text-ios-fg-13]="store.demoMode() === mode.value"
                  [class.bg-ios-surface-soft]="store.demoMode() !== mode.value"
                  [class.text-ios-fg-8]="store.demoMode() !== mode.value"
                  (click)="store.setDemoMode(mode.value)"
                >
                  {{ mode.label }}
                </button>
              }
            </div>
          </div>
        </div>

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

  protected readonly demoModes: { value: CertDemoMode; label: string }[] = [
    { value: 'one-cert-low', label: '1 cert 12%' },
    { value: 'one-cert-high', label: '1 cert 95%' },
    { value: 'two-certs-low', label: '2 certs 12%' },
    { value: 'two-certs-high', label: '2 certs 95%' },
  ];

  protected onViewDetails(code: string): void {
    void this.router.navigate(['/dashboard/certificates', code]);
  }
}

export default CertificatesPage;
