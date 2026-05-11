/**
 * `ios-about-mock-exam-page` — public "About Mock Exam" page.
 *
 * Structure (top → bottom):
 *   1. Navbar        — reuses ios-landing-navbar
 *   2. Hero banner   — dark-red bg, breadcrumb + "About Mock test" title
 *   3. What is a Mock test? — cream bg, descriptive copy + image with pass-rate badge
 *   4. Why Take a Mock test? — dark-red left panel (mock exam icon + pills) + benefits list on right
 *   5. How Our Mock Exams Work — numbered steps on left + dark mock-exam preview card on right
 *   6. Training with Mock Exam CTA — image + white CTA card
 *   7. Feel free to get in touch — icon + heading on left, contact form on right
 *   8. Footer        — reuses ios-landing-footer
 *
 * All text is routed through `LanguageService.t()` for EN / AR / FR i18n.
 * Keys live under the `mockExam.*` namespace in assets/i18n/*.json.
 * Form validation follows the project convention (Typed Reactive Forms + NonNullableFormBuilder).
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'; // signal kept for benefits/steps/answerOptions
import { NgOptimizedImage } from '@angular/common';
import {
  LucideArrowRight,
  LucideBrain,
  LucideTarget,
  LucideClock,
  LucideNetwork,
  LucideBookOpen,
  LucideChartBar,
  LucideSquareCheck,
  LucidePlay,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';
import type { LucideIconName } from '@ui/icon/icon-names';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';
import { LandingContactSection } from '../components/contact-section';

// ─── Local interfaces ────────────────────────────────────────────────────────

/** One benefit row in the "Why Take a Mock test?" section. */
interface Benefit {
  /** Valid kebab-case Lucide icon name registered via provideIcons(). */
  icon: LucideIconName;
  /** i18n key under `mockExam.why.benefits.*` */
  key: string;
}

/** One numbered step in the "How It Works" section. */
interface Step {
  num: string;
  /** i18n key under `mockExam.howItWorks.steps.<num>.title` */
  titleKey: string;
  /** i18n key under `mockExam.howItWorks.steps.<num>.body` */
  bodyKey: string;
}

/** One answer option in the mock exam preview card. */
interface AnswerOption {
  key: string;
  /** i18n key under `mockExam.howItWorks.preview.option<key>` */
  textKey: string;
  selected: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'ios-about-mock-exam-page',
  imports: [
    NgOptimizedImage,
    LandingNavbar,
    LandingFooter,
    PageHero,
    IosIcon,
    ScrollToTop,
    LandingContactSection,
  ],
  providers: [
    provideIcons(
      LucideArrowRight,
      LucideBrain,
      LucideTarget,
      LucideClock,
      LucideNetwork,
      LucideBookOpen,
      LucideChartBar,
      LucideSquareCheck,
      LucidePlay,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════════════════
         1. Navbar
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-navbar />

    <!-- ═══════════════════════════════════════════════════════════
         2. Hero banner
    ═══════════════════════════════════════════════════════════ -->
    <ios-page-hero
      [title]="lang.t('mockExam.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('mockExam.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('mockExam.hero.back')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. What is a Mock test?
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-ios-surface-warm px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      aria-labelledby="what-is-mock-heading"
    >
      <!-- Badge + heading + divider -->
      <div class="flex flex-col items-center gap-4 text-center mb-10">
        <span
          class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
        >
          {{ lang.t('mockExam.whatIs.badge') }}
        </span>

        <div class="flex flex-col gap-3 items-center w-full">
          <h2
            id="what-is-mock-heading"
            class="font-heading font-extrabold text-[36px] leading-[1.2] text-ios-brand-dark"
          >
            {{ lang.t('mockExam.whatIs.heading1')
            }}<span class="text-ios-brand-primary">{{ lang.t('mockExam.whatIs.heading2') }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted max-w-2xl">
            {{ lang.t('mockExam.whatIs.description') }}
          </p>
        </div>

        <div class="w-[180px] h-1 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
      </div>

      <!-- Image card with pass-rate badge -->
      <div class="relative mx-auto max-w-[1032px] pb-8">
        <!-- Depth shadow -->
        <div
          class="absolute inset-0 translate-y-3 translate-x-3 rounded-2xl bg-ios-brand-primary opacity-[0.07]"
          aria-hidden="true"
        ></div>

        <!-- Main image -->
        <div class="relative rounded-2xl overflow-hidden shadow-xl">
          <img
            [ngSrc]="'/assets/images/about_mock_test.jpg'"
            [attr.alt]="lang.t('mockExam.whatIs.imageAlt')"
            class="w-full h-[440px] object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>

        <!-- 90% Pass Rate badge -->
        <div
          class="absolute bottom-[-8px] start-0
                 flex items-center gap-4
                 bg-white border-2 border-[#d4a017] rounded-[14px]
                 shadow-[0_20px_25px_0_rgba(0,0,0,0.1),0_8px_10px_0_rgba(0,0,0,0.1)]
                 px-5 py-4"
          role="img"
          [attr.aria-label]="
            lang.t('mockExam.whatIs.passRate') + ' — ' + lang.t('mockExam.whatIs.passRateLocation')
          "
        >
          <div
            class="flex items-center justify-center w-10 h-10 rounded-[10px] bg-ios-brand-primary shrink-0"
            aria-hidden="true"
          >
            <ios-icon name="chart-bar" class="w-5 h-5 text-white" />
          </div>
          <div class="flex flex-col whitespace-nowrap">
            <span class="font-body font-black text-[24px] leading-8 text-ios-brand-primary">
              {{ lang.t('mockExam.whatIs.passRate') }}
            </span>
            <span class="font-body font-normal text-[14px] leading-5 text-[#6a7282]">
              {{ lang.t('mockExam.whatIs.passRateLocation') }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Why Take a Mock test?
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-white px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      aria-labelledby="why-mock-heading"
    >
      <div class="flex flex-col lg:flex-row gap-12 items-stretch">
        <!-- Left panel — dark red -->
        <div
          class="relative bg-[#760000] rounded-2xl overflow-hidden
                 flex flex-col gap-5 p-8 flex-1 min-w-0"
        >
          <!-- Decorative circles -->
          <div
            class="absolute top-[-80px] end-[-80px] w-40 h-40 rounded-full bg-[rgba(212,160,23,0.12)]"
            aria-hidden="true"
          ></div>
          <div
            class="absolute bottom-[-62px] start-[-62px] w-32 h-32 rounded-full bg-[rgba(212,160,23,0.08)]"
            aria-hidden="true"
          ></div>

          <!-- Mock exam icon -->
          <div
            class="relative bg-[#a02e2e] rounded-2xl flex items-center justify-center
                   w-full max-w-[163px] h-[176px] mx-auto"
            aria-hidden="true"
          >
            <ios-icon name="brain" class="w-16 h-16 text-ios-brand-gold" />
          </div>

          <!-- Badge + heading + rule -->
          <div class="flex flex-col gap-3">
            <span
              class="self-start inline-flex items-center justify-center px-6 py-2 rounded-full
                     bg-ios-brand-yellow-soft border border-ios-brand-gold
                     font-body font-semibold text-[14px] text-ios-brand-primary"
            >
              {{ lang.t('mockExam.why.badge') }}
            </span>
            <h2
              id="why-mock-heading"
              class="font-heading font-extrabold text-[30px] leading-[1.2] text-white"
            >
              {{ lang.t('mockExam.why.heading1')
              }}<span class="text-ios-brand-yellow-bright">{{
                lang.t('mockExam.why.heading2')
              }}</span>
            </h2>
            <div
              class="w-[81px] h-1 rounded-full bg-ios-brand-yellow-bright"
              aria-hidden="true"
            ></div>
          </div>

          <!-- Stat pills -->
          <div class="flex gap-3" role="list" [attr.aria-label]="lang.t('mockExam.why.badge')">
            <div
              class="flex-1 flex items-center justify-center px-3 py-2 rounded-full
                     bg-[#a02e2e] border border-[#b65e5e] text-center"
              role="listitem"
            >
              <span
                class="font-heading font-medium text-[14px] leading-[1.4] text-white whitespace-nowrap"
              >
                {{ lang.t('mockExam.why.pills.questions') }}
              </span>
            </div>
            <div
              class="flex-1 flex items-center justify-center px-3 py-2 rounded-full
                     bg-[#a02e2e] border border-[#b65e5e] text-center"
              role="listitem"
            >
              <span
                class="font-heading font-medium text-[14px] leading-[1.4] text-white whitespace-nowrap"
              >
                {{ lang.t('mockExam.why.pills.timer') }}
              </span>
            </div>
            <div
              class="flex-1 flex items-center justify-center px-3 py-2 rounded-full
                     bg-[#a02e2e] border border-[#b65e5e] text-center"
              role="listitem"
            >
              <span
                class="font-heading font-medium text-[14px] leading-[1.4] text-white whitespace-nowrap"
              >
                {{ lang.t('mockExam.why.pills.score') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right panel — benefits list -->
        <div class="flex flex-col gap-4 flex-1 justify-center">
          @for (benefit of benefits(); track benefit.key) {
            <div
              class="flex items-center gap-6 px-4 py-4 rounded-[14px]
                     bg-ios-surface-warm border border-ios-brand-gold"
            >
              <!-- Icon badge -->
              <div
                class="shrink-0 flex items-center justify-center w-9 h-9 rounded-[10px]
                       bg-ios-brand-yellow-soft border border-[#ffe477]"
                aria-hidden="true"
              >
                <ios-icon [name]="benefit.icon" class="w-5 h-5 text-ios-brand-primary" />
              </div>
              <!-- Label -->
              <p class="flex-1 font-body font-medium text-[14px] leading-5 text-ios-brand-dark">
                {{ lang.t('mockExam.why.benefits.' + benefit.key) }}
              </p>
              <!-- Check indicator -->
              <ios-icon
                name="square-check"
                class="shrink-0 w-5 h-5 text-ios-brand-primary"
                aria-hidden="true"
              />
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         5. How Our Mock Exams Work
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-ios-surface-warm px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      aria-labelledby="how-it-works-heading"
    >
      <div class="flex flex-col lg:flex-row gap-12 items-stretch">
        <!-- Left — numbered steps -->
        <div class="flex flex-col gap-5 flex-1 min-w-0">
          <!-- Badge + heading + rule -->
          <div class="flex flex-col gap-3">
            <span
              class="self-start inline-flex items-center justify-center px-6 py-2 rounded-full
                     bg-ios-brand-yellow-soft border border-ios-brand-gold
                     font-body font-semibold text-[14px] text-ios-brand-primary"
            >
              {{ lang.t('mockExam.howItWorks.badge') }}
            </span>
            <div class="flex flex-col gap-3">
              <h2
                id="how-it-works-heading"
                class="font-heading font-extrabold text-[30px] leading-[1.2] text-ios-brand-dark"
              >
                {{ lang.t('mockExam.howItWorks.heading1')
                }}<span class="text-ios-brand-primary">{{
                  lang.t('mockExam.howItWorks.heading2')
                }}</span>
              </h2>
              <p class="font-body font-medium text-[14px] leading-[1.4] text-ios-fg-muted">
                {{ lang.t('mockExam.howItWorks.description') }}
              </p>
              <div class="w-14 h-1 rounded-full bg-ios-brand-amber" aria-hidden="true"></div>
            </div>
          </div>

          <!-- Steps list -->
          <ol class="flex flex-col gap-4" [attr.aria-label]="lang.t('mockExam.howItWorks.badge')">
            @for (step of steps(); track step.num) {
              <li class="flex gap-3 items-start">
                <div class="flex items-center pt-0.5 shrink-0">
                  <div
                    class="flex items-center justify-center w-9 h-9 rounded-[12px] bg-ios-brand-primary"
                    aria-hidden="true"
                  >
                    <span class="font-body font-extrabold text-[13px] text-white">
                      {{ step.num }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-col gap-0.5">
                  <p class="font-body font-bold text-[15px] leading-[1.4] text-[#101828]">
                    {{ lang.t('mockExam.howItWorks.steps.' + step.num + '.title') }}
                  </p>
                  <p class="font-body font-normal text-[13px] leading-[1.5] text-[#6a7282]">
                    {{ lang.t('mockExam.howItWorks.steps.' + step.num + '.body') }}
                  </p>
                </div>
              </li>
            }
          </ol>
        </div>

        <!-- Right — mock exam preview card -->
        <div
          class="relative bg-ios-brand-dark rounded-2xl overflow-hidden p-5 flex flex-col gap-4 flex-1 min-w-0"
          role="img"
          [attr.aria-label]="lang.t('mockExam.howItWorks.preview.title')"
        >
          <!-- Decorative glow -->
          <div
            class="absolute top-[-62px] end-[443px] w-[186px] h-[186px] rounded-full bg-ios-brand-amber opacity-[0.04]"
            aria-hidden="true"
          ></div>

          <!-- Header row -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-body font-extrabold text-[16px] text-white leading-6">
                {{ lang.t('mockExam.howItWorks.preview.title') }}
              </p>
              <p class="font-body font-normal text-[12px] text-white/50 leading-4 mt-0.5">
                {{ lang.t('mockExam.howItWorks.preview.subtitle') }}
              </p>
            </div>
            <div
              class="flex items-center gap-2 h-8 px-3 py-1.5 rounded-[10px] bg-[#373837]"
              aria-label="Time remaining: 12:00"
            >
              <ios-icon name="clock" class="w-5 h-5 text-ios-brand-gold" aria-hidden="true" />
              <span class="font-body font-bold text-[14px] text-ios-brand-gold">12:00</span>
            </div>
          </div>

          <!-- Gold progress indicator -->
          <div
            class="w-full h-1 rounded-full bg-ios-brand-gold"
            role="progressbar"
            aria-valuenow="12"
            aria-valuemin="0"
            aria-valuemax="50"
            [attr.aria-label]="lang.t('mockExam.howItWorks.preview.subtitle')"
          ></div>

          <!-- Question text -->
          <div class="flex flex-col gap-2">
            <p class="font-heading font-medium text-[14px] text-white/50 leading-[1.4]">
              {{ lang.t('mockExam.howItWorks.preview.questionLabel') }}
            </p>
            <p class="font-body font-medium text-[16px] text-white leading-[1.4]">
              {{ lang.t('mockExam.howItWorks.preview.question') }}
            </p>
          </div>

          <!-- Answer options -->
          <div
            class="flex flex-col gap-3"
            role="radiogroup"
            [attr.aria-label]="lang.t('mockExam.howItWorks.preview.questionLabel')"
          >
            @for (option of answerOptions(); track option.key) {
              <div
                class="flex items-center gap-3 p-[9px] rounded-[14px] border"
                [class.bg-[#736428]]="option.selected"
                [class.border-ios-brand-gold]="option.selected"
                [class.bg-[#303130]]="!option.selected"
                [class.border-[#535453]]="!option.selected"
              >
                <div
                  class="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                  [class.bg-ios-brand-yellow-bright]="option.selected"
                  [class.text-[#736428]]="option.selected"
                  [class.bg-[#535453]]="!option.selected"
                  [class.text-[#c4c5c4]]="!option.selected"
                  aria-hidden="true"
                >
                  <span class="font-heading font-medium text-[14px] leading-[1.4]">
                    {{ option.key }}
                  </span>
                </div>
                <p
                  class="flex-1 font-heading text-[14px] leading-[1.4]"
                  [class.font-semibold]="option.selected"
                  [class.text-[#fffcee]]="option.selected"
                  [class.font-medium]="!option.selected"
                  [class.text-[#f1f1f1]]="!option.selected"
                >
                  {{ lang.t('mockExam.howItWorks.preview.option' + option.key) }}
                </p>
              </div>
            }
          </div>

          <!-- Progress bar -->
          <div class="flex flex-col gap-2">
            <div
              class="flex items-center justify-between font-heading font-medium text-[14px] text-white/40"
            >
              <span>{{ lang.t('mockExam.howItWorks.preview.progressLabel') }}</span>
              <span>12 / 50</span>
            </div>
            <div class="w-full h-2 rounded-full bg-[#373837]">
              <div class="h-2 w-[24%] rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
            </div>
          </div>

          <!-- CTA button -->
          <button
            type="button"
            class="w-full flex items-center justify-center gap-3 h-11 rounded-xl
                   bg-ios-brand-primary text-ios-brand-primary-soft
                   font-body font-semibold text-[16px] leading-[1.4]
                   hover:bg-ios-brand-primary-hover transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ios-icon name="play" class="w-6 h-6" aria-hidden="true" />
            {{ lang.t('mockExam.howItWorks.preview.cta') }}
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         6. Training with Mock Exam — CTA banner
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      aria-labelledby="training-cta-heading"
    >
      <div class="relative">
        <!-- Background image with gradient fade — constrained so CTA card extends beyond it -->
        <div class="relative rounded-2xl overflow-hidden h-[495px] max-w-[700px] mx-auto">
          <img
            [ngSrc]="'/assets/images/about_mock_test.jpg'"
            alt=""
            aria-hidden="true"
            class="w-full h-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
          <div
            class="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-b from-transparent to-white"
            aria-hidden="true"
          ></div>
        </div>

        <!-- White CTA card — full width, overhangs the image on both sides -->
        <div
          class="relative -mt-16
                 bg-white border border-ios-border-light rounded-2xl
                 shadow-[0_-6px_15px_rgba(0,0,0,0.1)]
                 px-6 py-8"
        >
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="flex flex-col gap-2">
              <h2
                id="training-cta-heading"
                class="font-heading font-extrabold text-[36px] leading-[1.2] text-ios-brand-dark"
              >
                {{ lang.t('mockExam.training.heading1')
                }}<span class="text-ios-brand-primary">{{
                  lang.t('mockExam.training.heading2')
                }}</span>
              </h2>
              <p
                class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted max-w-2xl mx-auto"
              >
                {{ lang.t('mockExam.training.description') }}
              </p>
            </div>

            <div class="w-[172px] h-1 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>

            <a
              href="#"
              (click)="$event.preventDefault()"
              class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                     bg-ios-brand-primary-soft text-ios-brand-primary-deep
                     font-body font-semibold text-[16px] leading-[1.4]
                     hover:bg-ios-brand-primary hover:text-white transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('mockExam.training.cta') }}
              <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         7. Feel free to get in touch
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-contact-section namespace="mockExam.contact" />

    <!-- ═══════════════════════════════════════════════════════════
         8. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />

    <!-- Scroll-to-top -->
    <ios-scroll-to-top />
  `,
})
export class AboutMockExamPage {
  protected readonly lang = inject(LanguageService);

  // ── Static data ───────────────────────────────────────────────────────────

  /** Benefit rows — icons are typed as LucideIconName and must be registered in provideIcons(). */
  protected readonly benefits = signal<Benefit[]>([
    { icon: 'brain', key: 'anxiety' },
    { icon: 'target', key: 'gaps' },
    { icon: 'clock', key: 'time' },
    { icon: 'network', key: 'simulate' },
    { icon: 'book-open', key: 'confidence' },
    { icon: 'chart-bar', key: 'progress' },
  ]);

  /** Step numbers — titles and bodies are loaded from i18n at render time. */
  protected readonly steps = signal<Step[]>([
    { num: '01', titleKey: 'title', bodyKey: 'body' },
    { num: '02', titleKey: 'title', bodyKey: 'body' },
    { num: '03', titleKey: 'title', bodyKey: 'body' },
    { num: '04', titleKey: 'title', bodyKey: 'body' },
    { num: '05', titleKey: 'title', bodyKey: 'body' },
  ]);

  /** Answer options for the preview card. Option B is pre-selected (highlighted). */
  protected readonly answerOptions = signal<AnswerOption[]>([
    { key: 'A', textKey: 'optionA', selected: false },
    { key: 'B', textKey: 'optionB', selected: true },
    { key: 'C', textKey: 'optionC', selected: false },
    { key: 'D', textKey: 'optionD', selected: false },
  ]);
}
