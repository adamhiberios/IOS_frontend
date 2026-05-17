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
import { LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';

interface MarketLevel {
  tag: string;
  name: string;
  audience: string[];
  description: string;
}

interface CertTableCell {
  name: string;
  link: string;
}

interface CertTableRow {
  role: string;
  cells: CertTableCell[];
}

@Component({
  selector: 'ios-market-stats-section',
  imports: [RouterLink, IosIcon, SectionBadge],
  providers: [provideIcons(LucideArrowRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.marketStatsSectionAriaLabel')"
      class="bg-white py-[72px]"
    >
      <div class="px-6 md:px-16 lg:px-[120px] flex flex-col items-center gap-8">
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
        <div class="w-full flex flex-col md:flex-row items-stretch">
          @for (lvl of marketLevels(); track lvl.name; let last = $last) {
            <div class="flex-1 flex flex-col gap-4 p-6 border border-ios-border-light rounded-xl">
              <!-- Tag + Name -->
              <div>
                <span
                  class="text-[12px] font-bold uppercase tracking-widest text-ios-brand-primary-mid"
                >
                  {{ lvl.tag }}
                </span>
                <h3 class="font-heading font-bold text-[20px] text-ios-fg-10 mt-1">
                  {{ lvl.name }}
                </h3>
              </div>

              <!-- It's for -->
              <div>
                <p class="text-[14px] font-semibold text-ios-fg-10 mb-2">
                  {{ lang.t('landing.marketStats.itsFor') }}
                </p>
                <ul class="space-y-1">
                  @for (item of lvl.audience; track item) {
                    <li class="text-[14px] text-ios-fg-mid">{{ item }}</li>
                  }
                </ul>
              </div>

              <div class="border-t border-ios-border-light"></div>

              <p class="text-[14px] text-ios-fg-mid leading-relaxed flex-1">
                {{ lvl.description }}
              </p>

              <div class="border-t border-ios-border-light"></div>

              <p class="text-[14px] font-semibold text-ios-fg-10">
                {{ lang.t('landing.marketStats.passMark') }}
              </p>
            </div>

            <!-- Floating arrow between cards (not after last) -->
            @if (!last) {
              <div class="hidden lg:flex relative flex-shrink-0 w-6 items-center justify-center">
                <div
                  class="absolute z-10 w-10 h-10 rounded-full border border-ios-border-light bg-white
                         flex items-center justify-center"
                >
                  <ios-icon
                    name="arrow-right"
                    class="w-4 h-4 rtl:rotate-180 text-ios-brand-gold"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div class="md:hidden h-4"></div>
            }
          }
        </div>

        <!-- Gold separator -->
        <div class="w-full h-px bg-ios-brand-gold"></div>

        <!-- Table intro -->
        <p class="text-[15px] text-ios-fg-8 leading-relaxed text-center max-w-[720px]">
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
                  @for (cell of row.cells; track cell.name; let lastCell = $last) {
                    <td
                      class="px-6 py-4 border-t border-ios-border-light"
                      [class.border-e]="!lastCell"
                    >
                      <a
                        [routerLink]="cell.link"
                        class="text-ios-brand-primary font-medium hover:underline
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-ios-brand-primary/50 rounded"
                      >
                        {{ cell.name }}
                      </a>
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
      audience: [
        this.lang.t('landing.levels.foundation.audience.careerChangers'),
        this.lang.t('landing.levels.foundation.audience.newPractitioners'),
        this.lang.t('landing.levels.foundation.audience.teamMembers'),
      ],
      description: this.lang.t('landing.marketStats.foundation.desc'),
    },
    {
      tag: this.lang.t('landing.marketStats.practitioner.tag'),
      name: this.lang.t('landing.marketStats.practitioner.name'),
      audience: [
        this.lang.t('landing.marketStats.practitioner.audience.a0'),
        this.lang.t('landing.marketStats.practitioner.audience.a1'),
        this.lang.t('landing.marketStats.practitioner.audience.a2'),
      ],
      description: this.lang.t('landing.marketStats.practitioner.desc'),
    },
    {
      tag: this.lang.t('landing.marketStats.authority.tag'),
      name: this.lang.t('landing.marketStats.authority.name'),
      audience: [
        this.lang.t('landing.marketStats.authority.audience.a0'),
        this.lang.t('landing.marketStats.authority.audience.a1'),
        this.lang.t('landing.marketStats.authority.audience.a2'),
      ],
      description: this.lang.t('landing.marketStats.authority.desc'),
    },
  ]);

  /**
   * Static cert table rows. Role labels and cert names are locale-reactive;
   * route links are structural constants.
   */
  protected readonly certTableRows = computed<CertTableRow[]>(() => [
    {
      role: this.lang.t('landing.marketStats.table.smRole'),
      cells: [
        { name: this.lang.t('landing.certs.esm'), link: '/certifications/esm' },
        { name: this.lang.t('landing.certs.psm'), link: '/certifications/psm' },
        { name: this.lang.t('landing.certs.asm'), link: '/certifications/asm' },
      ],
    },
    {
      role: this.lang.t('landing.marketStats.table.poRole'),
      cells: [
        { name: this.lang.t('landing.certs.epo'), link: '/certifications/epo' },
        { name: this.lang.t('landing.certs.ppo'), link: '/certifications/ppo' },
        { name: this.lang.t('landing.certs.apo'), link: '/certifications/apo' },
      ],
    },
    {
      role: this.lang.t('landing.marketStats.table.sfRole'),
      cells: [
        { name: this.lang.t('landing.certs.esf'), link: '/certifications/esf' },
        { name: this.lang.t('landing.certs.psf'), link: '/certifications/psf' },
        { name: this.lang.t('landing.certs.asf'), link: '/certifications/asf' },
      ],
    },
  ]);
}
