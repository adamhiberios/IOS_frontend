/**
 * `ios-cert-levels-section` — "Choose Your Certification Path" tabbed carousel (section 5).
 *
 * Manages active-tab state locally (UI state). Certification level data comes
 * from the `levels` input so the section is fully backend-driven.
 *
 * Uses `ios-cert-card` for each individual certification card.
 */

import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCircleQuestionMark } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import { CertCard } from '../cert-card';
import type { CertificationLevel } from '../../data-access/landing.model';

@Component({
  selector: 'ios-cert-levels-section',
  imports: [RouterLink, IosIcon, SectionBadge, CertCard],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight, LucideCircleQuestionMark)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Certification Path" class="bg-ios-surface-warm py-20 lg:py-28">
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
  readonly levels = input.required<CertificationLevel[]>();

  protected readonly lang = inject(LanguageService);
  protected readonly activeLevelIdx = signal(0);

  private readonly carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');

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
