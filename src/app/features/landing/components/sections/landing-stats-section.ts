/**
 * `ios-landing-stats-section` — live platform counters shown as a band directly
 * under the hero (BE-I-20, `GET /landing.stats`).
 *
 * Presentational: the parent passes `stats`; labels are `lang.t()`. Numbers are
 * locale-formatted. Renders nothing until there is at least one non-zero counter
 * (so it stays hidden on the fallback/zero state rather than showing "0").
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { LanguageService } from '@core/i18n';

import { type LandingStats } from '../../data-access/landing.model';

interface StatItem {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'ios-landing-stats-section',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasData()) {
      <section
        [attr.aria-label]="lang.t('landing.stats.sectionAriaLabel')"
        class="bg-ios-brand-dark"
      >
        <div class="px-6 md:px-16 lg:px-[120px] py-8">
          <dl class="grid grid-cols-3 gap-4 max-w-3xl mx-auto text-center">
            @for (item of items(); track item.label) {
              <div class="flex flex-col items-center gap-1">
                <dt class="sr-only">{{ item.label }}</dt>
                <dd
                  class="font-heading font-extrabold text-[clamp(1.5rem,4vw,2.25rem)] text-white leading-none"
                >
                  {{ item.value }}
                </dd>
                <span
                  class="font-body text-[12px] md:text-[13px] uppercase tracking-wide text-white/60"
                >
                  {{ item.label }}
                </span>
              </div>
            }
          </dl>
        </div>
      </section>
    }
  `,
})
export class LandingStatsSection {
  readonly stats = input.required<LandingStats>();
  protected readonly lang = inject(LanguageService);

  protected readonly hasData = computed(() => {
    const s = this.stats();
    return s.programs > 0 || s.students > 0 || s.certificatesIssued > 0;
  });

  protected readonly items = computed<StatItem[]>(() => {
    const s = this.stats();
    return [
      { value: this.format(s.programs), label: this.lang.t('landing.stats.programs') },
      { value: this.format(s.students), label: this.lang.t('landing.stats.students') },
      {
        value: this.format(s.certificatesIssued),
        label: this.lang.t('landing.stats.certificatesIssued'),
      },
    ];
  });

  private format(value: number): string {
    return new Intl.NumberFormat(this.lang.locale()).format(value);
  }
}
