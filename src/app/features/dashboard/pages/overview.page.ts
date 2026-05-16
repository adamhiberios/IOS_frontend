import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideClock, LucideFileText, LucidePercent } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag } from '@ui';
import { provideIcons } from '@ui';

import { BarChart, DonutChart } from '@ui';

import { CertProgressCard } from '../components/cert-progress-card';
import { DashboardNavbar } from '@layouts';
import { LearningCard } from '../components/learning-card';
import { DashboardStatCard } from '../components/stat-card';
import { DashboardStore, type DemoMode } from '../data-access/dashboard.store';

/**
 * `ios-dashboard-overview-page` — student dashboard entry point.
 *
 * ┌── Non-empty layout ──────────────────────────────────────────────────────┐
 * │  col 1 (flex-1)                             col 2 (280px)               │
 * │  ┌──────────────────────────────────────┐  ┌──────────────────────────┐ │
 * │  │ row 1: [Bar chart] [Donut chart]     │  │                          │ │
 * │  │        (same height, items-stretch)  │  │  Complete your learning  │ │
 * │  ├──────────────────────────────────────┤  │  (spans both rows)       │ │
 * │  │ row 2: Valid certification            │  │                          │ │
 * │  │        [cert cards]                  │  │                          │ │
 * │  └──────────────────────────────────────┘  └──────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── Empty layout ──────────────────────────────────────────────────────────┐
 * │  [Bar chart]                    [Donut chart]                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-dashboard-overview-page',
  imports: [
    DashboardNavbar,
    DashboardStatCard,
    BarChart,
    DonutChart,
    CertProgressCard,
    LearningCard,
    CanadaFlag,
  ],
  providers: [provideIcons(LucideFileText, LucidePercent, LucideClock)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-6">
          <!-- ── Breadcrumb + demo switcher ── -->
          <div class="flex items-center justify-between mb-6">
            <nav aria-label="Breadcrumb">
              <ol class="flex items-center gap-1.5 text-sm text-gray-400" role="list">
                <li>
                  <span>{{ lang.t('dashboard.breadcrumb.dashboard') }}</span>
                </li>
                <li aria-hidden="true" class="text-gray-300">/</li>
                <li>
                  <span class="text-ios-brand-dark font-normal">{{ breadcrumbLeaf() }}</span>
                </li>
              </ol>
            </nav>

            <!-- Dev helper — remove before production -->
            <div class="flex items-center gap-2 select-none" aria-label="Demo mode switcher">
              <span class="text-xs text-gray-400 font-medium">Demo:</span>
              @for (mode of demoModes; track mode.value) {
                <button
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  [class.bg-[#d9bd4c]]="store.demoMode() === mode.value"
                  [class.text-[#141514]]="store.demoMode() === mode.value"
                  [class.bg-[#f1f1f1]]="store.demoMode() !== mode.value"
                  [class.text-[#666766]]="store.demoMode() !== mode.value"
                  (click)="store.setDemoMode(mode.value)"
                >
                  {{ mode.label }}
                </button>
              }
            </div>
          </div>

          <!-- ── Stat cards ── -->
          <section aria-label="Overview statistics" class="grid grid-cols-3 gap-4 mb-8">
            <ios-dashboard-stat-card
              icon="file-text"
              [value]="store.programsEnrolled().toString()"
              [label]="lang.t('dashboard.stats.programsEnrolled')"
            />
            <ios-dashboard-stat-card
              icon="percent"
              [value]="store.averageScoreFormatted()"
              [label]="lang.t('dashboard.stats.averageScore')"
            />
            <ios-dashboard-stat-card
              icon="clock"
              [value]="store.totalTimeFormatted()"
              [label]="lang.t('dashboard.stats.totalTimeSpent')"
            />
          </section>

          <!-- ── Main content area ── -->

          @if (learningCard() !== null) {
            <!--
              Non-empty: 2-col outer grid
              · col 1 (flex-1) : [charts row] stacked above [cert section]
              · col 2 (280px)  : learning card spanning full height
            -->
            <div class="grid grid-cols-[1fr_280px] gap-6 items-start">
              <!-- ── Col 1 ── -->
              <div class="flex flex-col gap-6">
                <!-- Row 1: Bar + Donut — equal height via items-stretch -->
                <section
                  aria-label="Performance charts"
                  class="grid grid-cols-[1fr_240px] gap-4 items-stretch"
                >
                  <ios-bar-chart
                    [scores]="store.monthlyScores()"
                    [yearFilter]="store.yearFilter()"
                    (filterChange)="store.setYearFilter($event)"
                  />
                  <ios-donut-chart [summary]="store.examSummary()" />
                </section>

                <!-- Row 2: Valid certification -->
                @if (certCount() > 0) {
                  <section aria-label="Valid certifications">
                    <h2 class="text-[18px] font-semibold leading-[1.3] text-[#141514] mb-4">
                      {{ lang.t('dashboard.certs.validCertification') }}
                    </h2>
                    @if (certCount() === 1) {
                      <div class="max-w-[440px]">
                        <ios-cert-progress-card [cert]="certs()[0]" />
                      </div>
                    } @else {
                      <div class="grid grid-cols-2 gap-4">
                        @for (cert of certs(); track cert.code) {
                          <ios-cert-progress-card [cert]="cert" />
                        }
                      </div>
                    }
                  </section>
                }
              </div>

              <!-- ── Col 2: learning card — stretches to full col-1 height ── -->
              <ios-learning-card [card]="learningCard()!" />
            </div>
          } @else {
            <!-- Empty state: simple 2-col charts only -->
            <section aria-label="Performance charts" class="grid grid-cols-[1fr_320px] gap-4">
              <ios-bar-chart
                [scores]="store.monthlyScores()"
                [yearFilter]="store.yearFilter()"
                (filterChange)="store.setYearFilter($event)"
              />
              <ios-donut-chart [summary]="store.examSummary()" />
            </section>
          }
        </div>
      </main>

      @if (store.demoMode() !== 'empty') {
        <footer class="bg-ios-brand-dark w-full py-4">
          <div
            class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
          >
            <ios-canada-flag aria-hidden="true" />
            <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
          </div>
        </footer>
      }
    </div>
  `,
})
export class DashboardOverviewPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(DashboardStore);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  protected readonly demoModes: { value: DemoMode; label: string }[] = [
    { value: 'empty', label: 'Empty' },
    { value: 'one-cert', label: '1 Cert' },
    { value: 'two-certs', label: '2 Certs' },
  ];

  protected readonly learningCard = computed(() => this.store.learningCard());
  protected readonly certs = computed(() => this.store.validCertifications());
  protected readonly certCount = computed(() => this.certs().length);

  protected readonly breadcrumbLeaf = computed(() =>
    this.store.demoMode() !== 'empty'
      ? this.lang.t('dashboard.breadcrumb.overview')
      : this.lang.t('dashboard.breadcrumb.general'),
  );
}

export default DashboardOverviewPage;
