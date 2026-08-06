/**
 * `ios-about-scrum-page` — public "About Scrum" page.
 *
 * Structure (top → bottom), matching the Figma "About Scrum" frame
 * (node 17336:30401) 1:1 — text, colours, and sizes are taken directly from
 * the design; only the two connector diagrams (Framework roadmap, Events
 * cycle) are simplified from Figma's hand-drawn dashed bezier connectors to
 * plain CSS layout for maintainability — see inline notes on those sections.
 *
 *   1. Navbar              — ios-landing-navbar
 *   2. Page hero            — ios-page-hero (brand-primary maroon, unchanged)
 *   3. About Scrum intro    — warm bg, badge + heading + full-bleed photo +
 *                             "What Is Scrum?" two-column copy
 *   4. Scrum Framework      — white bg, 8-step roadmap + Scrum Team highlight
 *                             + Daily Scrum note + Continuous Improvement Loop
 *   5. Scrum Accountabilities — warm bg, 3 role cards + banner card
 *   6. Scrum Events         — white bg, 4-event cycle + closing sentence
 *   7. Scrum Artifacts      — warm bg, 3 numbered artifact cards
 *   8. Why Organizations Use Scrum — white bg, photo + copy card
 *   9. When and Where to Use Scrum — warm bg, copy card + photo
 *  10. Key Benefits of Scrum — white bg, heading + 6 benefit cards
 *  11. Ready to join US?   — warm bg, two CTA buttons (same pattern as
 *                             `AboutInstitutePage`'s "Ready to join" section)
 *  12. Footer               — ios-landing-footer
 *  13. Scroll-to-top
 *
 * All text is routed through `LanguageService.t()` for EN / AR / FR i18n.
 * Keys live under the `aboutScrum.*` namespace in assets/i18n/*.json.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideAward,
  LucideCode,
  LucideFlag,
  LucideGlasses,
  LucideLink,
  LucideMedal,
  LucideRefreshCcw,
  LucideRocket,
  LucideTarget,
  LucideTimer,
  LucideTriangleAlert,
  LucideUserSearch,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons, type LucideIconName } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

/** Section-header pill badge, e.g. "Services & Scoops" — exact Figma colours. */
const BADGE =
  'inline-flex items-center justify-center px-6 py-2 rounded-full border ' +
  'border-ios-brand-gold bg-ios-brand-yellow-soft ' +
  'font-heading font-semibold text-[14px] text-ios-brand-primary whitespace-nowrap';

/** Gold divider under a section heading (180px, matches Figma "Container"). */
const GOLD_BAR = 'w-[180px] h-1 rounded-full bg-ios-brand-gold';

/** Short gold underline used inside individual cards (139px). */
const GOLD_BAR_SM = 'w-[139px] h-1 rounded-full bg-ios-brand-gold';

/** White bordered card used throughout the Framework / Events diagrams. */
const DIAGRAM_CARD =
  'flex items-center gap-3 bg-white border border-ios-border-light rounded-lg p-4 md:p-6';

interface IconTextItem {
  readonly icon: string;
  readonly title: string;
  readonly desc: string;
}

interface LucideTextItem {
  readonly icon: LucideIconName;
  readonly title: string;
  readonly desc: string;
}

@Component({
  selector: 'ios-about-scrum-page',
  imports: [
    LandingNavbar,
    LandingFooter,
    PageHero,
    IosIcon,
    NgOptimizedImage,
    RouterLink,
    ScrollToTop,
  ],
  providers: [
    provideIcons(
      LucideArrowRight,
      LucideArrowUpRight,
      LucideAward,
      LucideCode,
      LucideFlag,
      LucideGlasses,
      LucideLink,
      LucideMedal,
      LucideRefreshCcw,
      LucideRocket,
      LucideTarget,
      LucideTimer,
      LucideTriangleAlert,
      LucideUserSearch,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════════════════
         1. Navbar
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-navbar />

    <!-- ═══════════════════════════════════════════════════════════
         2. Page Hero — brand-primary maroon (#8B0000), unchanged from stub
    ═══════════════════════════════════════════════════════════ -->
    <ios-page-hero
      [title]="lang.t('aboutScrum.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('aboutScrum.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('aboutScrum.hero.back')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. About Scrum intro — warm bg, badge + heading + photo + "What Is Scrum?"
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="as-intro-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] pt-[72px]">
        <div class="flex flex-col gap-4 items-center text-center">
          <span class="${BADGE}">{{ lang.t('aboutScrum.intro.badge') }}</span>
          <div class="flex flex-col gap-2 items-center">
            <h1
              id="as-intro-heading"
              class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
            >
              <span class="text-ios-brand-dark">{{ lang.t('aboutScrum.intro.heading1') }}</span>
              <span class="text-ios-brand-primary">{{ lang.t('aboutScrum.intro.heading2') }}</span>
            </h1>
            <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-mid max-w-2xl">
              {{ lang.t('aboutScrum.intro.description') }}
            </p>
          </div>
          <div class="${GOLD_BAR}" aria-hidden="true"></div>
        </div>
      </div>

      <!-- Intro photo — capped at the same 1440px column as the rest of the
           page content so it doesn't blow up past the container on huge screens. -->
      <div
        class="relative w-full max-w-[1440px] mx-auto h-[220px] md:h-[360px] lg:h-[521px] mt-[56px] overflow-hidden"
      >
        <img
          [ngSrc]="'/assets/images/about_scrum_hero.png'"
          [alt]="lang.t('aboutScrum.intro.imageAlt')"
          class="object-cover"
          fill
          priority
        />
      </div>

      <!-- "What Is Scrum?" — two-column copy -->
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[56px]">
        <div class="flex flex-col gap-4">
          <h2 class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]">
            <span class="text-ios-brand-dark">{{ lang.t('aboutScrum.whatIs.heading1') }}</span>
            <span class="text-ios-brand-primary">{{ lang.t('aboutScrum.whatIs.heading2') }}</span>
          </h2>
          <div
            class="flex flex-col md:flex-row gap-4 font-body font-medium text-[18px] leading-[1.4] text-ios-fg-11"
          >
            <p class="flex-1 min-w-0">{{ lang.t('aboutScrum.whatIs.para1') }}</p>
            <p class="flex-1 min-w-0">{{ lang.t('aboutScrum.whatIs.para2') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Scrum Framework — white bg, roadmap diagram
         NOTE: Figma renders this as one hand-drawn dashed path wrapping from
         the 4-card row, through the "Scrum Team" card, into the 3-card row
         and out to the loop note. That exact bezier connector isn't
         practical to hand-maintain in Tailwind, so it's rebuilt here as a
         vertical flow (row → connector → highlight card → connector → row →
         loop note) — same steps, numbers, icons, text and colours, simpler
         geometry.
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="as-framework-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col gap-4 items-center text-center mb-14">
          <h2
            id="as-framework-heading"
            class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutScrum.framework.heading1') }}</span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutScrum.framework.heading2')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutScrum.framework.subtitle') }}
          </p>
        </div>

        <div class="flex flex-col items-center gap-6">
          <!-- Row 1 — steps 1-4 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            @for (step of frameworkRow1(); track step.title) {
              <div class="${DIAGRAM_CARD}">
                <img
                  [ngSrc]="step.icon"
                  alt=""
                  width="79"
                  height="80"
                  class="w-[64px] h-[65px] shrink-0"
                />
                <div class="flex flex-col gap-1 min-w-0">
                  <p
                    class="font-body font-bold text-[18px] leading-[1.2] text-ios-brand-primary-deep"
                  >
                    {{ step.number }}
                  </p>
                  <p class="font-body font-bold text-[18px] leading-[1.2] text-ios-brand-dark">
                    {{ step.title }}
                  </p>
                  <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
                    {{ step.desc }}
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Connector + Daily Scrum note -->
          <div class="flex flex-col items-center gap-3" aria-hidden="true">
            <div class="w-px h-8 border-s-2 border-dashed border-ios-line"></div>
            <div class="flex items-center gap-2">
              <div
                class="flex items-center justify-center w-11 h-11 rounded-full bg-ios-brand-primary-soft border border-ios-brand-primary-mid"
              >
                <ios-icon name="refresh-ccw" class="w-5 h-5 text-ios-brand-primary" />
              </div>
              <div>
                <p class="font-body font-bold text-[14px] leading-[1.3] text-ios-fg-11">
                  {{ lang.t('aboutScrum.framework.dailyScrumTitle') }}
                </p>
                <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
                  {{ lang.t('aboutScrum.framework.dailyScrumDesc') }}
                </p>
              </div>
            </div>
            <div class="w-px h-8 border-s-2 border-dashed border-ios-line"></div>
          </div>

          <!-- Scrum Team — highlighted card -->
          <div
            class="flex items-center gap-3 bg-ios-brand-primary border border-ios-border-light rounded-lg p-4 md:p-6 w-full max-w-[480px]"
          >
            <img
              [ngSrc]="'/assets/icons/team3-exam.svg'"
              alt=""
              width="79"
              height="80"
              class="w-[64px] h-[65px] shrink-0"
            />
            <div class="flex flex-col gap-1 min-w-0">
              <p class="font-body font-bold text-[18px] leading-[1.2] text-ios-brand-primary-soft">
                5.
              </p>
              <p class="font-body font-bold text-[18px] leading-[1.2] text-white">
                {{ lang.t('aboutScrum.framework.step5Title') }}
              </p>
              <p class="font-heading font-medium text-[14px] leading-[1.4] text-white">
                {{ lang.t('aboutScrum.framework.step5Desc') }}
              </p>
            </div>
          </div>

          <div class="w-px h-8 border-s-2 border-dashed border-ios-line" aria-hidden="true"></div>

          <!-- Row 2 — steps 6-8 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            @for (step of frameworkRow2(); track step.title) {
              <div class="${DIAGRAM_CARD}">
                <img
                  [ngSrc]="step.icon"
                  alt=""
                  width="79"
                  height="80"
                  class="w-[64px] h-[65px] shrink-0"
                />
                <div class="flex flex-col gap-1 min-w-0">
                  <p
                    class="font-body font-bold text-[18px] leading-[1.2] text-ios-brand-primary-deep"
                  >
                    {{ step.number }}
                  </p>
                  <p class="font-body font-bold text-[18px] leading-[1.2] text-ios-brand-dark">
                    {{ step.title }}
                  </p>
                  <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
                    {{ step.desc }}
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Continuous Improvement Loop -->
          <div class="flex flex-col items-center gap-3 mt-4 text-center">
            <div class="w-px h-8 border-s-2 border-dashed border-ios-line" aria-hidden="true"></div>
            <div
              class="flex items-center justify-center w-[60px] h-[60px] rounded-full bg-ios-brand-primary-soft border border-ios-brand-primary-mid"
              aria-hidden="true"
            >
              <ios-icon name="refresh-ccw" class="w-7 h-7 text-ios-brand-primary" />
            </div>
            <div>
              <p class="font-body font-bold text-[14px] leading-[1.3] text-ios-fg-11">
                {{ lang.t('aboutScrum.framework.loopTitle') }}
              </p>
              <p
                class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid max-w-md"
              >
                {{ lang.t('aboutScrum.framework.loopDesc') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         5. Scrum Accountabilities — warm bg, 3 role cards + banner
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="as-accountabilities-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col gap-4 items-center text-center mb-8">
          <span class="${BADGE}">{{ lang.t('aboutScrum.accountabilities.badge') }}</span>
          <h2
            id="as-accountabilities-heading"
            class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{
              lang.t('aboutScrum.accountabilities.heading1')
            }}</span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutScrum.accountabilities.heading2')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutScrum.accountabilities.subtitle') }}
          </p>
          <div class="${GOLD_BAR}" aria-hidden="true"></div>
        </div>

        <div class="flex flex-col md:flex-row gap-8 mb-10">
          @for (role of accountabilities(); track role.title) {
            <div class="flex flex-1 min-w-0 flex-col gap-3">
              <div
                class="flex items-center justify-center w-[62px] h-[62px] rounded-lg bg-ios-brand-gold-soft border border-ios-brand-gold"
              >
                <ios-icon
                  [name]="role.icon"
                  class="w-7 h-7 text-ios-brand-primary"
                  aria-hidden="true"
                />
              </div>
              <div class="flex flex-col gap-2">
                <p
                  class="font-heading font-extrabold text-[20px] leading-[1.2] text-ios-brand-dark"
                >
                  {{ role.title }}
                </p>
                <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
                  {{ role.desc }}
                </p>
              </div>
              <div class="${GOLD_BAR_SM}" aria-hidden="true"></div>
            </div>
          }
        </div>

        <div
          class="flex items-center gap-6 bg-white border border-ios-border-light rounded-xl px-6 py-4 max-w-[732px] mx-auto"
        >
          <img
            [ngSrc]="'/assets/icons/delivery.svg'"
            alt=""
            width="79"
            height="80"
            class="w-[64px] h-[65px] shrink-0"
          />
          <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutScrum.accountabilities.banner') }}
          </p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         6. Scrum Events — white bg, 4-event cycle
         NOTE: Figma connects the four events with curved dashed arcs around
         a centred "Sprint" node. Rebuilt as a 2×2 grid with the "Sprint"
         node centred over a decorative dashed circle — same events, icons,
         text, colours; simpler than reproducing the exact bezier arcs.
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="as-events-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col gap-4 items-center text-center mb-14">
          <span class="${BADGE}">{{ lang.t('aboutScrum.events.badge') }}</span>
          <h2
            id="as-events-heading"
            class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutScrum.events.heading1') }}</span>
            <span class="text-ios-brand-primary">{{ lang.t('aboutScrum.events.heading2') }}</span>
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutScrum.events.subtitle') }}
          </p>
          <div class="${GOLD_BAR}" aria-hidden="true"></div>
        </div>

        <div class="relative max-w-[900px] mx-auto">
          <!-- Decorative dashed circle evoking the Figma cycle diagram -->
          <div
            class="hidden md:block absolute inset-[15%] rounded-full border-2 border-dashed border-ios-line"
            aria-hidden="true"
          ></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 relative">
            @for (event of eventsItems(); track event.title) {
              <div class="${DIAGRAM_CARD}">
                <img
                  [ngSrc]="event.icon"
                  alt=""
                  width="64"
                  height="64"
                  class="w-[48px] h-[48px] shrink-0"
                />
                <div class="flex flex-col gap-1 min-w-0">
                  <p
                    class="font-heading font-extrabold text-[20px] leading-[1.2] text-ios-brand-dark"
                  >
                    {{ event.title }}
                  </p>
                  <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
                    {{ event.desc }}
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Sprint — centred node -->
          <div
            class="flex items-center justify-center gap-2 mt-8 md:mt-0 md:absolute md:inset-0 md:pointer-events-none"
          >
            <div class="flex items-center gap-2 bg-white px-4 md:pointer-events-auto">
              <ios-icon
                name="timer"
                class="w-6 h-6 text-ios-brand-primary shrink-0"
                aria-hidden="true"
              />
              <div>
                <p
                  class="font-heading font-extrabold text-[18px] leading-[1.2] text-ios-brand-dark"
                >
                  {{ lang.t('aboutScrum.events.sprintTitle') }}
                </p>
                <p
                  class="font-heading font-medium text-[13px] leading-[1.4] text-ios-fg-mid max-w-[220px]"
                >
                  {{ lang.t('aboutScrum.events.sprintDesc') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p
          class="text-center font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-10 mt-10"
        >
          {{ lang.t('aboutScrum.events.closingPart1')
          }}<span class="font-bold text-ios-brand-primary">{{
            lang.t('aboutScrum.events.closingHighlight1')
          }}</span
          >{{ lang.t('aboutScrum.events.closingAnd')
          }}<span class="font-bold text-ios-brand-primary">{{
            lang.t('aboutScrum.events.closingPart2')
          }}</span>
        </p>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         7. Scrum Artifacts — warm bg, 3 numbered artifact cards
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="as-artifacts-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col gap-4 items-center text-center mb-14">
          <span class="${BADGE}">{{ lang.t('aboutScrum.artifacts.badge') }}</span>
          <h2
            id="as-artifacts-heading"
            class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutScrum.artifacts.heading1') }}</span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutScrum.artifacts.heading2')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutScrum.artifacts.subtitle') }}
          </p>
          <div class="${GOLD_BAR}" aria-hidden="true"></div>
        </div>

        <div class="relative flex flex-col sm:flex-row gap-10 sm:gap-6 items-start">
          <div
            class="hidden sm:block absolute top-[46px] inset-x-16 border-t border-dashed border-ios-line"
            aria-hidden="true"
          ></div>
          @for (item of artifacts(); track item.title; let i = $index) {
            <div class="relative flex-1 min-w-0 flex flex-col gap-4">
              <div class="relative w-[92px]">
                <img [ngSrc]="item.icon" alt="" width="92" height="92" class="w-[92px] h-[92px]" />
                <span
                  class="absolute -bottom-2 start-[46px] flex items-center justify-center w-[42px] h-[42px] rounded-full bg-ios-surface-soft border border-ios-line font-heading font-extrabold text-[20px] text-ios-fg-10"
                  aria-hidden="true"
                >
                  {{ i + 1 }}
                </span>
              </div>
              <div class="flex flex-col gap-2">
                <p
                  class="font-heading font-extrabold text-[20px] leading-[1.2] text-ios-brand-dark"
                >
                  {{ item.title }}
                </p>
                <p class="font-heading font-medium text-[14px] leading-[1.4] text-ios-fg-mid">
                  {{ item.desc }}
                </p>
              </div>
              <div class="${GOLD_BAR_SM}" aria-hidden="true"></div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         8. Why Organizations Use Scrum — white bg, photo + copy card
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="as-why-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col lg:flex-row gap-8 items-stretch">
          <div
            class="relative flex-1 min-w-0 rounded-lg overflow-hidden"
            style="min-height: 320px;"
          >
            <img
              [ngSrc]="'/assets/images/about_scrum_why.png'"
              [alt]="lang.t('aboutScrum.why.imageAlt')"
              class="object-cover"
              fill
              loading="lazy"
            />
          </div>
          <div
            class="flex-1 min-w-0 bg-white border border-ios-border-light rounded-lg p-6 flex flex-col justify-center gap-3"
          >
            <h2 id="as-why-heading" class="font-heading text-[24px] leading-[1.2]">
              <span class="font-bold text-ios-brand-dark">{{
                lang.t('aboutScrum.why.heading1')
              }}</span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutScrum.why.heading2')
              }}</span>
            </h2>
            <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
              {{ lang.t('aboutScrum.why.description') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         9. When and Where to Use Scrum — warm bg, copy card + photo
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="as-when-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col lg:flex-row gap-8 items-stretch">
          <div
            class="flex-1 min-w-0 bg-white border border-ios-border-light rounded-lg p-6 flex flex-col justify-center gap-3"
          >
            <h2 id="as-when-heading" class="font-heading text-[24px] leading-[1.2]">
              <span class="font-bold text-ios-brand-dark">{{
                lang.t('aboutScrum.when.heading1')
              }}</span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutScrum.when.heading2')
              }}</span>
            </h2>
            <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
              {{ lang.t('aboutScrum.when.description') }}
            </p>
          </div>
          <div
            class="relative flex-1 min-w-0 rounded-lg overflow-hidden"
            style="min-height: 320px;"
          >
            <img
              [ngSrc]="'/assets/images/about_scrum_when.png'"
              [alt]="lang.t('aboutScrum.when.imageAlt')"
              class="object-cover"
              fill
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
        10. Key Benefits of Scrum — white bg, heading + 6 benefit cards
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="as-benefits-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex flex-col lg:flex-row gap-6 items-start">
          <div class="flex flex-col gap-3 lg:w-[438px] shrink-0">
            <h2 id="as-benefits-heading" class="font-heading text-[24px] leading-[1.2]">
              <span class="font-bold text-ios-brand-dark">{{
                lang.t('aboutScrum.benefits.heading1')
              }}</span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutScrum.benefits.heading2')
              }}</span>
            </h2>
            <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
              {{ lang.t('aboutScrum.benefits.description') }}
            </p>
          </div>

          <div class="flex flex-1 flex-wrap gap-4">
            @for (benefit of benefits(); track benefit.title) {
              <div
                class="flex flex-col gap-4 bg-white border border-ios-border-light rounded-lg p-4 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
              >
                <div
                  class="flex items-center justify-center w-[46px] h-[46px] rounded-[10px] bg-ios-brand-gold-soft border border-ios-brand-gold"
                >
                  <ios-icon
                    [name]="benefit.icon"
                    class="w-7 h-7 text-ios-brand-primary"
                    aria-hidden="true"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <p class="font-body font-bold text-[18px] leading-[1.2] text-ios-brand-dark">
                    {{ benefit.title }}
                  </p>
                  <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-mid">
                    {{ benefit.desc }}
                  </p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
        11. Ready to join US? — same pattern as AboutInstitutePage
    ═══════════════════════════════════════════════════════════ -->
    <section
      aria-labelledby="as-ready-heading"
      class="bg-ios-surface-warm px-6 md:px-16 lg:px-[120px] py-[72px]"
    >
      <div class="flex flex-col items-center text-center gap-8 max-w-[984px] mx-auto">
        <ios-icon
          name="award"
          class="w-[42px] h-[42px] text-ios-brand-primary"
          aria-hidden="true"
        />

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="as-ready-heading"
            class="font-heading font-extrabold text-[clamp(1.75rem,3.5vw,36px)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutScrum.ready.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutScrum.ready.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutScrum.ready.subtitle') }}
          </p>
        </div>

        <div class="w-[172px] h-1 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a
            routerLink="/certifications"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-lg
                   bg-ios-brand-yellow-soft
                   text-[#736428] font-heading font-semibold text-[16px]
                   hover:bg-ios-brand-gold-soft transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('aboutScrum.ready.exploreCertificates') }}
            <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </a>
          <a
            routerLink="/register"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-lg
                   bg-ios-brand-primary text-ios-brand-primary-soft
                   font-heading font-semibold text-[16px]
                   hover:bg-ios-brand-primary-hover transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('aboutScrum.ready.startNow') }}
            <ios-icon name="arrow-up-right" class="w-5 h-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
        12. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class AboutScrumPage {
  protected readonly lang = inject(LanguageService);

  protected readonly frameworkRow1 = computed<readonly (IconTextItem & { number: string })[]>(
    () => [
      {
        icon: '/assets/icons/chat.svg',
        number: '1.',
        title: this.lang.t('aboutScrum.framework.step1Title'),
        desc: this.lang.t('aboutScrum.framework.step1Desc'),
      },
      {
        icon: '/assets/icons/backlog.svg',
        number: '2.',
        title: this.lang.t('aboutScrum.framework.step2Title'),
        desc: this.lang.t('aboutScrum.framework.step2Desc'),
      },
      {
        icon: '/assets/icons/plan.svg',
        number: '3.',
        title: this.lang.t('aboutScrum.framework.step3Title'),
        desc: this.lang.t('aboutScrum.framework.step3Desc'),
      },
      {
        icon: '/assets/icons/expertise.svg',
        number: '4.',
        title: this.lang.t('aboutScrum.framework.step4Title'),
        desc: this.lang.t('aboutScrum.framework.step4Desc'),
      },
    ],
  );

  protected readonly frameworkRow2 = computed<readonly (IconTextItem & { number: string })[]>(
    () => [
      {
        icon: '/assets/icons/delivery.svg',
        number: '6.',
        title: this.lang.t('aboutScrum.framework.step6Title'),
        desc: this.lang.t('aboutScrum.framework.step6Desc'),
      },
      {
        icon: '/assets/icons/review.svg',
        number: '7.',
        title: this.lang.t('aboutScrum.framework.step7Title'),
        desc: this.lang.t('aboutScrum.framework.step7Desc'),
      },
      {
        icon: '/assets/icons/retrospective.svg',
        number: '8.',
        title: this.lang.t('aboutScrum.framework.step8Title'),
        desc: this.lang.t('aboutScrum.framework.step8Desc'),
      },
    ],
  );

  protected readonly accountabilities = computed<readonly LucideTextItem[]>(() => [
    {
      icon: 'user-search',
      title: this.lang.t('aboutScrum.accountabilities.productOwnerTitle'),
      desc: this.lang.t('aboutScrum.accountabilities.productOwnerDesc'),
    },
    {
      icon: 'flag',
      title: this.lang.t('aboutScrum.accountabilities.scrumMasterTitle'),
      desc: this.lang.t('aboutScrum.accountabilities.scrumMasterDesc'),
    },
    {
      icon: 'code',
      title: this.lang.t('aboutScrum.accountabilities.developersTitle'),
      desc: this.lang.t('aboutScrum.accountabilities.developersDesc'),
    },
  ]);

  protected readonly eventsItems = computed<readonly IconTextItem[]>(() => [
    {
      icon: '/assets/icons/plan.svg',
      title: this.lang.t('aboutScrum.events.sprintPlanningTitle'),
      desc: this.lang.t('aboutScrum.events.sprintPlanningDesc'),
    },
    {
      icon: '/assets/icons/chat.svg',
      title: this.lang.t('aboutScrum.events.dailyScrumTitle'),
      desc: this.lang.t('aboutScrum.events.dailyScrumDesc'),
    },
    {
      icon: '/assets/icons/view.svg',
      title: this.lang.t('aboutScrum.events.sprintReviewTitle'),
      desc: this.lang.t('aboutScrum.events.sprintReviewDesc'),
    },
    {
      icon: '/assets/icons/retrospective.svg',
      title: this.lang.t('aboutScrum.events.sprintRetrospectiveTitle'),
      desc: this.lang.t('aboutScrum.events.sprintRetrospectiveDesc'),
    },
  ]);

  protected readonly artifacts = computed<readonly IconTextItem[]>(() => [
    {
      icon: '/assets/icons/backlog.svg',
      title: this.lang.t('aboutScrum.artifacts.productBacklogTitle'),
      desc: this.lang.t('aboutScrum.artifacts.productBacklogDesc'),
    },
    {
      icon: '/assets/icons/leader.svg',
      title: this.lang.t('aboutScrum.artifacts.sprintBacklogTitle'),
      desc: this.lang.t('aboutScrum.artifacts.sprintBacklogDesc'),
    },
    {
      icon: '/assets/icons/expertise.svg',
      title: this.lang.t('aboutScrum.artifacts.incrementTitle'),
      desc: this.lang.t('aboutScrum.artifacts.incrementDesc'),
    },
  ]);

  protected readonly benefits = computed<readonly LucideTextItem[]>(() => [
    {
      icon: 'rocket',
      title: this.lang.t('aboutScrum.benefits.fasterTitle'),
      desc: this.lang.t('aboutScrum.benefits.fasterDesc'),
    },
    {
      icon: 'glasses',
      title: this.lang.t('aboutScrum.benefits.transparencyTitle'),
      desc: this.lang.t('aboutScrum.benefits.transparencyDesc'),
    },
    {
      icon: 'medal',
      title: this.lang.t('aboutScrum.benefits.qualityTitle'),
      desc: this.lang.t('aboutScrum.benefits.qualityDesc'),
    },
    {
      icon: 'target',
      title: this.lang.t('aboutScrum.benefits.alignmentTitle'),
      desc: this.lang.t('aboutScrum.benefits.alignmentDesc'),
    },
    {
      icon: 'link',
      title: this.lang.t('aboutScrum.benefits.engagedTitle'),
      desc: this.lang.t('aboutScrum.benefits.engagedDesc'),
    },
    {
      icon: 'triangle-alert',
      title: this.lang.t('aboutScrum.benefits.riskTitle'),
      desc: this.lang.t('aboutScrum.benefits.riskDesc'),
    },
  ]);
}
