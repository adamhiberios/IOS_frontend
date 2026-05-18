import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideChartBar,
  LucideClock,
  LucidePercent,
  LucideTrendingUp,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { CanadaFlag, CertificatesBadge, DonutChart, IosIcon, LineChart, provideIcons } from '@ui';

import { DashboardNavbar } from '@layouts';
import { CertLearningMaterials } from '../components/cert-learning-materials';
import { CertMockTest } from '../components/cert-mock-test';
import { CertSideNav } from '../components/cert-side-nav';
import type { CertDetailSection, MockTestSettings } from '../data-access/certificates.model';
import { CertificatesStore } from '../data-access/certificates.store';

/**
 * `ios-cert-detail-page` — Certificate detail view.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────────────┐
 * │  DashboardNavbar                                                           │
 * │  [← Back] breadcrumb                     [Start Final Test]               │
 * │                                                                            │
 * │  ┌─ side nav (228px) ──┐  ┌─ content ──────────────────────────────────┐  │
 * │  │   Overview          │  │  OVERVIEW:   4 stat cards                  │  │
 * │  │ • Learning Materials│  │             row 1: [Learning] [Cert card]  │  │
 * │  │   Mock test         │  │             row 2: [Line chart] [Donut]    │  │
 * │  └─────────────────────┘  │  MATERIALS: [Cert banner] + files list     │  │
 * │                           └────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13567-14984 (overview) / 13567-15374 (learning materials).
 */
@Component({
  selector: 'ios-cert-detail-page',
  imports: [
    NgOptimizedImage,
    DashboardNavbar,
    CertSideNav,
    CertLearningMaterials,
    CertMockTest,
    LineChart,
    DonutChart,
    CertificatesBadge,
    RouterLink,
    IosIcon,
    CanadaFlag,
  ],
  providers: [
    provideIcons(
      LucideArrowLeft,
      LucideArrowRight,
      LucidePercent,
      LucideClock,
      LucideTrendingUp,
      LucideChartBar,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-6">
          <!-- ── Breadcrumb row ── -->
          <div class="flex items-center justify-between mb-6">
            <!-- Back arrow + breadcrumb -->
            <div class="flex items-center gap-3">
              <a
                routerLink="/dashboard/certificates"
                class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('dashboard.certs.backToCertificates')"
              >
                <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </a>
              <nav aria-label="Breadcrumb">
                <ol
                  class="flex items-center gap-3 text-[16px] font-medium leading-[1.4] text-ios-fg-8"
                  role="list"
                >
                  <li>
                    <span>{{ lang.t('dashboard.breadcrumb.dashboard') }}</span>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <a
                      routerLink="/dashboard/certificates"
                      class="hover:text-ios-fg-10 transition-colors"
                    >
                      {{ lang.t('dashboard.nav.myCertificates') }}
                    </a>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <span class="text-ios-fg-13 font-semibold">{{ detail()?.code ?? '—' }}</span>
                  </li>
                </ol>
              </nav>
            </div>

            <!-- Start Final Test CTA — only shown at high completion -->
            @if (showFinalTestCta()) {
              <a
                routerLink="/assessments/verify"
                class="inline-flex items-center justify-center h-11 px-6 rounded-2xl text-[16px] font-semibold text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('dashboard.certs.startFinalTest') }}
              </a>
            }
          </div>

          <!-- ── Side nav + content grid ── -->
          <div class="flex gap-6 items-start">
            <!-- Left side nav -->
            <ios-cert-side-nav
              [activeSection]="store.activeSection()"
              (sectionChange)="store.setActiveSection($event)"
            />

            <!-- Right content (flex-1) -->
            <div class="flex flex-col gap-6 flex-1 min-w-0">
              <!-- ══════════════════════════════════════════════
                   OVERVIEW section
              ══════════════════════════════════════════════ -->
              @if (store.activeSection() === 'overview') {
                <!-- ── 4 Stat cards ── -->
                <section aria-label="Certification statistics" class="grid grid-cols-4 gap-4">
                  <!-- Overall Completion -->
                  <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                    <ios-icon
                      name="chart-bar"
                      class="w-8 h-8 text-ios-fg shrink-0"
                      aria-hidden="true"
                    />
                    <div class="flex flex-col min-w-0">
                      <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                        {{ detail()?.stats?.completionPercent ?? 0 }}%
                      </span>
                      <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                        {{ lang.t('dashboard.certs.overallCompletion') }}
                      </span>
                    </div>
                  </div>

                  <!-- Average Mock Score -->
                  <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                    <ios-icon
                      name="percent"
                      class="w-8 h-8 text-ios-fg shrink-0"
                      aria-hidden="true"
                    />
                    <div class="flex flex-col min-w-0">
                      <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                        {{ store.averageScoreFormatted() }}
                      </span>
                      <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                        {{ lang.t('dashboard.certs.averageMockScore') }}
                      </span>
                    </div>
                  </div>

                  <!-- Time Spent -->
                  <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                    <ios-icon
                      name="clock"
                      class="w-8 h-8 text-ios-fg shrink-0"
                      aria-hidden="true"
                    />
                    <div class="flex flex-col min-w-0">
                      <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                        {{ store.totalTimeFormatted() }}
                      </span>
                      <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                        {{ lang.t('dashboard.certs.timeSpent') }}
                      </span>
                    </div>
                  </div>

                  <!-- Trend -->
                  <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                    <ios-icon
                      name="trending-up"
                      class="w-8 h-8 text-ios-fg shrink-0"
                      aria-hidden="true"
                    />
                    <div class="flex flex-col min-w-0">
                      <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                        {{ store.trendFormatted() }}
                      </span>
                      <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                        {{ lang.t('dashboard.certs.trend') }}
                      </span>
                    </div>
                  </div>
                </section>

                <!-- ── Row 1: "Complete your learning" + "Certification" ── -->
                @if (detail()) {
                  <section aria-label="Learning progress" class="grid grid-cols-[1fr_354px] gap-6">
                    <!-- "Complete your learning" -->
                    <div class="flex flex-col gap-3">
                      <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
                        {{ lang.t('dashboard.learning.title') }}
                      </h2>

                      <div
                        class="bg-ios-surface-muted rounded-2xl px-4 py-6 flex items-start gap-6 flex-1"
                      >
                        <!-- test.svg illustration -->
                        <img
                          ngSrc="assets/icons/test.svg"
                          alt=""
                          class="w-[148px] h-[148px] object-contain shrink-0"
                          width="148"
                          height="148"
                          loading="lazy"
                          decoding="async"
                          aria-hidden="true"
                        />

                        <!-- Text + CTA -->
                        <div class="flex flex-col gap-6 flex-1 min-w-0 pt-[18px]">
                          <div class="flex flex-col gap-1">
                            <p class="text-[18px] font-bold leading-[1.2] text-ios-fg">
                              {{ detail()!.learningHeading }}
                            </p>
                            <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-10">
                              {{ detail()!.learningBody }}
                            </p>
                            @if (detail()!.learningMeta) {
                              <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-8">
                                {{ detail()!.learningMeta }}
                              </p>
                            }
                          </div>
                          <div class="flex justify-end">
                            <button
                              type="button"
                              class="inline-flex items-center justify-center h-11 px-6 rounded-2xl text-[16px] font-semibold text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                            >
                              {{ detail()!.learningCtaLabel }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- "Certification" card -->
                    <div class="flex flex-col gap-3">
                      <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
                        {{ lang.t('dashboard.certs.certification') }}
                      </h2>

                      <div
                        class="bg-cer-blue-soft rounded-2xl px-6 py-4 flex flex-col gap-3 flex-1 justify-center"
                      >
                        <!-- Badge + code + name row -->
                        <div class="flex items-center gap-4">
                          <div class="relative shrink-0" style="width:98px;">
                            <ios-certificates-badge
                              [svgPath]="detail()!.certificationCard.imageAsset"
                              [code]="detail()!.certificationCard.code"
                              [fullName]="detail()!.certificationCard.title"
                              class="block"
                            />
                            <!-- Active indicator dot -->
                            <span
                              class="absolute top-2 -end-1.5 w-3 h-3 rounded-full bg-ios-success-mid border-2 border-white"
                              [attr.aria-label]="lang.t('dashboard.certs.active')"
                            ></span>
                          </div>
                          <div class="flex flex-col min-w-0">
                            <p
                              class="text-[18px] font-bold leading-[1.2] text-ios-fg whitespace-nowrap"
                            >
                              {{ detail()!.certificationCard.code }}
                            </p>
                            <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-10">
                              {{ detail()!.certificationCard.title }}
                            </p>
                          </div>
                        </div>

                        <!-- Progress + Show details row -->
                        <div class="flex items-center justify-between gap-4">
                          <p
                            class="text-[14px] font-semibold leading-[1.4] text-ios-fg-10 whitespace-nowrap"
                          >
                            {{ detail()!.certificationCard.progressPercent
                            }}{{ lang.t('dashboard.certs.percentCompleted') }}
                          </p>
                          <button
                            type="button"
                            class="inline-flex items-center justify-center gap-1 h-9 px-6 rounded-xl text-[14px] font-semibold leading-[1.4] text-ios-fg-8 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 whitespace-nowrap"
                            (click)="onShowDetails()"
                          >
                            {{ lang.t('dashboard.certs.showDetails') }}
                            <ios-icon
                              name="arrow-right"
                              class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                }

                <!-- ── Row 2: Mock test scores (line) + Total mock test Taken (donut) ── -->
                @if (detail()) {
                  <section
                    aria-label="Mock test performance"
                    class="grid grid-cols-[1fr_354px] gap-6 items-stretch"
                  >
                    <ios-line-chart
                      [scores]="detail()!.weeklyScores"
                      [weekFilter]="store.weekFilter()"
                      (filterChange)="store.setWeekFilter($event)"
                    />
                    <ios-donut-chart [summary]="detail()!.examSummary" />
                  </section>
                }
              }
              <!-- end @if overview -->

              <!-- ══════════════════════════════════════════════
                   LEARNING MATERIALS section
              ══════════════════════════════════════════════ -->
              @if (store.activeSection() === 'materials') {
                @if (detail()) {
                  <ios-cert-learning-materials
                    [cert]="detail()!.certificationCard"
                    [materials]="detail()!.learningMaterials"
                    (open)="onMaterialOpen($event)"
                  />
                }
              }

              <!-- ══════════════════════════════════════════════
                   MOCK TEST section
              ══════════════════════════════════════════════ -->
              @if (store.activeSection() === 'mock-test') {
                @if (detail()) {
                  <ios-cert-mock-test
                    [cert]="detail()!.certificationCard"
                    [stats]="detail()!.mockTestStats"
                    [history]="detail()!.mockTestHistory"
                    (startTest)="onStartTest($event)"
                    class="flex flex-col gap-6"
                  />
                }
              }
            </div>
            <!-- end right content -->
          </div>
          <!-- end side nav + content grid -->
        </div>
      </main>

      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class CertDetailPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CertificatesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  protected readonly detail = computed(() => this.store.selectedDetail());

  /** Show "Start Final Test" CTA when completion ≥ 80%. */
  protected readonly showFinalTestCta = computed(
    () => (this.detail()?.stats?.completionPercent ?? 0) >= 80,
  );

  protected onShowDetails(): void {
    // Navigate to cert list / trigger detail action — wired up when routing is finalised.
  }

  protected onSectionChange(section: CertDetailSection): void {
    this.store.setActiveSection(section);
  }

  /** Navigate to the mock test runner when the user clicks "Start" in the settings dialog. */
  protected onStartTest(settings: MockTestSettings): void {
    const code = this.route.snapshot.params['code'] as string;
    const queryParams: Record<string, string> = { count: String(settings.questionCount) };
    if (settings.timeMinutes !== null) {
      queryParams['time'] = String(settings.timeMinutes);
    }
    void this.router.navigate(['/dashboard/certificates', code, 'mock-test'], { queryParams });
  }

  /** Navigate to the session viewer when a file row CTA is clicked. */
  protected onMaterialOpen(materialId: string): void {
    const code = this.route.snapshot.params['code'] as string;
    void this.router.navigate(['/dashboard/certificates', code, 'session', materialId]);
  }
}

export default CertDetailPage;
