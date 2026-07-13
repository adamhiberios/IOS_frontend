import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideClock, LucideFileText, LucidePercent } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon } from '@ui';
import { provideIcons } from '@ui';

import { BarChart, DonutChart } from '@ui';

import { CertProgressCard } from '../components/cert-progress-card';
import { DashboardNavbar } from '@layouts';
import { LearningCard } from '../components/learning-card';
import { DashboardStatCard } from '../components/stat-card';
import { DashboardStore } from '../data-access/dashboard.store';

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
    RouterLink,
    IosIcon,
  ],
  providers: [provideIcons(LucideFileText, LucidePercent, LucideClock, LucideArrowLeft)],
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
                    lang.t('dashboard.breadcrumb.overview')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
          <!-- ── Stat cards ── -->
          <section
            aria-label="Overview statistics"
            class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
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
            <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
              <!-- ── Col 1 ── -->
              <div class="flex flex-col gap-6">
                <!-- Row 1: Bar + Donut — equal height via items-stretch -->
                <section
                  aria-label="Performance charts"
                  class="grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-4 items-stretch"
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
                    <h2 class="text-[18px] font-semibold leading-[1.3] text-ios-fg-13 mb-4">
                      {{ lang.t('dashboard.certs.validCertification') }}
                    </h2>
                    @if (certCount() === 1) {
                      <div class="max-w-[440px]">
                        <ios-cert-progress-card [cert]="certs()[0]" />
                      </div>
                    } @else {
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <section
              aria-label="Performance charts"
              class="grid grid-cols-1 sm:grid-cols-[1fr_320px] gap-4"
            >
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
            class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
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

  protected readonly learningCard = computed(() => this.store.learningCard());
  protected readonly certs = computed(() => this.store.validCertifications());
  protected readonly certCount = computed(() => this.certs().length);
}

export default DashboardOverviewPage;
