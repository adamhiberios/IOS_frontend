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
 *   - Download + Enroll action buttons (enroll arrow flips in RTL)
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
 *     [startingAtLabel]="lang.t('scrumMaster.certPath.startingAt')"
 *     [price]="lang.t('scrumMaster.certPath.price')"
 *     [downloadLabel]="lang.t('scrumMaster.certPath.download')"
 *     [enrollLabel]="lang.t('scrumMaster.certPath.enroll')"
 *   />
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  LucideArrowRight,
  LucideClock,
  LucideDownload,
  LucideCircleQuestionMark,
  LucideMonitor,
} from '@lucide/angular';

import { CertificatesBadge, IosIcon, provideIcons } from '@ui';

@Component({
  selector: 'ios-certification-card',
  imports: [CertificatesBadge, IosIcon],
  providers: [
    provideIcons(
      LucideArrowRight,
      LucideClock,
      LucideDownload,
      LucideCircleQuestionMark,
      LucideMonitor,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex-1 min-w-[280px] bg-white border border-ios-border-light rounded-xl px-4 py-6 flex flex-col gap-4 overflow-hidden"
    >
      <!-- Badge + details row — flex follows inline direction (mirrors in RTL) -->
      <div class="flex items-start gap-4">
        <!-- Certificate badge (SVG alt comes from fullName) -->
        <div class="shrink-0 w-[130px]">
          <ios-certificates-badge [svgPath]="svgPath()" [code]="code()" [fullName]="fullName()" />
        </div>

        <!-- Level pill + code + name -->
        <div class="flex flex-col gap-2 pt-1 flex-1 min-w-0">
          <span
            class="self-start inline-flex items-center justify-center px-3 py-1 rounded-full
                   font-heading font-medium text-[14px] leading-[1.4] whitespace-nowrap"
            style="background-color: #426981; color: #e8edf0;"
          >
            {{ level() }}
          </span>
          <div class="flex flex-col">
            <span
              class="font-heading font-bold text-[28px] leading-[1.2] whitespace-nowrap"
              style="color: #143d56;"
            >
              {{ code() }}
            </span>
            <span class="font-body font-medium text-[16px] leading-[1.4]" style="color: #113348;">
              {{ fullName() }}
            </span>
          </div>
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

      <!-- Divider -->
      <div class="h-px w-full bg-ios-border-light" aria-hidden="true"></div>

      <!-- Price -->
      <div class="flex flex-col ps-2">
        <span class="font-heading font-medium text-[14px] leading-[1.4] text-ios-brand-muted">
          {{ startingAtLabel() }}
        </span>
        <span class="font-heading font-extrabold text-[20px] leading-[1.2]" style="color: #184865;">
          {{ price() }}
        </span>
      </div>

      <!-- Actions — flex row mirrors automatically in RTL -->
      <div class="flex gap-3 items-center">
        <!-- Download brochure -->
        <button
          type="button"
          class="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl
                 font-body font-semibold text-[16px] leading-[1.4] whitespace-nowrap
                 hover:opacity-80 transition-opacity
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style="background-color: #e8edf0; color: #0b202d;"
        >
          <ios-icon name="download" class="w-5 h-5" aria-hidden="true" />
          {{ downloadLabel() }}
        </button>

        <!-- Enroll — arrow flips in RTL -->
        <button
          type="button"
          class="flex items-center justify-center gap-2 h-11 px-6 rounded-xl
                 font-body font-semibold text-[16px] leading-[1.4] text-white whitespace-nowrap
                 hover:opacity-90 transition-opacity
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white/50"
          style="background-color: #184865;"
        >
          {{ enrollLabel() }}
          <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
        </button>
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

  /** Duration string, e.g. "+20 hrs". */
  readonly hours = input<string>('');

  /** Delivery mode label, e.g. "Fully Online". */
  readonly onlineLabel = input<string>('');

  /** Test question count string, e.g. "45-question Test". */
  readonly questions = input<string>('');

  /** "Starting at" label above the price. */
  readonly startingAtLabel = input<string>('');

  /** Price string, e.g. "CAD $180". */
  readonly price = input<string>('');

  /** Label for the download brochure button. */
  readonly downloadLabel = input<string>('');

  /** Label for the enroll button. */
  readonly enrollLabel = input<string>('');
}
