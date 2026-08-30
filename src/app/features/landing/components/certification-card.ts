/**
 * `ios-certification-card` — a certification level card used in the
 * "Certification Path" section of landing pages.
 *
 * Each card shows:
 *   - A `CertificatesBadge` on the start side (mirrors in RTL)
 *   - Level label pill, code, and full name
 *   - A divider
 *   - Hours / online / questions meta row
 *   - A divider
 *   - Price
 *   - Enroll action button, linking to the cert's detail page (arrow flips in RTL)
 *
 * Usage:
 *   <ios-certification-card
 *     svgPath="/assets/badge/endorsed_scrum_master.svg"
 *     level="Foundation Level"
 *     code="ESM"
 *     fullName="Endorsed Scrum Master"
 *     [hours]="lang.t('scrumMaster.certPath.hours')"
 *     [onlineLabel]="lang.t('scrumMaster.certPath.online')"
 *     [questions]="lang.t('scrumMaster.certPath.questions')"
 *     [totalFeeLabel]="lang.t('scrumMaster.certPath.totalFee')"
 *     [enrollLabel]="lang.t('scrumMaster.certPath.enroll')"
 *     detailLink="/certifications/esm"
 *   />
 *
 * The fee is not passed in: it is resolved from `code` against
 * `PublicCatalogStore`, so every surface shows the one price the backend
 * publishes (IDD-257). Nothing renders in the fee slot until the catalog
 * resolves, or when the code has no live listing.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideClock,
  LucideCircleQuestionMark,
  LucideMonitor,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CertificatesBadge, IosIcon, provideIcons } from '@ui';

import { PublicCatalogStore } from '../data-access/catalog.store';
import { formatPrice } from '../data-access/catalog.mappers';

@Component({
  selector: 'ios-certification-card',
  imports: [CertificatesBadge, IosIcon, RouterLink],
  providers: [provideIcons(LucideArrowRight, LucideClock, LucideCircleQuestionMark, LucideMonitor)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full h-full bg-white border border-ios-border-light rounded-xl px-4 py-6 flex flex-col gap-4 overflow-hidden"
    >
      <!-- Badge + details row — flex follows inline direction (mirrors in RTL) -->
      <div class="flex items-start gap-4">
        <!-- Certificate badge (SVG alt comes from fullName) -->
        <div class="shrink-0 w-[130px]">
          <ios-certificates-badge [svgPath]="svgPath()" [code]="code()" [fullName]="fullName()" />
        </div>

        <!-- Level pill + code + name -->
        <div class="flex flex-col gap-2 pt-1 flex-1 min-w-0 overflow-hidden">
          <span
            class="self-start inline-flex items-center justify-center px-3 py-1 rounded-full
                   font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap"
            [style.background-color]="levelBgColor()"
            [style.color]="levelTextColor()"
          >
            {{ level() }}
          </span>
          <div class="flex flex-col">
            <span
              class="font-heading font-bold text-[28px] leading-[1.2]"
              [style.color]="codeColor()"
            >
              {{ code() }}
            </span>
            <span
              class="font-body font-medium text-[16px] leading-[1.4] break-words"
              [style.color]="fullNameColor()"
            >
              {{ fullName() }}
            </span>
          </div>
          <!-- Inline price shown directly under fullName when showTotalFeePrice is true -->
          @if (showTotalFeePrice() && price()) {
            <div class="flex flex-col mt-1">
              <span class="font-heading font-medium text-[13px] leading-[1.4] text-ios-brand-muted">
                {{ totalFeeLabel() }}
              </span>
              <span
                class="font-heading font-extrabold text-[18px] leading-[1.2]"
                [style.color]="priceColor()"
              >
                {{ price() }}
              </span>
            </div>
          }
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px w-full bg-ios-border-light" aria-hidden="true"></div>

      <!-- Meta row: hours / online / questions -->
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-1">
          <ios-icon name="clock" class="w-5 h-5 text-ios-fg-muted" aria-hidden="true" />
          <span
            class="font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap text-ios-fg-muted"
          >
            {{ hours() }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <ios-icon name="monitor" class="w-5 h-5 text-ios-fg-muted" aria-hidden="true" />
          <span
            class="font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap text-ios-fg-muted"
          >
            {{ onlineLabel() }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <ios-icon
            name="circle-question-mark"
            class="w-5 h-5 text-ios-fg-muted"
            aria-hidden="true"
          />
          <span
            class="font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap text-ios-fg-muted"
          >
            {{ questions() }}
          </span>
        </div>
      </div>

      @if (!showTotalFeePrice() && price()) {
        <!-- Divider -->
        <div class="h-px w-full bg-ios-border-light" aria-hidden="true"></div>

        <!-- Price -->
        <div class="flex flex-col ps-2">
          <span class="font-heading font-medium text-[14px] leading-[1.4] text-ios-brand-muted">
            {{ totalFeeLabel() }}
          </span>
          <span
            class="font-heading font-extrabold text-[20px] leading-[1.2]"
            [style.color]="priceColor()"
          >
            {{ price() }}
          </span>
        </div>
      }

      <!-- Actions -->
      <div class="flex items-center">
        <!-- Enroll — navigates to the cert's detail page; arrow flips in RTL -->
        <a
          [routerLink]="detailLink()"
          class="w-full flex items-center justify-center gap-2 h-11 px-6 rounded-xl
                 font-body font-semibold text-[16px] leading-[1.4] text-white whitespace-nowrap
                 hover:opacity-90 transition-opacity
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white/50"
          [style.background-color]="enrollBgColor()"
        >
          {{ enrollLabel() }}
          <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
        </a>
      </div>
    </div>
  `,
})
export class CertificationCard {
  /** Path to a pre-designed badge SVG in `assets/badge/`. */
  readonly svgPath = input<string>('');

  /** Level label shown in the pill, e.g. "Foundation Level". */
  readonly level = input<string>('');

  /** Short certification code, e.g. "ESM". */
  readonly code = input<string>('');

  /** Full certification name, e.g. "Endorsed Scrum Master". */
  readonly fullName = input<string>('');

  /** Duration string, e.g. "+15 hrs". */
  readonly hours = input<string>('');

  /** Delivery mode label, e.g. "Fully Online". */
  readonly onlineLabel = input<string>('');

  /** Test question count string, e.g. "45-question Test". */
  readonly questions = input<string>('');

  /** "Total Fee" label above the price. */
  readonly totalFeeLabel = input<string>('');

  /** Label for the enroll button. */
  readonly enrollLabel = input<string>('');

  /** Router link to the certification's detail page, e.g. `/certifications/esm`. */
  readonly detailLink = input<string>('');

  /**
   * When `true`, displays the "Total Fee" label + price inline directly
   * below the `fullName` inside the badge-details block (in addition to the
   * standard price row below the meta divider).
   * Default: `false` — existing behaviour is unchanged.
   */
  readonly showTotalFeePrice = input<boolean>(false);

  // ── Theming inputs (optional — SM blue defaults match existing pages) ──────

  /** Background colour of the level pill. Default: SM navy #426981. */
  readonly levelBgColor = input<string>('#426981');

  /** Text colour of the level pill. Default: SM light #e8edf0. */
  readonly levelTextColor = input<string>('#e8edf0');

  /** Colour of the code string (e.g. "ESM"). Default: #143d56. */
  readonly codeColor = input<string>('#143d56');

  /** Colour of the full name string. Default: #113348. */
  readonly fullNameColor = input<string>('#113348');

  /** Colour of the price string. Default: SM navy #184865. */
  readonly priceColor = input<string>('#184865');

  /** Background colour of the Enroll button. Default: SM navy #184865. */
  readonly enrollBgColor = input<string>('#184865');

  private readonly lang = inject(LanguageService);
  private readonly catalog = inject(PublicCatalogStore);

  constructor() {
    // Idempotent and shared across every card on the page.
    void this.catalog.load();
  }

  /**
   * The fee for this card's `code`, formatted in the backend's own currency.
   * Empty while the catalog is still loading and for a code with no live
   * listing — the fee row is omitted rather than showing a stale or invented
   * figure (IDD-257).
   */
  protected readonly price = computed<string>(() => {
    const cert = this.catalog.byCode(this.code());
    if (cert === undefined) return '';
    return formatPrice(cert.price, cert.currency, this.lang.locale());
  });
}
