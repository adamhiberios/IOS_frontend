import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { LucideArrowRight, LucideCheck, LucideX } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

import type { CertListCard } from '../data-access/certificates.model';

const FAMILY_BG: Record<string, string> = {
  esm: '#e8edf0',
  epo: '#eeefed',
  esf: '#f4f0eb',
};

@Component({
  selector: 'ios-cert-grid-card',
  imports: [NgOptimizedImage, IosIcon],
  providers: [provideIcons(LucideArrowRight, LucideCheck, LucideX)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <div
      class="flex flex-col gap-3 rounded-2xl px-6 py-4 h-full"
      [style.background-color]="bgColor()"
    >
      <!-- Top section: badge + text -->
      <div class="flex items-start gap-4">
        <div class="relative shrink-0" style="width:70px; height:87px;">
          <img
            [ngSrc]="card().badgeAsset"
            [alt]="lang.t('dashboard.certs.badgeAlt', { code: card().code })"
            class="object-contain w-full h-full"
            width="70"
            height="87"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div class="flex flex-col gap-1 py-3 flex-1 min-w-0">
          <!-- Status row -->
          @if (card().examResult; as result) {
            <div class="flex items-center gap-3">
              @if (result.status === 'earned') {
                <span class="text-[#84b70d] text-[14px] leading-[1.4] whitespace-nowrap">
                  <span class="font-semibold">{{ lang.t('dashboard.certs.passed') }}</span>
                  <span class="font-bold ms-1">{{ result.score }}%</span>
                </span>
              } @else if (result.status === 'failed') {
                <span class="text-ios-danger-mid text-[14px] leading-[1.4] whitespace-nowrap">
                  <span class="font-semibold">{{ lang.t('dashboard.certs.fail') }}</span>
                  <span class="font-bold ms-1">{{ result.score }}%</span>
                </span>
              } @else if (result.status === 'revoked') {
                <span
                  class="text-ios-fg-10 text-[14px] font-semibold leading-[1.4] whitespace-nowrap"
                  >{{ lang.t('dashboard.certs.revoked') }}</span
                >
              }

              @if (result.status === 'earned' || result.status === 'failed') {
                <span
                  class="w-[6px] h-[6px] rounded-full bg-[#c4c5c4] shrink-0"
                  aria-hidden="true"
                ></span>
              }

              @if (result.status === 'earned') {
                <span
                  class="text-ios-fg-10 text-[14px] font-semibold leading-[1.4] whitespace-nowrap"
                  >{{ lang.t('dashboard.certs.earned') }}</span
                >
                <span
                  class="w-[6px] h-[6px] rounded-full bg-[#c4c5c4] shrink-0"
                  aria-hidden="true"
                ></span>
              }

              <span class="text-ios-fg-8 text-[14px] font-medium leading-[1.4] whitespace-nowrap">
                {{ result.duration }}
              </span>
            </div>
          } @else {
            <div class="flex items-center gap-3">
              <span class="text-[#9ca3af] text-[14px] font-medium leading-[1.4]">{{
                lang.t('dashboard.certs.notAttempted')
              }}</span>
            </div>
          }

          <!-- Cert title -->
          <div class="flex items-center gap-2">
            <span class="text-[18px] font-bold leading-[1.2] text-ios-fg-10 whitespace-nowrap">
              {{ card().code }}
            </span>
            <span class="text-[18px] font-medium leading-[1.4] text-ios-fg-8">-</span>
            <span class="text-[18px] font-medium leading-[1.4] text-ios-fg-10 truncate">
              {{ card().name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Divider + bottom section — only when exam result exists -->
      @if (card().examResult; as result) {
        <div class="h-px w-full bg-ios-border-light"></div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8 whitespace-nowrap">
              {{ result.date }}
            </span>
            <span
              class="w-[7px] h-[7px] rounded-full bg-[#c4c5c4] shrink-0"
              aria-hidden="true"
            ></span>
            <div class="flex items-center gap-2">
              <ios-icon name="check" class="w-5 h-5 text-ios-fg-8" aria-hidden="true" />
              <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8 tabular-nums">
                {{ result.correct }}
              </span>
            </div>
            <span
              class="w-[7px] h-[7px] rounded-full bg-[#c4c5c4] shrink-0"
              aria-hidden="true"
            ></span>
            <div class="flex items-center gap-2">
              <ios-icon name="x" class="w-5 h-5 text-ios-fg-8" aria-hidden="true" />
              <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8 tabular-nums">
                {{ result.incorrect }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1 h-9 px-6 py-2 rounded-xl text-[14px] font-semibold leading-[1.4] text-ios-fg-8 bg-transparent hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 whitespace-nowrap"
            (click)="viewDetails.emit(card().code)"
          >
            {{ lang.t('dashboard.certs.showDetails') }}
            <ios-icon
              name="arrow-right"
              class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
          </button>
        </div>
      } @else {
        <div class="flex justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1 h-9 px-6 py-2 rounded-xl text-[14px] font-semibold leading-[1.4] text-ios-fg-8 bg-transparent hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 whitespace-nowrap"
            (click)="viewDetails.emit(card().code)"
          >
            {{ lang.t('dashboard.certs.showDetails') }}
            <ios-icon
              name="arrow-right"
              class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
          </button>
        </div>
      }
    </div>
  `,
})
export class CertGridCard {
  protected readonly lang = inject(LanguageService);
  readonly card = input.required<CertListCard>();

  readonly viewDetails = output<string>();

  protected readonly bgColor = computed(() => FAMILY_BG[this.card().family] ?? '#f6f6f6');
}
