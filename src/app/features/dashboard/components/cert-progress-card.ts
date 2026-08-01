import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

import type { ValidCertification } from '../data-access/dashboard.model';

/** Background colours per cert family — from Figma design tokens. */
const FAMILY_BG: Record<string, string> = {
  esm: '#e8edf0', // ESM/esm-1 (blue-soft)
  epo: '#eeefed', // EPO/epo-1 (green-soft)
  esf: '#f6f6f6', // neutral
};

/**
 * `ios-cert-progress-card` — standalone certification card.
 *
 * Used in two contexts within the overview page:
 *  · 1-cert: rendered inside the 3rd column (column already has the
 *    "Valid certification" heading above it).
 *  · 2-cert: rendered in a 2-column equal grid below the charts row
 *    (the heading is also external, above the grid).
 *
 * Exact Figma spec (node 17683:46512 / 17683:46524):
 *  · Background  : #E8EDF0 (ESM) or #EEEFED (EPO)
 *  · Padding     : px-6 py-4  (24px / 16px)
 *  · Border-radius: 16px
 *  · Badge       : 70 × 87 px
 *  · Active dot  : 8px circle, positioned at left-[66px] top-[6px]
 *  · Code        : Montserrat Bold 18px, #272827
 *  · Name        : Montserrat Medium 16px, #373837
 *  · Divider     : 1px solid #dcdcdc
 *  · "X% Completed": Medium 14px, #373837
 *  · "Show details": SemiBold 14px, #666766 + 18px arrow icon
 */
@Component({
  selector: 'ios-cert-progress-card',
  imports: [NgOptimizedImage, RouterLink, IosIcon],
  providers: [provideIcons(LucideArrowRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 rounded-2xl px-6 py-4" [style.background-color]="bgColor()">
      <!-- Badge + active dot + code + name -->
      <div class="flex items-center gap-4 relative">
        <!-- Badge image (70 × 87 px) -->
        <img
          [ngSrc]="cert().badgeAsset"
          [alt]="lang.t('dashboard.certs.badgeAlt', { code: cert().code })"
          class="shrink-0 object-contain"
          style="width:70px; height:87px;"
          width="70"
          height="87"
          loading="lazy"
          decoding="async"
        />

        <!-- Active indicator dot — absolute positioned top-left of badge -->
        <span
          class="absolute top-1.5 start-[66px] w-2 h-2 rounded-full bg-green-500"
          aria-hidden="true"
        ></span>

        <!-- Code + name -->
        <div class="flex flex-col min-w-0">
          <span class="text-[18px] font-bold leading-[1.2] text-ios-fg whitespace-nowrap">
            {{ cert().code }}
          </span>
          <span class="text-base font-medium leading-[1.4] text-ios-fg-10">
            {{ cert().name }}
          </span>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px w-full bg-ios-border-light"></div>

      <!-- Footer: progress + show details -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium leading-[1.4] text-ios-fg-10 whitespace-nowrap">
          {{ cert().progressPercent }}{{ lang.t('dashboard.certs.percentCompleted') }}
        </span>

        <a
          [routerLink]="['/dashboard/certificates', cert().code]"
          class="flex items-center gap-1 text-sm font-semibold leading-[1.4] text-ios-fg-8 hover:text-ios-fg-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 rounded px-1"
        >
          {{ lang.t('dashboard.certs.showDetails') }}
          <ios-icon
            name="arrow-right"
            class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
        </a>
      </div>
    </div>
  `,
})
export class CertProgressCard {
  protected readonly lang = inject(LanguageService);
  readonly cert = input.required<ValidCertification>();

  /** Background colour derived from the certification family. */
  protected readonly bgColor = computed(() => FAMILY_BG[this.cert().family] ?? '#f6f6f6');
}
