import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { LucideArrowRight, LucideCalendar } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

import type { EnrolledCertHeader } from '../data-access/certificates.model';

const FAMILY_HERO_BG: Record<string, string> = {
  esm: '#184865',
  epo: '#455041',
  esf: '#8e6636',
};

const FAMILY_BUTTON_BG: Record<string, string> = {
  esm: '#e8edf0',
  epo: '#eeefed',
  esf: '#f4f0eb',
};

const FAMILY_BUTTON_TEXT: Record<string, string> = {
  esm: '#0b202d',
  epo: '#242a23',
  esf: '#402e18',
};

const FAMILY_PROGRESS_TEXT: Record<string, string> = {
  esm: '#ffffff',
  epo: '#ffffff',
  esf: '#f4f0eb',
};

@Component({
  selector: 'ios-enrolled-cert-row',
  imports: [NgOptimizedImage, IosIcon],
  providers: [provideIcons(LucideArrowRight, LucideCalendar)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="w-full"
      [style.background-color]="heroBg()"
      [attr.aria-label]="lang.t('dashboard.certs.badgeAlt', { code: cert().code })"
    >
      <div class="max-w-[1400px] mx-auto px-8 py-8 flex items-center gap-6">
        <!-- Badge + green dot -->
        <div class="relative shrink-0" style="width:88.8px; height:111px;">
          <img
            [ngSrc]="cert().badgeAsset"
            [alt]="lang.t('dashboard.certs.badgeAlt', { code: cert().code })"
            class="object-contain w-full h-full"
            width="89"
            height="111"
            loading="lazy"
            decoding="async"
          />
          @if (cert().isActive) {
            <span class="absolute" style="top:8.67px; right:0; width:8.69px; height:8.67px;">
              <span
                class="block w-full h-full rounded-full bg-green-500 border-2 border-white"
              ></span>
            </span>
          }
        </div>

        <!-- Cert info -->
        <div class="flex flex-col gap-3 flex-1 min-w-0">
          <!-- Status row -->
          <div class="flex items-center gap-3">
            <span
              class="inline-flex items-center justify-center px-3 py-1 rounded text-[16px] font-bold leading-[1.3] text-ios-success-strong bg-[#b5db5e] whitespace-nowrap"
            >
              {{ lang.t('dashboard.certs.active') }}
            </span>
            <span
              class="w-[7px] h-[7px] rounded-full bg-[#c4c5c4] shrink-0"
              aria-hidden="true"
            ></span>
            <div class="flex items-center gap-2">
              <div
                class="w-[25px] h-[25px] rounded-full bg-white/20 flex items-center justify-center"
                aria-hidden="true"
              >
                <ios-icon name="calendar" class="w-3.5 h-3.5" />
              </div>
              <span
                class="text-[16px] font-medium leading-[1.4] whitespace-nowrap"
                [style.color]="progressTextColor()"
              >
                {{ cert().progressPercent }}{{ lang.t('dashboard.certs.percentCompleted') }}
              </span>
            </div>
          </div>

          <!-- Cert name -->
          <div class="flex items-center gap-3 text-white">
            <span class="text-[28px] font-bold leading-[1.2] whitespace-nowrap font-heading">
              {{ cert().familyLabel }}
            </span>
            <span class="text-[28px] font-semibold leading-[1.2] font-heading">-</span>
            <span class="text-[28px] font-semibold leading-[1.2] truncate font-heading">
              {{ cert().fullName }}
            </span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-start gap-6 shrink-0">
          <button
            type="button"
            class="inline-flex items-center justify-center h-11 rounded-xl text-[16px] font-semibold leading-[1.4] text-white border border-white/30 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 whitespace-nowrap"
            style="padding-left:24px; padding-right:16px; width:177px;"
            (click)="viewDetails.emit(cert().code)"
          >
            {{ lang.t('dashboard.certs.showDetails') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 h-11 rounded-xl text-[16px] font-semibold leading-[1.4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 whitespace-nowrap"
            [style.background-color]="buttonBg()"
            [style.color]="buttonText()"
            style="padding-left:24px; padding-right:16px; width:217px;"
          >
            {{ lang.t('dashboard.certs.startTestExam') }}
            <ios-icon
              name="arrow-right"
              class="w-5 h-5 shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  `,
})
export class EnrolledCertRow {
  protected readonly lang = inject(LanguageService);
  readonly cert = input.required<EnrolledCertHeader>();

  readonly viewDetails = output<string>();

  protected heroBg(): string {
    return FAMILY_HERO_BG[this.cert().family] ?? '#184865';
  }

  protected buttonBg(): string {
    return FAMILY_BUTTON_BG[this.cert().family] ?? '#e8edf0';
  }

  protected buttonText(): string {
    return FAMILY_BUTTON_TEXT[this.cert().family] ?? '#0b202d';
  }

  protected progressTextColor(): string {
    return FAMILY_PROGRESS_TEXT[this.cert().family] ?? '#ffffff';
  }
}
