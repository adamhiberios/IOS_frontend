/**
 * `ios-cert-details-template` — reusable certification details page template.
 *
 * The same layout is used for every cert in the catalogue (ESM, ESM-P, ESM-A,
 * EPO, EPO-P, EPO-A, ESF, …). All cert-specific data is injected through the
 * `config` input, so adding a new certification page is as simple as creating
 * a thin wrapper page that supplies a `CertDetailsConfig` object and renders:
 *
 * ```html
 * <ios-landing-navbar />
 * <ios-cert-details-template [config]="esmConfig" />
 * <ios-landing-footer />
 * <ios-scroll-to-top />
 * ```
 *
 * Pixel-faithful to Figma node-id 16695:33680 ("ESM" details page).
 *
 * ── Theming ────────────────────────────────────────────────────────────────
 * The page palette is selected by a single `track` discriminator
 * (`'blue'` for the ESM family, `'green'` for the EPO family).  At runtime
 * the root section is decorated with the matching `.cert-track-*` CSS class,
 * which re-binds the `--color-track-*` CSS variables. Every coloured element
 * inside the template uses the matching Tailwind utility (`bg-track-bg`,
 * `text-track-soft`, `border-track-mid`, …) so the template stays static and
 * the page is themed by class alone — no inline-style bindings.
 *
 * Related-cert cards declare their own `track` (`'blue' | 'green' | 'brown' |
 * 'primary' | 'olive'`) and wrap each `<article>` in the matching track
 * class for self-contained theming.
 *
 * Sections (top → bottom):
 *   1. Hero            — themed dark band with breadcrumb, badge, title, CTA
 *   2. Overview        — light track band, intro copy
 *   3. Image           — full-width, fixed-height (834px) cert photo
 *   4. Stats           — 5 metric cards with decorative side bars
 *   5. Key Learning    — cream band, bullet list (book-open-text icon)
 *   6. Who Should Enroll — white band, badge + heading + 5 audience cards
 *   7. Ready CTA       — themed band with the "enroll" call-to-action
 *   8. Related Certs   — white band, related cert cards
 *
 * All copy resolves through `LanguageService.t()` keyed on the
 * configured `namespace` (e.g. `certDetails.esm.*`). Numeric/list contents
 * (key-learning bullets, audience cards) come from the config to give each
 * page authoring flexibility without forcing every key under the i18n root.
 */

import {
  ChangeDetectionStrategy,
  Component,
  type OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideBookOpenText } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { JsonLdService } from '@core/seo';
import { CertificatesBadge, IosIcon, provideIcons } from '@ui';

import { PublicCatalogStore } from '../data-access/catalog.store';

/** Track palette used by the main page sections (hero, overview, stats, CTA). */
export type CertTrack = 'blue' | 'green' | 'brown';

/** Track palette used by an individual related-cert card. */
export type RelatedCertTrack = 'blue' | 'green' | 'brown' | 'primary' | 'olive';

/** A single audience card on the "Who Should Enroll" section. */
export interface CertAudienceCard {
  /** Icon path under `/assets/icons/` (PNG/SVG) — uses NgOptimizedImage. */
  readonly iconSrc?: string;
  /** Lucide icon name as fallback when no `iconSrc` is supplied. */
  readonly iconName?: string;
  /** i18n key suffix for the title (under `<namespace>.audience.<suffix>Title`). */
  readonly titleKey: string;
  /** i18n key suffix for the description. */
  readonly descKey: string;
  /** When true the card spans the full width (used for the trailing card). */
  readonly fullWidth?: boolean;
}

/** A single related-certification card shown at the bottom of the page. */
export interface RelatedCertCard {
  readonly code: string;
  readonly fullName: string;
  readonly badgeSvgPath: string;
  /** Description text (already translated). */
  readonly description: string;
  /** Price string e.g. "CAD $180". */
  readonly price: string;
  /** "Learn More About …" button label. */
  readonly learnMoreLabel: string;
  /** Route or href the Learn More button navigates to. */
  readonly learnMoreLink: string;
  /** "Foundation Level" / "Practitioner Level" pill text. */
  readonly levelText: string;
  /** Which palette to apply to the card. */
  readonly track: RelatedCertTrack;
}

/** Configuration for the cert details template. */
export interface CertDetailsConfig {
  /** Cert short code, e.g. "ESM". */
  readonly code: string;
  /** Cert full name, e.g. "Endorsed Scrum Master". */
  readonly fullName: string;
  /** Badge SVG asset path (under `/assets/badge/`). */
  readonly badgeSvgPath: string;
  /** Track name shown in breadcrumb, e.g. "Scrum Master". */
  readonly trackName: string;
  /** Level label, e.g. "Foundation Level". */
  readonly levelLabel: string;
  /** Price string, e.g. "CAD $130". */
  readonly price: string;
  /** Hero photo (the "girls with sticky board" feature image). */
  readonly heroImageSrc: string;
  /** i18n namespace under which all copy lives, e.g. "certDetails.esm". */
  readonly namespace: string;
  /** Which palette to apply to the page (ESM family → blue, EPO family → green). */
  readonly track: CertTrack;

  /** Audience cards (5 typically; the last one is full-width). */
  readonly audience: readonly CertAudienceCard[];

  /** Number of key-learning bullets to render (the suffix `.keyLearning.point<N>` is used). */
  readonly keyLearningCount: number;

  /** Related cert cards. */
  readonly related: readonly RelatedCertCard[];
}

@Component({
  selector: 'ios-cert-details-template',
  imports: [NgOptimizedImage, CertificatesBadge, IosIcon],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight, LucideBookOpenText)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class.cert-track-blue]="cfg().track === 'blue'"
      [class.cert-track-green]="cfg().track === 'green'"
      [class.cert-track-brown]="cfg().track === 'brown'"
    >
      <!-- ═══════════════════════════════════════════════════════════
           1. Hero — track-coloured + white split. Boundary visually
           crosses through the middle of the badge.
      ═══════════════════════════════════════════════════════════ -->
      <section class="relative overflow-hidden bg-white" [attr.aria-labelledby]="heroHeadingId()">
        <!-- ── Track-coloured band ───────────────────────────────── -->
        <div class="relative bg-track-bg max-w-[1440px] mx-auto">
          <!-- Clipping layer for the decorative top-end circle so the
               badge below can still extend beyond the dark band. -->
          <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div
              class="absolute top-[-157px] end-[-160px] w-[320px] h-[320px] rounded-full opacity-50 bg-track-mid"
            ></div>
          </div>

          <div
            class="relative px-6 md:px-10 lg:px-16 xl:px-[120px] pt-[32px] pb-[24px] lg:pt-[48px] lg:pb-[32px]"
          >
            <!-- Top row: back/breadcrumb (start) + price tag (end) -->
            <div class="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-5">
              <div class="flex items-start gap-4 lg:gap-6 min-w-0">
                <a
                  href="/certifications"
                  class="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100
                         hover:opacity-90 transition-opacity shrink-0
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  [attr.aria-label]="lang.t(cfg().namespace + '.hero.back')"
                >
                  <ios-icon
                    name="arrow-left"
                    class="w-5 h-5 rtl:rotate-180 text-track-bg"
                    aria-hidden="true"
                  />
                </a>
                <div class="flex flex-col gap-2 flex-1 min-w-0">
                  <nav [attr.aria-label]="lang.t('common.breadcrumbAriaLabel')">
                    <ol
                      class="flex items-center gap-2 font-heading font-medium text-[13px] lg:text-[14px] leading-[1.4] text-ios-border-light"
                    >
                      <li>
                        <a href="/" class="hover:text-white transition-colors">
                          {{ lang.t(cfg().namespace + '.hero.breadcrumb.home') }}
                        </a>
                      </li>
                      <li aria-hidden="true">/</li>
                      <li>
                        <a href="/certifications" class="hover:text-white transition-colors">
                          {{ lang.t(cfg().namespace + '.hero.breadcrumb.all') }}
                        </a>
                      </li>
                      <li aria-hidden="true">/</li>
                    </ol>
                  </nav>
                  <h1
                    [id]="heroHeadingId()"
                    class="font-heading font-semibold text-[18px] md:text-[22px] lg:text-[24px] leading-[1.2] text-white/95"
                  >
                    {{ cfg().trackName }}
                  </h1>
                </div>
              </div>

              <!-- Price tag — inline on mobile/sm, absolute at lg+ -->
              <div class="relative self-start lg:self-auto lg:absolute lg:bottom-0 lg:end-28">
                <div
                  class="h-[60px] lg:h-[68px] px-5 lg:px-6 pt-3 lg:pt-4 bg-track-mid"
                  [attr.aria-label]="lang.t('certDetails.startingPriceAriaLabel')"
                >
                  <span
                    class="font-heading font-medium text-[13px] lg:text-[14px] leading-[1.4] whitespace-nowrap block text-track-softer"
                  >
                    {{ lang.t(cfg().namespace + '.hero.startingAt') }}
                  </span>
                  <span
                    class="font-heading font-extrabold text-[18px] lg:text-[20px] leading-[1.2] whitespace-nowrap block text-track-soft"
                  >
                    {{ cfg().price }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Hero content (TOP half on track band). -->
            <div
              class="relative grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6 lg:gap-10 mt-[32px] lg:mt-[40px]"
            >
              <!-- Mobile badge (white card on track band) -->
              <div class="lg:hidden w-[180px] mx-auto">
                <ios-certificates-badge
                  [svgPath]="cfg().badgeSvgPath"
                  [code]="cfg().code"
                  [fullName]="cfg().fullName"
                />
              </div>
              <!-- Desktop badge column spacer (real badge is absolute) -->
              <div class="hidden lg:block w-[210px]" aria-hidden="true"></div>

              <!-- Right column: pill + "Endorsed Scrum Master - ESM" -->
              <div
                class="flex flex-col gap-3 items-center lg:items-start text-center lg:text-start lg:pt-2"
              >
                <span
                  class="inline-flex items-center justify-center px-3 py-1 rounded-full
                         font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap
                         bg-track-mid text-track-soft"
                >
                  {{ cfg().levelLabel }}
                </span>

                <p
                  class="font-heading font-bold text-[22px] md:text-[28px] lg:text-[32px] leading-[1.2]
                         flex flex-wrap justify-center lg:justify-start items-baseline gap-x-3 gap-y-1"
                >
                  <span class="text-track-soft">{{ cfg().fullName }}</span>
                  <span class="text-white">-</span>
                  <span class="text-white">{{ cfg().code }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Absolute desktop badge — vertical centre on the dark/white boundary -->
          <div
            class="hidden lg:block absolute z-10 top-full -translate-y-1/2 start-16 xl:start-[120px]"
          >
            <div class="w-[210px] bg-white p-3">
              <ios-certificates-badge
                [svgPath]="cfg().badgeSvgPath"
                [code]="cfg().code"
                [fullName]="cfg().fullName"
              />
            </div>
          </div>
        </div>

        <!-- ── White block — bottom half of the badge, description, buttons ── -->
        <div class="bg-white px-6 md:px-10 lg:px-16 xl:px-[120px] pt-4 pb-[40px] lg:pb-[56px] max-w-[1440px] mx-auto">
          <div class="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6 lg:gap-10 items-start">
            <div class="hidden lg:block w-[210px]" aria-hidden="true"></div>

            <div
              class="flex flex-col gap-5 lg:gap-6 min-w-0 items-center lg:items-start text-center lg:text-start"
            >
              <p
                class="font-body font-medium text-[15px] md:text-[16px] lg:text-[18px] leading-[1.5] text-ios-fg-mid"
              >
                {{ lang.t(cfg().namespace + '.hero.description') }}
              </p>

              <div
                class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center
                       justify-center lg:justify-start w-full sm:w-auto"
              >
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-3 h-12 sm:h-14 ps-6 pe-4 rounded-xl
                         font-body font-semibold text-[15px] md:text-[16px] lg:text-[18px] leading-[1.4] whitespace-nowrap
                         hover:opacity-90 transition-opacity
                         disabled:opacity-60 disabled:cursor-not-allowed
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ios-brand-primary/60
                         bg-track-strong text-white"
                  [disabled]="enrollPending()"
                  (click)="onEnroll()"
                >
                  {{ lang.t(cfg().namespace + '.hero.enroll') }}
                  <ios-icon
                    name="arrow-right"
                    class="w-5 h-5 sm:w-6 sm:h-6 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════
           2 + 3. Overview band, followed by the full-width cert image.
      ═══════════════════════════════════════════════════════════ -->
      <section class="bg-white" aria-labelledby="cert-overview-heading">
        <!-- Track-tinted Overview band -->
        <div
          class="bg-track-soft px-6 md:px-10 lg:px-16 xl:px-[246px] pt-[56px] pb-[56px] lg:pb-[72px] max-w-[1440px] mx-auto"
        >
          <div class="flex flex-col gap-3">
            <h2
              id="cert-overview-heading"
              class="font-heading font-bold text-[24px] md:text-[28px] leading-[1.2] text-ios-fg-10"
            >
              {{ lang.t(cfg().namespace + '.overview.title') }}
            </h2>
            <p
              class="font-body font-medium text-[15px] md:text-[16px] leading-[1.6] text-ios-fg-mid"
            >
              {{ lang.t(cfg().namespace + '.overview.body') }}
            </p>
          </div>
        </div>

        <!-- Image — full-width, fixed-height cert photo -->
        <div class="relative w-full h-[834px] max-w-[1440px] mx-auto">
          <img
            [ngSrc]="cfg().heroImageSrc"
            [alt]="lang.t(cfg().namespace + '.heroImage.alt')"
            class="object-cover"
            fill
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════
           4. Stats bar — track-tinted band with decorative side bars
      ═══════════════════════════════════════════════════════════ -->
      <section
        class="relative overflow-hidden px-6 md:px-10 lg:px-16 xl:px-[242px] py-[56px] lg:py-[72px] bg-track-softer max-w-[1440px] mx-auto"
        [attr.aria-label]="lang.t('certDetails.certFactsAriaLabel')"
      >
        <!-- Decorative side bars — desktop only -->
        <div
          class="hidden lg:block absolute top-1/2 -translate-y-1/2 start-[-62px] w-[224px] h-[13px] bg-track-line"
          aria-hidden="true"
        ></div>
        <div
          class="hidden lg:block absolute top-1/2 -translate-y-1/2 end-[-62px] w-[224px] h-[13px] bg-track-line"
          aria-hidden="true"
        ></div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 items-start">
          <!-- Stat 1: Prerequisite -->
          <div class="flex flex-col gap-1">
            <p
              class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.prereqValue') }}
            </p>
            <p
              class="font-body font-medium text-[15px] md:text-[18px] leading-[1.4] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.prereqLabel') }}
            </p>
          </div>

          <!-- Stat 2: Required Training (with /hours unit) -->
          <div class="flex flex-col gap-1">
            <div class="flex items-end gap-1">
              <p
                class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] text-track-text"
              >
                {{ lang.t(cfg().namespace + '.stats.trainingValue') }}
              </p>
              <p
                class="font-body font-medium text-[14px] md:text-[16px] leading-[1.4] mb-1 text-track-mid"
              >
                {{ lang.t(cfg().namespace + '.stats.trainingUnit') }}
              </p>
            </div>
            <p
              class="font-body font-medium text-[15px] md:text-[18px] leading-[1.4] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.trainingLabel') }}
            </p>
          </div>

          <!-- Stat 3: Test Questions -->
          <div class="flex flex-col gap-1">
            <p
              class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.questionsValue') }}
            </p>
            <p
              class="font-body font-medium text-[15px] md:text-[18px] leading-[1.4] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.questionsLabel') }}
            </p>
          </div>

          <!-- Stat 4: Test Duration (with /minutes unit) -->
          <div class="flex flex-col gap-1">
            <div class="flex items-end gap-1">
              <p
                class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] text-track-text"
              >
                {{ lang.t(cfg().namespace + '.stats.durationValue') }}
              </p>
              <p
                class="font-body font-medium text-[14px] md:text-[16px] leading-[1.4] mb-1 text-track-mid"
              >
                {{ lang.t(cfg().namespace + '.stats.durationUnit') }}
              </p>
            </div>
            <p
              class="font-body font-medium text-[15px] md:text-[18px] leading-[1.4] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.durationLabel') }}
            </p>
          </div>

          <!-- Stat 5: Validity -->
          <div class="flex flex-col gap-1">
            <p
              class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.validityValue') }}
            </p>
            <p
              class="font-body font-medium text-[15px] md:text-[18px] leading-[1.4] text-track-text"
            >
              {{ lang.t(cfg().namespace + '.stats.validityLabel') }}
            </p>
          </div>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════
           5. Who Should Enroll — white band
      ═══════════════════════════════════════════════════════════ -->
      <section
        class="bg-white px-6 md:px-10 lg:px-16 xl:px-[246px] py-[56px] lg:py-[72px] max-w-[1440px] mx-auto
               flex flex-col gap-12 items-center"
        aria-labelledby="cert-audience-heading"
      >
        <!-- Section header -->
        <div class="flex flex-col gap-4 items-center text-center">
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full border
                   font-heading font-medium text-[14px] leading-[1.4]
                   bg-ios-brand-yellow-soft border-ios-brand-gold text-ios-brand-primary"
          >
            {{ lang.t(cfg().namespace + '.audience.badge') }}
          </span>
          <h2
            id="cert-audience-heading"
            class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] flex flex-wrap justify-center gap-x-3"
          >
            <span class="text-ios-brand-dark">
              {{ lang.t(cfg().namespace + '.audience.headingPart1') }}
            </span>
            <span class="text-ios-brand-primary">
              {{ lang.t(cfg().namespace + '.audience.headingPart2') }}
            </span>
          </h2>
          <div class="h-1 w-[274px] rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
        </div>

        <!-- Audience cards grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          @for (card of cfg().audience; track card.titleKey) {
            <article
              class="border border-ios-border-light rounded-xl p-6 flex gap-6 items-start"
              [class.lg:col-span-2]="card.fullWidth"
            >
              <!-- Icon disc -->
              <div
                class="bg-gray-100 shrink-0 flex items-center justify-center w-[104px] h-[104px] rounded-full"
                aria-hidden="true"
              >
                @if (card.iconSrc) {
                  <img
                    [ngSrc]="card.iconSrc"
                    alt=""
                    width="80"
                    height="80"
                    class="w-20 h-20 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                } @else if (card.iconName) {
                  <svg
                    class="w-12 h-12"
                    viewBox="0 0 148 148"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <use [attr.href]="'#icon-' + card.iconName" />
                  </svg>
                }
              </div>
              <div class="flex flex-col gap-2 flex-1 min-w-0 pt-3">
                <h3
                  class="font-heading font-bold text-[20px] md:text-[24px] leading-[1.2] text-ios-fg-10"
                >
                  {{ lang.t(cfg().namespace + '.audience.' + card.titleKey) }}
                </h3>
                <p
                  class="font-body font-medium text-[15px] md:text-[16px] leading-[1.4] text-ios-fg-muted"
                >
                  {{ lang.t(cfg().namespace + '.audience.' + card.descKey) }}
                </p>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════
           6. Key Learning Points — cream band
      ═══════════════════════════════════════════════════════════ -->
      <section
        class="bg-ios-surface-warm px-6 md:px-10 lg:px-16 xl:px-[246px] py-[56px] max-w-[1440px] mx-auto"
        aria-labelledby="cert-key-learning-heading"
      >
        <div class="flex flex-col gap-4">
          <h2
            id="cert-key-learning-heading"
            class="font-heading font-bold text-[24px] md:text-[28px] leading-[1.2] text-ios-fg-10"
          >
            {{ lang.t(cfg().namespace + '.keyLearning.title') }}
          </h2>

          <ul class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            @for (n of keyLearningRange(); track n) {
              <li class="flex gap-3 items-start">
                <ios-icon
                  name="book-open-text"
                  class="w-6 h-6 shrink-0 mt-0.5 text-ios-brand-gold"
                  aria-hidden="true"
                />
                <span
                  class="font-body font-medium text-[15px] md:text-[16px] leading-[1.4] flex-1 min-w-0 text-ios-fg-mid"
                >
                  {{ lang.t(cfg().namespace + '.keyLearning.point' + n) }}
                </span>
              </li>
            }
          </ul>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════
           7. Ready CTA — track-coloured dark band
      ═══════════════════════════════════════════════════════════ -->
      <section
        class="bg-track-strong px-6 md:px-10 lg:px-16 xl:px-[246px] py-[56px] max-w-[1440px] mx-auto
               flex flex-col gap-6 items-center text-center"
        aria-labelledby="cert-cta-heading"
      >
        <h2
          id="cert-cta-heading"
          class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] flex flex-wrap justify-center gap-x-2"
        >
          <span class="text-white">{{ lang.t(cfg().namespace + '.cta.headingPart1') }}</span>
          <span class="text-ios-brand-yellow-bright">
            {{ lang.t(cfg().namespace + '.cta.headingPart2') }}
          </span>
        </h2>
        <p
          class="font-body font-medium text-[15px] md:text-[18px] leading-[1.4] max-w-[820px] text-gray-100"
        >
          {{ lang.t(cfg().namespace + '.cta.description') }}
        </p>
        <div class="h-1 w-[274px] rounded-full bg-ios-brand-gold" aria-hidden="true"></div>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-3 h-14 px-6 rounded-xl
                 font-body font-semibold text-[16px] md:text-[18px] leading-[1.4] whitespace-nowrap
                 hover:opacity-90 transition-opacity
                 disabled:opacity-60 disabled:cursor-not-allowed
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60
                 bg-track-soft text-track-text"
          [disabled]="enrollPending()"
          (click)="onEnroll()"
        >
          {{ lang.t(cfg().namespace + '.cta.button') }}
          <ios-icon name="arrow-right" class="w-6 h-6 rtl:rotate-180" aria-hidden="true" />
        </button>

        <p class="font-body font-medium text-[15px] md:text-[16px] leading-[1.4] text-track-softer">
          {{ lang.t(cfg().namespace + '.cta.questions') }}
          <a
            href="/contact"
            class="underline hover:text-white transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm"
          >
            {{ lang.t(cfg().namespace + '.cta.contactLink') }}
          </a>
        </p>
      </section>

      <!-- ═══════════════════════════════════════════════════════════
           8. Related Certifications — white band
      ═══════════════════════════════════════════════════════════ -->
      @if (cfg().related.length > 0) {
        <section
          class="bg-white px-6 md:px-10 lg:px-16 xl:px-[120px] py-[56px] lg:py-[72px] max-w-[1440px] mx-auto
                 flex flex-col gap-6 items-center"
          aria-labelledby="cert-related-heading"
        >
          <div class="flex flex-col gap-4 items-center text-center">
            <h2
              id="cert-related-heading"
              class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
            >
              <span class="text-ios-brand-dark">
                {{ lang.t(cfg().namespace + '.related.headingPart1') }}
              </span>
              <span class="text-ios-brand-primary">
                {{ lang.t(cfg().namespace + '.related.headingPart2') }}
              </span>
            </h2>
            <div class="h-1 w-[274px] rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            @for (rel of cfg().related; track rel.code) {
              <article
                class="bg-white border border-ios-border-light rounded-xl p-6 flex flex-col gap-4 overflow-hidden"
                [class.cert-track-blue]="rel.track === 'blue'"
                [class.cert-track-green]="rel.track === 'green'"
                [class.cert-track-brown]="rel.track === 'brown'"
                [class.cert-track-primary]="rel.track === 'primary'"
                [class.cert-track-olive]="rel.track === 'olive'"
              >
                <!-- Top row: badge + level/code/full + price -->
                <div class="flex gap-4 items-start">
                  <div class="shrink-0 w-[150px]">
                    <ios-certificates-badge
                      [svgPath]="rel.badgeSvgPath"
                      [code]="rel.code"
                      [fullName]="rel.fullName"
                    />
                  </div>
                  <div class="flex flex-col gap-2 pt-1 flex-1 min-w-0">
                    <span
                      class="self-start inline-flex items-center justify-center px-3 py-1 rounded-full
                             font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap
                             bg-track-mid text-track-soft"
                    >
                      {{ rel.levelText }}
                    </span>
                    <span
                      class="font-heading font-bold text-[24px] md:text-[28px] leading-[1.2] text-track-bg"
                    >
                      {{ rel.code }}
                    </span>
                    <span
                      class="font-body font-medium text-[15px] md:text-[16px] leading-[1.4] break-words text-track-text"
                    >
                      {{ rel.fullName }}
                    </span>
                    <div class="flex flex-col mt-1">
                      <span
                        class="font-heading font-medium text-[13px] md:text-[14px] leading-[1.4] text-ios-brand-muted"
                      >
                        {{ lang.t(cfg().namespace + '.related.startingAt') }}
                      </span>
                      <span
                        class="font-heading font-extrabold text-[18px] md:text-[20px] leading-[1.2] text-track-text"
                      >
                        {{ rel.price }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="h-px w-full bg-ios-border-light" aria-hidden="true"></div>

                <p
                  class="font-body font-medium text-[15px] md:text-[16px] leading-[1.4] text-ios-fg-mid"
                >
                  {{ rel.description }}
                </p>

                <div class="h-px w-full bg-ios-border-light" aria-hidden="true"></div>

                <a
                  [href]="rel.learnMoreLink"
                  class="self-start inline-flex items-center gap-2 h-11 ps-6 pe-4 rounded-xl
                         font-body font-semibold text-[15px] md:text-[16px] leading-[1.4] whitespace-nowrap
                         hover:opacity-80 transition-opacity
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                         text-track-bg"
                >
                  {{ rel.learnMoreLabel }}
                  <ios-icon
                    name="arrow-right"
                    class="w-5 h-5 rtl:rotate-180 text-track-bg"
                    aria-hidden="true"
                  />
                </a>
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class CertDetailsTemplate implements OnDestroy {
  /** All cert-specific data and theming. */
  readonly config = input.required<CertDetailsConfig>();

  /** Internal alias for terser template binding. */
  protected readonly cfg = computed(() => this.config());

  /** Range [1..keyLearningCount] used by the `@for` over key-learning bullets. */
  protected readonly keyLearningRange = computed(() =>
    Array.from({ length: this.cfg().keyLearningCount }, (_, i) => i + 1),
  );

  /** Heading id for the hero `<h1>` — kept stable across renders. */
  protected readonly heroHeadingId = computed(() => `cert-hero-${this.cfg().code.toLowerCase()}`);

  protected readonly lang = inject(LanguageService);

  private readonly catalogStore = inject(PublicCatalogStore);
  private readonly jsonLd = inject(JsonLdService);
  private readonly router = inject(Router);

  /** Disables both "Enroll Now" buttons while the catalog lookup is in flight. */
  protected readonly enrollPending = signal(false);

  constructor() {
    // SEO only — page content stays static/authored. Resolves the marketing
    // `code` to the backend cert and fetches its `seo` block purely to feed
    // JsonLdService; nothing here touches what the template renders.
    effect(() => {
      void this.applySeo(this.cfg().code);
    });
  }

  ngOnDestroy(): void {
    this.jsonLd.clear();
  }

  private async applySeo(programCode: string): Promise<void> {
    const seo = await this.catalogStore.loadSeo(programCode);
    if (seo?.jsonLd) {
      this.jsonLd.set(seo.jsonLd);
    }
  }

  /**
   * "Enroll Now" (hero + bottom CTA) — sends the visitor to `/checkout` with
   * the item to buy in the query string. `PlaceOrderPage` owns no
   * cross-feature import into `landing` (CLAUDE.md §5), so this template —
   * which already injects `PublicCatalogStore` for SEO — is the right place
   * to resolve the marketing `code` to the real backend certificate (`id`,
   * `price`, `currency`) before navigating. A cert with no backend match
   * (catalog not loaded yet, or no live listing) is not sent — nothing is
   * fabricated; the button simply does nothing, matching the "never invent
   * a price" rule.
   */
  protected async onEnroll(): Promise<void> {
    if (this.enrollPending()) return;
    this.enrollPending.set(true);
    try {
      await this.catalogStore.load();
      const cert = this.catalogStore.byCode(this.cfg().code);
      if (!cert) return;

      const c = this.cfg();
      await this.router.navigate(['/checkout'], {
        queryParams: {
          certId: cert.id,
          title: c.fullName,
          code: c.code,
          subtitle: c.levelLabel,
          price: cert.price,
          currency: cert.currency,
          badge: c.badgeSvgPath,
        },
      });
    } finally {
      this.enrollPending.set(false);
    }
  }
}
