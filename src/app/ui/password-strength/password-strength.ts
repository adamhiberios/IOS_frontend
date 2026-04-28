import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { LanguageService } from '@core/i18n';

/**
 * The five rules the meter scores against.
 * All five must pass for a "strong" password — matches `strongPasswordValidator`.
 */
export interface PasswordRules {
  readonly minLength: boolean;
  readonly uppercase: boolean;
  readonly lowercase: boolean;
  readonly digit: boolean;
  readonly special: boolean;
}

type Tier = 'empty' | 'weak' | 'medium' | 'strong';

const TIER_BAR: Record<Tier, string> = {
  empty: 'bg-gray-200',
  weak: 'bg-red-500',
  medium: 'bg-ios-brand-yellow',
  strong: 'bg-emerald-500',
};

/**
 * `ios-password-strength` — a five-segment strength meter.
 *
 *   1–2 rules passing  → red    (weak)
 *   3–4 rules          → yellow (medium)
 *   5 rules            → green  (strong)
 *
 * Each unmet segment fades to a soft surface to give the "progressive light"
 * effect without animating colors mid-typing.
 *
 * Labels are resolved through `LanguageService` so they switch instantly when
 * the user changes the locale on the register / new-password page.
 */
@Component({
  selector: 'ios-password-strength',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="meter"
      [attr.aria-valuenow]="passingCount()"
      aria-valuemin="0"
      aria-valuemax="5"
      [attr.aria-valuetext]="label()"
    >
      <div class="flex gap-1.5 h-1.5">
        @for (segment of segments(); track $index) {
          <div
            class="flex-1 rounded-full transition-colors duration-150"
            [class]="segment.classes"
          ></div>
        }
      </div>
      <p class="text-xs text-gray-500 mt-1">{{ label() }}</p>
    </div>
  `,
})
export class PasswordStrength {
  private readonly lang = inject(LanguageService);

  /** The pass/fail map produced by the parent's password validator. */
  readonly rules = input.required<PasswordRules>();

  protected readonly passingCount = computed(() => {
    const r = this.rules();
    return [r.minLength, r.uppercase, r.lowercase, r.digit, r.special].filter(Boolean).length;
  });

  private readonly tier = computed<Tier>(() => {
    const n = this.passingCount();
    if (n === 0) return 'empty';
    if (n <= 2) return 'weak';
    if (n < 5) return 'medium';
    return 'strong';
  });

  /**
   * Five bar segments. The first `passingCount` segments take the active tier
   * color; remaining segments stay neutral.
   */
  protected readonly segments = computed(() => {
    const n = this.passingCount();
    const activeColor = TIER_BAR[this.tier()];
    return Array.from({ length: 5 }, (_unused, idx) => ({
      classes: idx < n ? `${activeColor} opacity-100` : `${TIER_BAR.empty} opacity-60`,
    }));
  });

  protected readonly label = computed(() => {
    switch (this.tier()) {
      case 'weak':
        return this.lang.t('password.weak');
      case 'medium':
        return this.lang.t('password.medium');
      case 'strong':
        return this.lang.t('password.strong');
      default:
        return this.lang.t('password.hint');
    }
  });
}
