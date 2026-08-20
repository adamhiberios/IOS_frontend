/**
 * `ios-market-stats-section` — "Certification Levels Explained" (section 8).
 *
 * Renders three level cards with floating arrows, a pass-mark note, and a
 * certification grid table.
 *
 * ## Data ownership
 * All content is static. Level tags/names, audience items, descriptions, and
 * cert table cell labels are locale-reactive via `lang.t()`. Cert route links
 * are structural constants. No store input needed.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucidePercent, LucideUserRound } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';

interface MarketLevel {
  tag: string;
  name: string;
  icon: string;
  audience: string[];
  description: string;
}

interface CertTableCell {
  name: string;
  link: string;
  /** This track has no certification at this level — rendered as an em dash. */
  notApplicable?: boolean;
}

interface CertTableRow {
  role: string;
  cells: CertTableCell[];
}

@Component({
  selector: 'ios-market-stats-section',
  imports: [RouterLink, IosIcon, SectionBadge],
  providers: [provideIcons(LucideArrowRight, LucidePercent, LucideUserRound)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.marketStatsSectionAriaLabel')"
      class="bg-white py-[72px]"
    >
      <div
        class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] flex flex-col items-center gap-8"
      >
        <!-- Header -->
        <div class="flex flex-col items-center text-center gap-4">
          <ios-section-badge [text]="lang.t('landing.marketStats.badge')" variant="muted-light" />
          <h2 class="font-heading font-bold text-[clamp(1.5rem,3vw,2.25rem)] leading-tight">
            <span class="text-ios-brand-dark">{{ lang.t('landing.marketStats.headline') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('landing.marketStats.headlineHighlight')
            }}</span>
          </h2>
        </div>

        <!-- Three level cards with floating arrow dividers -->
        <div class="w-full flex flex-col lg:flex-row items-stretch">
          @for (lvl of marketLevels(); track lvl.name; let last = $last) {
            <div
              class="relative flex-1 flex flex-col gap-6 p-6 border border-[#dcdcdc] rounded-lg bg-white"
            >
              <!-- Icon badge — top-right corner -->
              <div
                class="absolute top-[17px] end-[22px] bg-[#f6f6f6] rounded-[78px] p-3 flex items-center justify-center"
                aria-hidden="true"
              >
                <img
                  [src]="lvl.icon"
                  [alt]="lvl.name"
                  width="70"
                  height="70"
                  class="w-[70px] h-[70px] object-contain"
                  loading="lazy"
                />
              </div>

              <!-- Tag + Name -->
              <div class="pe-[100px]">
                <span class="text-[14px] font-medium leading-[1.4] text-[#a02e2e] uppercase block">
                  {{ lvl.tag }}
                </span>
                <h3 class="font-heading font-bold text-[18px] leading-[1.2] text-ios-fg-10 mt-1">
                  {{ lvl.name }}
                </h3>
              </div>

              <!-- It's for -->
              <div class="flex flex-col gap-1">
                <p class="text-[14px] font-medium leading-[1.4] text-[#666766] mb-1">
                  {{ lang.t('landing.marketStats.itsFor') }}
                </p>
                <ul class="flex flex-col gap-1">
                  @for (item of lvl.audience; track item) {
                    @if (item) {
                      <li class="flex items-start gap-2">
                        <ios-icon
                          name="user-round"
                          class="w-5 h-5 flex-shrink-0 text-ios-brand-primary mt-px"
                          aria-hidden="true"
                        />
                        <span class="text-[14px] font-semibold leading-[1.4] text-[#535453]">
                          {{ item }}
                        </span>
                      </li>
                    }
                  }
                </ul>
              </div>

              <div class="border-t border-ios-border-light"></div>

              <p class="text-[14px] font-medium leading-[1.4] text-[#535453] flex-1">
                {{ lvl.description }}
              </p>

              <div class="border-t border-ios-border-light"></div>

              <!-- Pass mark -->
              <div class="flex items-center gap-2">
                <ios-icon
                  name="percent"
                  class="w-5 h-5 flex-shrink-0 text-[#373837]"
                  aria-hidden="true"
                />
                <span class="text-[14px] font-medium leading-[1.4] text-[#373837]">
                  {{ lang.t('landing.marketStats.passMark') }}
                </span>
              </div>
            </div>

            <!-- Floating arrow between cards (not after last) -->
            @if (!last) {
              <div class="hidden lg:flex relative flex-shrink-0 w-6 items-center justify-center">
                <div
                  class="absolute z-10 w-10 h-10 rounded-full border border-[#dcdcdc] bg-white
                         flex items-center justify-center"
                >
                  <ios-icon
                    name="arrow-right"
                    class="w-4 h-4 rtl:rotate-180 text-ios-brand-gold"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div class="lg:hidden h-4"></div>
            }
          }
        </div>

        <!-- Gold separator -->
        <div class="w-full h-px bg-ios-brand-gold"></div>

        <!-- Table intro -->
        <p class="text-[15px] text-ios-fg-8 leading-relaxed w-full">
          {{ lang.t('landing.marketStats.tableIntro') }}
        </p>

        <!-- Certification grid table -->
        <div class="w-full overflow-x-auto rounded-xl border border-ios-border-light">
          <table class="w-full border-collapse text-[14px]">
            <thead>
              <tr class="bg-ios-brand-yellow-soft">
                <th
                  class="text-start px-6 py-4 font-heading font-semibold text-ios-brand-dark border-e border-ios-border-light"
                >
                  {{ lang.t('landing.marketStats.table.roleHeader') }}
                </th>
                <th
                  class="text-start px-6 py-4 font-heading font-semibold text-ios-brand-dark border-e border-ios-border-light"
                >
                  {{ lang.t('landing.marketStats.table.foundationHeader') }}
                </th>
                <th
                  class="text-start px-6 py-4 font-heading font-semibold text-ios-brand-dark border-e border-ios-border-light"
                >
                  {{ lang.t('landing.marketStats.table.practitionerHeader') }}
                </th>
                <th class="text-start px-6 py-4 font-heading font-semibold text-ios-brand-dark">
                  {{ lang.t('landing.marketStats.table.authorityHeader') }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of certTableRows(); track row.role; let even = $even) {
                <tr [class.bg-white]="even" [class.bg-ios-surface-muted]="!even">
                  <td
                    class="px-6 py-4 font-heading font-semibold text-ios-brand-dark border-e border-t border-ios-border-light"
                  >
                    {{ row.role }}
                  </td>
                  @for (cell of row.cells; track $index; let lastCell = $last) {
                    <td
                      class="px-6 py-4 border-t border-ios-border-light"
                      [class.border-e]="!lastCell"
                    >
                      @if (cell.link) {
                        <a
                          [routerLink]="cell.link"
                          class="text-ios-brand-primary font-medium hover:underline
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-ios-brand-primary/50 rounded"
                        >
                          {{ cell.name }}
                        </a>
                      } @else if (cell.notApplicable) {
                        <span class="text-[#c4c5c4] text-[14px]" aria-hidden="true">&mdash;</span>
                        <span class="sr-only">{{ lang.t('landing.certs.notApplicable') }}</span>
                      } @else {
                        <span class="text-[#c4c5c4] text-[14px]">{{ cell.name }}</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
})
export class MarketStatsSection {
  protected readonly lang = inject(LanguageService);

  /**
   * Static market level definitions. All text is locale-reactive via `lang.t()`.
   */
  protected readonly marketLevels = computed<MarketLevel[]>(() => [
    {
      tag: this.lang.t('landing.marketStats.foundation.tag'),
      name: this.lang.t('landing.marketStats.foundation.name'),
      icon: '/assets/icons/knowledge.svg',
      audience: [
        this.lang.t('landing.marketStats.foundation.audience.a0'),
        this.lang.t('landing.marketStats.foundation.audience.a1'),
        this.lang.t('landing.marketStats.foundation.audience.a2'),
      ],
      description: this.lang.t('landing.marketStats.foundation.desc'),
    },
    {
      tag: this.lang.t('landing.marketStats.practitioner.tag'),
      name: this.lang.t('landing.marketStats.practitioner.name'),
      icon: '/assets/icons/expertise.svg',
      audience: [this.lang.t('landing.marketStats.practitioner.audience.a0')],
      description: this.lang.t('landing.marketStats.practitioner.desc'),
    },
    {
      tag: this.lang.t('landing.marketStats.authority.tag'),
      name: this.lang.t('landing.marketStats.authority.name'),
      icon: '/assets/icons/leader.svg',
      audience: [this.lang.t('landing.marketStats.authority.audience.a0')],
      description: this.lang.t('landing.marketStats.authority.desc'),
    },
  ]);

  /**
   * Static cert table rows. Role labels and cert names are locale-reactive;
   * route links are structural constants.
   */
  protected readonly certTableRows = computed<CertTableRow[]>(() => {
    /** Scrum Facilitator is a single-level track — Foundation and Intermediate
     *  do not exist for it and are not planned, so they read as "not
     *  applicable" rather than "coming soon". */
    const notApplicable: CertTableCell = { name: '', link: '', notApplicable: true };
    return [
      {
        role: this.lang.t('landing.marketStats.table.smRole'),
        cells: [
          { name: `${this.lang.t('landing.certs.esm')} (ESM)`, link: '/certifications/esm' },
          { name: `${this.lang.t('landing.certs.psm')} (ESM-P)`, link: '/certifications/esm-p' },
          { name: `${this.lang.t('landing.certs.asm')} (ESM-A)`, link: '/certifications/esm-a' },
        ],
      },
      {
        role: this.lang.t('landing.marketStats.table.poRole'),
        cells: [
          { name: `${this.lang.t('landing.certs.epo')} (EPO)`, link: '/certifications/epo' },
          { name: `${this.lang.t('landing.certs.ppo')} (EPO-P)`, link: '/certifications/epo-p' },
          { name: `${this.lang.t('landing.certs.apo')} (EPO-A)`, link: '/certifications/epo-a' },
        ],
      },
      {
        role: this.lang.t('landing.marketStats.table.sfRole'),
        cells: [
          notApplicable,
          notApplicable,
          { name: `${this.lang.t('landing.certs.esf')} (ESF)`, link: '/certifications/esf' },
        ],
      },
    ];
  });
}
