/**
 * `ios-cert-card` — feature-level certification card.
 *
 * Displays one certification offering: badge image, level chip, abbreviation,
 * full name, key stats (hours, format, exam questions), price, and two CTAs.
 *
 * Lives in `features/landing/components/` (not `ui/`) because it is
 * tightly coupled to the landing feature's cert card structure.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 * ```html
 * <ios-cert-card
 *   [cert]="certCard"
 *   (downloadGuide)="onDownload($event)"
 *   (enrollNow)="onEnroll($event)"
 * />
 * ```
 */

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideClock,
  LucideArrowRight,
  LucideMonitor,
  LucideCircleQuestionMark,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CertificatesBadge, IosIcon, provideIcons } from '@ui';

/**
 * Shape of one certification card.
 * Owned by the component — never server-driven; only structural constants
 * (abbreviation, colors, badge image, price, links) and locale-resolved full
 * name.
 */
export interface CertCardData {
  id: string;
  abbreviation: string;
  fullName: string;
  levelBadge: string;
  badgeColor: string;
  /** Path to the certificate badge SVG, e.g. `/assets/badge/endorsed_scrum_master.svg`. */
  badgeImage: string;
  price: string;
  detailLink: string;
}

@Component({
  selector: 'ios-cert-card',
  imports: [RouterLink, IosIcon, CertificatesBadge],
  providers: [provideIcons(LucideClock, LucideArrowRight, LucideMonitor, LucideCircleQuestionMark)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 border border-ios-border-light rounded-xl p-4 bg-white h-full">
      <!-- Badge image + level chip / abbreviation / name -->
      <div class="flex gap-4 items-start">
        <div class="w-[80px] flex-shrink-0">
          <ios-certificates-badge
            [svgPath]="cert().badgeImage"
            [code]="cert().abbreviation"
            [fullName]="cert().fullName"
          />
        </div>
        <div class="flex flex-col gap-1 pt-1 min-w-0">
          <!-- Level chip — color comes from backend/store -->
          <span
            class="inline-block self-start text-[12px] font-medium text-cer-blue-soft px-3 py-1 rounded-full leading-tight"
            [style.background-color]="cert().badgeColor"
          >
            {{ cert().levelBadge }}
          </span>
          <!-- Abbreviation -->
          <span class="font-heading font-bold text-[28px] leading-tight text-ios-brand-dark">
            {{ cert().abbreviation }}
          </span>
          <!-- Full name -->
          <span class="font-body font-medium text-[15px] text-cer-blue-text leading-snug">
            {{ cert().fullName }}
          </span>
        </div>
      </div>

      <div class="border-t border-ios-border-light"></div>

      <!-- Stats -->
      <div class="flex flex-col gap-2 px-1">
        <div class="flex items-center gap-2 text-[13px] text-ios-fg-8">
          <ios-icon name="clock" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{{ lang.t('landing.levels.cert.hours') }}</span>
        </div>
        <div class="flex items-center gap-2 text-[13px] text-ios-fg-8">
          <ios-icon name="monitor" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{{ lang.t('landing.levels.cert.online') }}</span>
        </div>
        <div class="flex items-center gap-2 text-[13px] text-ios-fg-8">
          <ios-icon name="circle-question-mark" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{{ lang.t('landing.levels.cert.exam') }}</span>
        </div>
      </div>

      <div class="border-t border-ios-border-light"></div>

      <!-- Price -->
      <div class="flex flex-col gap-0.5 px-1">
        <span class="text-[13px] font-medium text-ios-fg-7">
          {{ lang.t('landing.levels.cert.startingAt') }}
        </span>
        <span class="font-heading font-extrabold text-[20px] leading-tight text-ios-brand-dark">
          {{ cert().price }}
        </span>
      </div>

      <!-- Action button -->
      <div class="mt-auto">
        <a
          [routerLink]="cert().detailLink"
          class="w-full flex items-center justify-center gap-2 px-3 py-2.5
                 bg-cer-blue-strong text-white
                 font-heading font-semibold text-[14px] rounded-xl
                 hover:bg-cer-blue-deep transition-colors
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
        >
          {{ lang.t('landing.levels.cert.enrollNow') }}
          <ios-icon
            name="arrow-right"
            class="w-4 h-4 flex-shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
        </a>
      </div>
    </div>
  `,
})
export class CertCard {
  readonly cert = input.required<CertCardData>();

  /** Emits the cert data when "Enroll Now" is clicked. */
  readonly enrollNow = output<CertCardData>();

  protected readonly lang = inject(LanguageService);
}
