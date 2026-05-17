/**
 * `ios-cert-levels-section` — "Choose Your Certification Path" tabbed carousel (section 5).
 *
 * Manages active-tab state locally (UI state).
 *
 * ## Data ownership
 * All certification structure is static — cert abbreviations, full names, badge
 * colors, prices, and route links are structural constants that only change with
 * a new product release.  Translatable strings (tab labels, descriptions, CTA
 * text, audience descriptions) are locale-reactive via `lang.t()`.
 * No store input is needed.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCircleQuestionMark } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import type { LucideIconName } from '@ui';
import { CertCard, type CertCardData } from '../cert-card';

// ---------------------------------------------------------------------------
// Local shape (structural only — never goes to the API)
// ---------------------------------------------------------------------------

interface CertLevelDef {
  id: string;
  icon: LucideIconName;
  tabLabel: string;
  description: string;
  explorePath: string;
  exploreLink: string;
  audienceDesc: string;
  certCards: CertCardData[];
}

@Component({
  selector: 'ios-cert-levels-section',
  imports: [RouterLink, IosIcon, SectionBadge, CertCard],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight, LucideCircleQuestionMark)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.certLevelsSectionAriaLabel')"
      class="bg-ios-surface-warm py-20 lg:py-28"
    >
      <div class="px-6 md:px-16 lg:px-[120px]">
        <!-- Header -->
        <div class="mb-10">
          <div class="mb-5">
            <ios-section-badge [text]="lang.t('landing.sections.levelsExplained')" variant="gold" />
          </div>
          <h2 class="font-heading font-bold text-[clamp(1.5rem,3vw,2.25rem)] leading-tight mb-3">
            <span class="text-ios-brand-dark">{{ lang.t('landing.sections.threeLevels') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('landing.sections.threeLevelsHighlight')
            }}</span>
          </h2>
          <p class="text-[16px] text-ios-fg-mid leading-relaxed mb-5">
            {{ lang.t('landing.sections.threeLevelsSubtitle') }}
          </p>
          <div class="w-36 h-1 bg-ios-brand-gold rounded-full"></div>
        </div>

        <!-- Tab row -->
        <div class="grid grid-cols-4 items-center mb-8">
          @for (level of levels(); track level.id; let idx = $index) {
            <button
              type="button"
              (click)="selectLevel(idx)"
              class="px-2 py-2 text-[15px] transition-colors text-start
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [class.font-bold]="activeLevelIdx() === idx"
              [class.text-ios-fg-13]="activeLevelIdx() === idx"
              [class.font-medium]="activeLevelIdx() !== idx"
              [class.text-ios-fg-mid]="activeLevelIdx() !== idx"
            >
              {{ level.tabLabel }}
            </button>
          }

          <!-- Prev / Next arrows -->
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              (click)="prevLevel()"
              [attr.aria-label]="lang.t('common.previousLevel') || 'Previous level'"
              class="w-10 h-10 rounded-full border border-ios-brand-gold
                     flex items-center justify-center text-ios-brand-primary
                     hover:bg-ios-brand-gold/10 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              <ios-icon name="arrow-left" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              (click)="nextLevel()"
              [attr.aria-label]="lang.t('common.nextLevel') || 'Next level'"
              class="w-10 h-10 rounded-full border border-ios-brand-gold
                     flex items-center justify-center text-ios-brand-primary
                     hover:bg-ios-brand-gold/10 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              <ios-icon name="arrow-right" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- Carousel track -->
        <div
          #carouselTrack
          class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
        >
          @for (level of levels(); track level.id) {
            <div class="w-full flex-shrink-0 snap-center">
              <div
                class="bg-white border border-ios-border-light rounded-2xl p-8 flex flex-col gap-6"
              >
                <!-- Description row -->
                <div class="grid grid-cols-3 gap-6 items-start">
                  <p class="col-span-2 text-[15px] text-ios-fg-8 leading-relaxed">
                    {{ level.description }}
                  </p>
                  <div class="col-span-1 flex justify-end">
                    <a
                      [routerLink]="level.exploreLink"
                      class="inline-flex items-center gap-2 text-ios-brand-primary font-heading font-semibold text-[14px]
                             hover:underline focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-ios-brand-primary/50 rounded-lg"
                    >
                      {{ level.explorePath }}
                      <ios-icon
                        name="arrow-right"
                        class="w-4 h-4 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </div>

                <!-- Who Should Pursue This -->
                <div class="rounded-xl bg-ios-surface-strong p-4 flex items-start gap-3">
                  <div
                    class="w-9 h-9 rounded-full border border-ios-fg-7 flex items-center justify-center flex-shrink-0"
                  >
                    <ios-icon
                      name="circle-question-mark"
                      class="w-4 h-4 text-ios-fg-mid"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p class="font-heading font-semibold text-[15px] text-ios-fg-10 mb-1">
                      {{ lang.t('landing.levels.whoShouldPursue') }}
                    </p>
                    <p class="text-[14px] text-ios-fg-8 leading-relaxed">
                      {{ level.audienceDesc }}
                    </p>
                  </div>
                </div>

                <!-- Cert cards -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  @for (cert of level.certCards; track cert.id) {
                    <ios-cert-card [cert]="cert" />
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class CertLevelsSection {
  protected readonly lang = inject(LanguageService);
  protected readonly activeLevelIdx = signal(0);

  private readonly carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');

  /**
   * Static certification level definitions.
   * Tab labels, descriptions, CTA text, and audience descriptions are
   * locale-reactive (read via `lang.t()`). Badge colors, prices, abbreviations,
   * and route links are structural constants.
   */
  protected readonly levels = computed<CertLevelDef[]>(() => {
    const foundationLabel = this.lang.t('landing.levels.foundation.tabLabel');
    const practitionerLabel = this.lang.t('landing.levels.practitioner.tabLabel');
    const authorityLabel = this.lang.t('landing.levels.authority.tabLabel');

    return [
      {
        id: 'FOUNDATION',
        icon: 'book-open',
        tabLabel: foundationLabel,
        description: this.lang.t('landing.levels.foundation.description'),
        explorePath: this.lang.t('landing.levels.foundation.explorePath'),
        exploreLink: '/certifications',
        audienceDesc: this.lang.t('landing.levels.foundation.audienceDesc'),
        certCards: [
          {
            id: 'esm',
            abbreviation: 'ESM',
            fullName: this.lang.t('landing.certs.esm'),
            levelBadge: foundationLabel,
            badgeColor: '#426981',
            price: 'CAD $180',
            detailLink: '/certifications/esm',
          },
          {
            id: 'epo',
            abbreviation: 'EPO',
            fullName: this.lang.t('landing.certs.epo'),
            levelBadge: foundationLabel,
            badgeColor: '#426981',
            price: 'CAD $180',
            detailLink: '/certifications/epo',
          },
          {
            id: 'esf',
            abbreviation: 'ESF',
            fullName: this.lang.t('landing.certs.esf'),
            levelBadge: foundationLabel,
            badgeColor: '#426981',
            price: 'CAD $180',
            detailLink: '/certifications/esf',
          },
        ],
      },
      {
        id: 'PRACTITIONER',
        icon: 'zap',
        tabLabel: practitionerLabel,
        description: this.lang.t('landing.levels.practitioner.description'),
        explorePath: this.lang.t('landing.levels.practitioner.explorePath'),
        exploreLink: '/certifications',
        audienceDesc: this.lang.t('landing.levels.practitioner.audienceDesc'),
        certCards: [
          {
            id: 'psm',
            abbreviation: 'PSM',
            fullName: this.lang.t('landing.certs.psm'),
            levelBadge: practitionerLabel,
            badgeColor: '#2d5f7a',
            price: 'CAD $220',
            detailLink: '/certifications/psm',
          },
          {
            id: 'ppo',
            abbreviation: 'PPO',
            fullName: this.lang.t('landing.certs.ppo'),
            levelBadge: practitionerLabel,
            badgeColor: '#2d5f7a',
            price: 'CAD $220',
            detailLink: '/certifications/ppo',
          },
          {
            id: 'psf',
            abbreviation: 'PSF',
            fullName: this.lang.t('landing.certs.psf'),
            levelBadge: practitionerLabel,
            badgeColor: '#2d5f7a',
            price: 'CAD $220',
            detailLink: '/certifications/psf',
          },
        ],
      },
      {
        id: 'AUTHORITY',
        icon: 'shield-check',
        tabLabel: authorityLabel,
        description: this.lang.t('landing.levels.authority.description'),
        explorePath: this.lang.t('landing.levels.authority.explorePath'),
        exploreLink: '/certifications',
        audienceDesc: this.lang.t('landing.levels.authority.audienceDesc'),
        certCards: [
          {
            id: 'asm',
            abbreviation: 'ASM',
            fullName: this.lang.t('landing.certs.asm'),
            levelBadge: authorityLabel,
            badgeColor: '#1a3a4a',
            price: 'CAD $260',
            detailLink: '/certifications/asm',
          },
          {
            id: 'apo',
            abbreviation: 'APO',
            fullName: this.lang.t('landing.certs.apo'),
            levelBadge: authorityLabel,
            badgeColor: '#1a3a4a',
            price: 'CAD $260',
            detailLink: '/certifications/apo',
          },
          {
            id: 'asf',
            abbreviation: 'ASF',
            fullName: this.lang.t('landing.certs.asf'),
            levelBadge: authorityLabel,
            badgeColor: '#1a3a4a',
            price: 'CAD $260',
            detailLink: '/certifications/asf',
          },
        ],
      },
    ];
  });

  protected selectLevel(idx: number): void {
    this.activeLevelIdx.set(idx);
    this.scrollToLevel(idx);
  }

  protected prevLevel(): void {
    const next = (this.activeLevelIdx() - 1 + this.levels().length) % this.levels().length;
    this.activeLevelIdx.set(next);
    this.scrollToLevel(next);
  }

  protected nextLevel(): void {
    const next = (this.activeLevelIdx() + 1) % this.levels().length;
    this.activeLevelIdx.set(next);
    this.scrollToLevel(next);
  }

  private scrollToLevel(idx: number): void {
    const card = this.carouselTrack()?.nativeElement?.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}
