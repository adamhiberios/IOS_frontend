import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { LucideArrowRight, LucideCircleCheckBig, LucideFileText } from '@lucide/angular';

import { CertificatesBadge, IosIcon, provideIcons } from '@ui';

import type { CertificationCard, LearningMaterial } from '../data-access/certificates.model';

/**
 * `ios-cert-learning-materials` — Learning Materials tab content
 * for the certificate detail page.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────────┐
 * │  [Certificate banner card — badge · progress · title · Show details]  │
 * │                                                                        │
 * │  Files (N files)                                                       │
 * │  ─────────────────────────────────────────────────────────────────     │
 * │  [file icon]  Session N  X/Y pages    [ring/check]  Z% Completed  CTA │
 * │  ─────────────────────────────────────────────────────────────────     │
 * │  … repeated per material                                               │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Progress ring: SVG circle (r = 9, circumference ≈ 56.55 px).
 * · completionPercent === 0   → grey outline only (no colored arc).
 * · 0 < completionPercent < 100 → grey outline + partial ESM-teal arc.
 * · completionPercent === 100  → `circle-check-big` icon in accent-green.
 *
 * Figma: node 17683-47474 (banner card) · 17732-48169 (files list).
 */
@Component({
  selector: 'ios-cert-learning-materials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CertificatesBadge, IosIcon],
  providers: [provideIcons(LucideArrowRight, LucideFileText, LucideCircleCheckBig)],
  template: `
    <!-- ── Certificate banner card ── -->
    <div
      class="flex items-center gap-3 bg-cer-blue-soft rounded-2xl px-6 py-4"
      aria-label="{{ cert().code }} certification summary"
    >
      <!-- Badge + active dot -->
      <div class="relative shrink-0" style="width:98px;">
        <ios-certificates-badge
          [svgPath]="cert().imageAsset"
          [code]="cert().code"
          [fullName]="cert().title"
          class="block"
          style="height:122px;"
        />
        <span
          class="absolute top-2 -end-1.5 w-3 h-3 rounded-full bg-ios-success-mid border-2 border-white"
          [attr.aria-label]="lang.t('dashboard.certs.active')"
        ></span>
      </div>

      <!-- Info -->
      <div class="flex flex-col gap-2 flex-1 min-w-0">
        <p class="text-[14px] font-semibold leading-[1.4] text-ios-fg-10 whitespace-nowrap">
          {{ cert().progressPercent }}{{ lang.t('dashboard.certs.percentCompleted') }}
        </p>
        <div class="flex flex-col">
          <p class="text-[18px] font-bold leading-[1.2] text-ios-fg whitespace-nowrap">
            {{ cert().code }}
          </p>
          <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-10">
            {{ cert().title }}
          </p>
        </div>
      </div>

      <!-- Show details -->
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 h-9 px-6 rounded-xl text-[14px] font-semibold leading-[1.4] text-ios-fg-8 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50 whitespace-nowrap shrink-0"
        [attr.aria-label]="lang.t('dashboard.certs.showDetails')"
      >
        {{ lang.t('dashboard.certs.showDetails') }}
        <ios-icon
          name="arrow-right"
          class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- ── Files section ── -->
    <section aria-label="Learning materials files" class="flex flex-col gap-4">
      <!-- Heading row -->
      <div class="flex items-center gap-3">
        <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
          {{ lang.t('dashboard.certs.files') }}
        </h2>
        <span
          class="text-[16px] font-medium leading-[1.4] text-ios-fg-8"
          [attr.aria-label]="materials().length + ' ' + lang.t('dashboard.certs.files')"
        >
          ({{ materials().length }} {{ lang.t('dashboard.certs.files') }})
        </span>
      </div>

      <!-- File rows -->
      <div class="flex flex-col">
        @for (material of materials(); track material.id; let last = $last) {
          <!-- File row -->
          <div class="flex items-center gap-3 w-full py-4" role="listitem">
            <!-- File icon -->
            <div class="shrink-0 w-8 h-8 flex items-center justify-center text-ios-fg">
              <ios-icon name="file-text" class="w-8 h-8" aria-hidden="true" />
            </div>

            <!-- Title + pages + progress -->
            <div class="flex flex-1 min-w-0 items-center gap-2">
              <!-- Name + page count -->
              <div class="flex flex-1 min-w-0 items-center gap-4">
                <span
                  class="text-[18px] font-semibold leading-[1.4] text-ios-fg whitespace-nowrap"
                  [attr.aria-label]="material.title"
                >
                  {{ material.title }}
                </span>
                <span class="text-[14px] font-medium leading-[1.4] text-ios-fg-7 whitespace-nowrap">
                  {{
                    lang.t('dashboard.certs.pagesProgress', {
                      current: material.currentPage.toString(),
                      total: material.totalPages.toString(),
                    })
                  }}
                </span>
              </div>

              <!-- Progress indicator + percentage text -->
              <div class="flex items-center gap-2 w-[242px] shrink-0">
                @if (material.completionPercent === 100) {
                  <!-- Completed: filled circle-check icon -->
                  <ios-icon
                    name="circle-check-big"
                    class="w-6 h-6 text-ios-success-mid shrink-0"
                    [attr.aria-label]="lang.t('dashboard.certs.completed')"
                  />
                } @else {
                  <!-- Ring progress SVG -->
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 25 25"
                    aria-hidden="true"
                    class="shrink-0"
                  >
                    <!-- Track ring -->
                    <circle
                      cx="12.5"
                      cy="12.5"
                      r="9"
                      fill="none"
                      stroke="#d9d9d9"
                      stroke-width="2.5"
                    />
                    @if (material.completionPercent > 0) {
                      <!-- Colored arc -->
                      <circle
                        cx="12.5"
                        cy="12.5"
                        r="9"
                        fill="none"
                        stroke="#184865"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        [attr.stroke-dasharray]="circumference"
                        [attr.stroke-dashoffset]="dashOffset(material.completionPercent)"
                        transform="rotate(-90 12.5 12.5)"
                      />
                    }
                  </svg>
                }

                <span
                  class="text-[14px] font-medium leading-[1.4] text-ios-fg-8 whitespace-nowrap"
                  [attr.aria-label]="
                    material.completionPercent + '% ' + lang.t('dashboard.certs.completed')
                  "
                >
                  {{ material.completionPercent }}{{ lang.t('dashboard.certs.percentCompleted') }}
                </span>
              </div>
            </div>

            <!-- CTA label -->
            <div class="w-[93px] flex items-center justify-end shrink-0">
              <button
                type="button"
                class="text-[16px] font-semibold leading-[1.4] text-ios-fg hover:text-cer-blue-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50 rounded"
                (click)="open.emit(material.id)"
              >
                {{ material.actionLabel }}
              </button>
            </div>
          </div>

          <!-- Divider (not after last item) -->
          @if (!last) {
            <hr class="border-0 border-t border-ios-surface-soft" aria-hidden="true" />
          }
        }
      </div>
    </section>
  `,
  host: {
    class: 'flex flex-col gap-4',
  },
})
export class CertLearningMaterials {
  protected readonly lang = inject(LanguageService);
  /** Certification card data for the banner at the top. */
  readonly cert = input.required<CertificationCard>();
  /** Ordered list of learning material file rows. */
  readonly materials = input.required<readonly LearningMaterial[]>();
  /**
   * Emits the `LearningMaterial.id` when the user clicks an action label
   * ("Open", "Continue", etc.). Parent page handles router navigation.
   */
  readonly open = output<string>();

  /**
   * SVG circle circumference for r = 9.
   * C = 2 × π × 9 ≈ 56.549
   */
  protected readonly circumference = 2 * Math.PI * 9;

  /**
   * Computes the `stroke-dashoffset` for a given completion percentage.
   * offset = circumference × (1 – pct/100)
   * Full offset (100%) = circumference → arc hidden.
   * Zero offset (0%)   = 0            → full arc.
   */
  protected dashOffset(pct: number): number {
    return this.circumference * (1 - pct / 100);
  }
}
