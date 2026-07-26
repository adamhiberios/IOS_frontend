/**
 * `ios-cert-levels-section` — "Choose Your Certification Path" tabbed carousel (section 5).
 *
 * Manages active-tab state locally (UI state).
 *
 * ## Data ownership
 * Cert abbreviations, full names, badge colors, and route links are structural
 * constants that only change with a new product release. Translatable strings
 * (tab labels, descriptions, CTA text, audience descriptions) are locale-reactive
 * via `lang.t()`.
 *
 * ## Real vs. demo data
 * A local toggle (`useRealData`) switches the whole section between two
 * independent data sources:
 * - **Demo** (`useRealData() === false`): the static, hardcoded role tabs
 *   (Scrum Master / Product Owner / Scrum Facilitator) mirroring the exact
 *   catalog on `all-certifications.page.ts` — ESM/ESM-P/ESM-A, EPO/EPO-P/
 *   EPO-A, and ESF (Scrum Facilitator only ships a Foundation tier there, so
 *   no ESF-P/ESF-A card is shown here either).
 * - **Live** (`useRealData() === true`): tabs are the 3 backend `level`
 *   tiers (Foundation/Practitioner/Authority) — one tab per level that
 *   actually has published certificates — and each tab's cards are every
 *   `PublicCatalogStore` item at that level, regardless of `track`.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { PublicCatalogStore } from '../../data-access/catalog.store';
import { formatPrice } from '../../data-access/catalog.mappers';
import type { PublicCertificate } from '../../data-access/catalog.model';

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
          <div class="w-36 h-1 bg-ios-brand-gold rounded-full mb-6"></div>

          <!-- Data source toggle: real (backend-overlaid) vs. fake (demo) -->
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-[13px] font-medium text-ios-fg-mid">
              {{ lang.t('landing.levels.dataToggle.label') }}
            </span>
            <button
              type="button"
              role="switch"
              [attr.aria-checked]="useRealData()"
              (click)="toggleDataSource()"
              class="relative w-11 h-6 rounded-full transition-colors cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [class.bg-ios-brand-primary]="useRealData()"
              [class.bg-ios-fg-7]="!useRealData()"
            >
              <span
                class="absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                [class.translate-x-5]="useRealData()"
              ></span>
            </button>
            <span class="text-[13px] font-medium text-ios-fg-mid">
              {{
                useRealData()
                  ? lang.t('landing.levels.dataToggle.real')
                  : lang.t('landing.levels.dataToggle.fake')
              }}
            </span>
            @if (useRealData() && catalogStore.loading()) {
              <span class="text-[12px] text-ios-fg-7">{{
                lang.t('landing.levels.dataToggle.loading')
              }}</span>
            }
            @if (useRealData() && catalogStore.error()) {
              <span class="text-[12px] text-ios-brand-primary">{{
                lang.t('landing.levels.dataToggle.error')
              }}</span>
            }
          </div>
        </div>

        <!-- Tab row — tab count varies (demo: 3 roles; live: up to 3 level tiers) -->
        <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-8">
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2" role="tablist">
            @for (level of levels(); track level.id; let idx = $index) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="activeLevelIdx() === idx"
                (click)="selectLevel(idx)"
                class="px-2 py-2 text-[15px] text-start cursor-pointer
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                <!-- inline-block so the underline sizes to the label text, not the button -->
                <span
                  class="inline-block pb-1 border-b-2 transition-colors"
                  [class.font-bold]="activeLevelIdx() === idx"
                  [class.text-ios-fg-13]="activeLevelIdx() === idx"
                  [class.border-ios-brand-primary]="activeLevelIdx() === idx"
                  [class.font-medium]="activeLevelIdx() !== idx"
                  [class.text-ios-fg-mid]="activeLevelIdx() !== idx"
                  [class.border-transparent]="activeLevelIdx() !== idx"
                  [class.hover:text-ios-brand-primary]="activeLevelIdx() !== idx"
                >
                  {{ level.tabLabel }}
                </span>
              </button>
            }
          </div>

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
  protected readonly catalogStore = inject(PublicCatalogStore);
  protected readonly activeLevelIdx = signal(0);

  /**
   * Data source toggle — `true` builds tabs/cards straight from the live
   * catalog (grouped by `level`); `false` shows the static demo grid.
   * Defaults to demo data (falls back to it automatically until the live
   * catalog has loaded, or if it's empty/errored).
   */
  protected readonly useRealData = signal(false);

  private readonly carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');

  /** Badge colors keyed by backend `level` — mirrors the demo palette. */
  private static readonly LEVEL_BADGE_COLOR: Record<string, string> = {
    foundation: '#426981',
    practitioner: '#2d5f7a',
    authority: '#1a3a4a',
  };
  private static readonly UNKNOWN_LEVEL_COLOR = '#5a5a5a';
  /** Tab order for the live view: Foundation → Practitioner → Authority. */
  private static readonly LEVEL_ORDER = ['foundation', 'practitioner', 'authority'] as const;
  /** Generic placeholder used when the backend has no `badgeImageUrl` set. */
  private static readonly FALLBACK_BADGE_IMAGE = '/assets/icons/certificate_budge.svg';

  constructor() {
    // Fetch the catalogue once, lazily, the first time real data is requested.
    effect(() => {
      if (this.useRealData()) {
        void this.catalogStore.load();
      }
    });
    // Switching data source changes the tab count/order — land on the first tab.
    effect(() => {
      this.useRealData();
      this.activeLevelIdx.set(0);
    });
  }

  protected toggleDataSource(): void {
    this.useRealData.update((v) => !v);
  }

  private levelLabel(level: 'foundation' | 'practitioner' | 'authority' | null): string {
    return level
      ? this.lang.t(`landing.levels.${level}.levelLabel`)
      : this.lang.t('landing.levels.live.noLevel');
  }

  private levelBadgeColor(level: 'foundation' | 'practitioner' | 'authority' | null): string {
    return (level && CertLevelsSection.LEVEL_BADGE_COLOR[level]) ?? CertLevelsSection.UNKNOWN_LEVEL_COLOR;
  }

  /**
   * Live tabs built directly from `PublicCatalogStore.items()`, split by
   * `level` (Foundation/Practitioner/Authority) — one tab per tier that has
   * at least one published certificate, in that order. Certificates without
   * a `level` are grouped into a trailing "General" tab so nothing is
   * dropped. Within a tab, each card's chip shows the cert's `track` (its
   * role) since the tab itself already conveys the level.
   */
  private buildLiveLevels(): CertLevelDef[] {
    const items = this.catalogStore.items();
    const byLevel = new Map<'foundation' | 'practitioner' | 'authority' | null, PublicCertificate[]>();
    for (const item of items) {
      const key = item.level ?? null;
      const list = byLevel.get(key) ?? [];
      list.push(item);
      byLevel.set(key, list);
    }

    const orderedKeys: ('foundation' | 'practitioner' | 'authority' | null)[] = [
      ...CertLevelsSection.LEVEL_ORDER,
      null,
    ];

    return orderedKeys
      .filter((level) => (byLevel.get(level) ?? []).length > 0)
      .map((level): CertLevelDef => {
        const certs = byLevel.get(level) ?? [];
        const tabLabel = this.levelLabel(level);
        return {
          id: level ?? 'general',
          icon: 'users',
          tabLabel,
          description: this.lang.t('landing.levels.live.description'),
          explorePath: this.lang.t('landing.levels.live.explorePath'),
          exploreLink: '/certifications',
          audienceDesc: this.lang.t('landing.levels.live.audienceDesc'),
          certCards: certs.map((cert) => ({
            id: cert.id,
            abbreviation: cert.programCode,
            fullName: cert.title,
            levelBadge: cert.track?.trim() || tabLabel,
            badgeColor: this.levelBadgeColor(level),
            badgeImage: cert.badgeImageUrl || CertLevelsSection.FALLBACK_BADGE_IMAGE,
            price: formatPrice(cert.price, cert.currency, this.lang.locale()),
            detailLink: `/certifications/${cert.programCode.toLowerCase()}`,
          })),
        };
      });
  }

  /**
   * Static demo grid — mirrors `all-certifications.page.ts` exactly: 3 role
   * tabs (Scrum Master/Product Owner/Scrum Facilitator), each with the same
   * abbreviations, full names, and price ("CAD $180" for every card there).
   * Scrum Facilitator only ships a Foundation-tier product on that page
   * (no `/certifications/esf-p` or `esf-a` route exists), so this tab
   * likewise has just the one ESF card. Structural constants (abbreviations,
   * theme colors, prices, route links) only change with a new product
   * release; copy is locale-reactive via `lang.t()`.
   */
  private buildStaticLevels(): CertLevelDef[] {
    const foundationLabel = this.lang.t('landing.levels.foundation.levelLabel');
    const practitionerLabel = this.lang.t('landing.levels.practitioner.levelLabel');
    const authorityLabel = this.lang.t('landing.levels.authority.levelLabel');
    const price = 'CAD $180'; // same for every card on all-certifications.page.ts

    return [
      {
        id: 'SCRUM_MASTER',
        icon: 'users',
        tabLabel: this.lang.t('landing.levels.foundation.tabLabel'),
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
            badgeImage: '/assets/badge/endorsed_scrum_master.svg',
            price,
            detailLink: '/certifications/esm',
          },
          {
            id: 'esm-p',
            abbreviation: 'ESM-P',
            fullName: this.lang.t('landing.certs.psm'),
            levelBadge: practitionerLabel,
            badgeColor: '#426981',
            badgeImage: '/assets/badge/endorsed_scrum_master_practitioner.svg',
            price,
            detailLink: '/certifications/esm-p',
          },
          {
            id: 'esm-a',
            abbreviation: 'ESM-A',
            fullName: this.lang.t('landing.certs.asm'),
            levelBadge: authorityLabel,
            badgeColor: '#426981',
            badgeImage: '/assets/badge/endorsed_scrum_master_authority.svg',
            price,
            detailLink: '/certifications/esm-a',
          },
        ],
      },
      {
        id: 'PRODUCT_OWNER',
        icon: 'package',
        tabLabel: this.lang.t('landing.levels.practitioner.tabLabel'),
        description: this.lang.t('landing.levels.practitioner.description'),
        explorePath: this.lang.t('landing.levels.practitioner.explorePath'),
        exploreLink: '/certifications',
        audienceDesc: this.lang.t('landing.levels.practitioner.audienceDesc'),
        certCards: [
          {
            id: 'epo',
            abbreviation: 'EPO',
            fullName: this.lang.t('landing.certs.epo'),
            levelBadge: foundationLabel,
            badgeColor: '#515e4d',
            badgeImage: '/assets/badge/endorsed_product_owner.svg',
            price,
            detailLink: '/certifications/epo',
          },
          {
            id: 'epo-p',
            abbreviation: 'EPO-P',
            fullName: this.lang.t('landing.certs.ppo'),
            levelBadge: practitionerLabel,
            badgeColor: '#515e4d',
            badgeImage: '/assets/badge/endorsed_product_owner_practitioner.svg',
            price,
            detailLink: '/certifications/epo-p',
          },
          {
            id: 'epo-a',
            abbreviation: 'EPO-A',
            fullName: this.lang.t('landing.certs.apo'),
            levelBadge: authorityLabel,
            badgeColor: '#515e4d',
            badgeImage: '/assets/badge/endorsed_product_owner_authority.svg',
            price,
            detailLink: '/certifications/epo-a',
          },
        ],
      },
      {
        id: 'SCRUM_FACILITATOR',
        icon: 'presentation',
        tabLabel: this.lang.t('landing.levels.authority.tabLabel'),
        description: this.lang.t('landing.levels.authority.description'),
        explorePath: this.lang.t('landing.levels.authority.explorePath'),
        exploreLink: '/certifications',
        audienceDesc: this.lang.t('landing.levels.authority.audienceDesc'),
        certCards: [
          {
            id: 'esf',
            abbreviation: 'ESF',
            fullName: this.lang.t('landing.certs.esf'),
            levelBadge: foundationLabel,
            badgeColor: '#a69075',
            badgeImage: '/assets/badge/endorsed_scrum_facilitator.svg',
            price,
            detailLink: '/certifications/esf',
          },
        ],
      },
    ];
  }

  /**
   * Resolves to the live grouping while {@link useRealData} is on and the
   * catalog has at least one item, otherwise falls back to the static demo
   * grid (covers "not loaded yet", "load failed", and "off" in one branch).
   */
  protected readonly levels = computed<CertLevelDef[]>(() => {
    if (this.useRealData()) {
      const live = this.buildLiveLevels();
      if (live.length > 0) return live;
    }
    return this.buildStaticLevels();
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
