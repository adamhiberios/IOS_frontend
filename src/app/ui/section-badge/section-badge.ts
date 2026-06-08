/**
 * `ios-section-badge` — pill label used at the top of each landing page section.
 *
 * Appears above the section heading to categorise the section, e.g.
 * "Value Proposition", "How It Works", "Insights & Resources".
 *
 * ── Variants ──────────────────────────────────────────────────────────────
 * | variant      | background              | border              | text                 | Use on          |
 * |--------------|-------------------------|---------------------|----------------------|-----------------|
 * | amber (dflt) | ios-brand-amber-soft    | ios-brand-amber     | ios-brand-primary    | light sections  |
 * | gold         | transparent             | ios-brand-gold      | ios-brand-primary    | warm sections   |
 * | muted-light  | ios-brand-gold-soft     | none                | ios-brand-primary    | white sections  |
 * | dark         | ios-brand-primary-mid   | none                | ios-brand-gold       | primary-bg secs |
 * | warm-red     | ios-brand-gold-soft     | ios-brand-gold      | ios-brand-primary    | warm/cream secs |
 * | yellow       | ios-brand-yellow-bright | none                | ios-brand-primary    | cta/CTA secs    |
 * | cta-dark     | ios-brand-primary-mid   | none                | ios-brand-yellow-bright | dark CTA secs |
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 * ```html
 * <ios-section-badge text="Value Proposition" />
 * <ios-section-badge text="How It Works" variant="warm-red" />
 * <ios-section-badge text="Why Scrum Certification Matters" variant="dark" />
 * ```
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SectionBadgeVariant =
  | 'amber'
  | 'gold'
  | 'muted-light'
  | 'dark'
  | 'warm-red'
  | 'yellow'
  | 'cta-dark';

@Component({
  selector: 'ios-section-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <span [class]="classes()">{{ text() }}</span> `,
})
export class SectionBadge {
  readonly text = input.required<string>();
  readonly variant = input<SectionBadgeVariant>('amber');

  readonly classes = computed(() => {
    const base =
      'inline-block font-heading font-semibold text-[13px] tracking-widest px-4 py-1.5 rounded-full';

    const variants: Record<SectionBadgeVariant, string> = {
      amber: 'bg-ios-brand-amber-soft border border-ios-brand-amber text-ios-brand-primary',
      gold: 'bg-transparent border border-ios-brand-gold text-ios-brand-primary',
      'muted-light': 'bg-ios-brand-gold-soft text-ios-brand-primary',
      dark: 'bg-ios-brand-primary-mid text-ios-brand-gold',
      'warm-red': 'bg-ios-brand-gold-soft border border-ios-brand-gold text-ios-brand-primary',
      yellow: 'bg-ios-brand-yellow-bright text-ios-brand-primary',
      'cta-dark': 'bg-ios-brand-primary-mid text-ios-brand-yellow-bright',
    };

    return `${base} ${variants[this.variant()]}`;
  });
}
