import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The four rules the meter scores against. Order is rendered in the UI. */
export interface PasswordRules {
  readonly minLength: boolean;
  readonly uppercase: boolean;
  readonly lowercase: boolean;
  readonly special: boolean;
}

type Tier = 'empty' | 'weak' | 'medium' | 'strong';

const TIER_BAR: Record<Tier, string> = {
  empty: 'bg-gray-200',
  weak: 'bg-red-500',
  medium: 'bg-ios-brand-yellow',
  strong: 'bg-emerald-500',
};

const TIER_LABEL: Record<Tier, string> = {
  empty: 'Password should include special characters, numbers and big letter at least',
  weak: 'Weak — keep going',
  medium: 'Almost there',
  strong: 'Strong password',
};

/**
 * `ios-password-strength` — a four-segment strength meter.
 *
 *   1 rule passing → red
 *   2–3 rules     → yellow (#F1D763)
 *   4 rules       → green
 *
 * Each unmet segment fades to a soft surface to give the "progressive light"
 * effect the design brief asked for, without animating colors mid-typing.
 */
@Component({
  selector: 'ios-password-strength',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="meter"
      [attr.aria-valuenow]="passingCount()"
      aria-valuemin="0"
      aria-valuemax="4"
      [attr.aria-valuetext]="label()"
    >
      <div class="flex gap-2 h-1.5">
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
  /** The pass/fail map produced by the parent's password validator. */
  readonly rules = input.required<PasswordRules>();

  protected readonly passingCount = computed(() => {
    const r = this.rules();
    return [r.minLength, r.uppercase, r.lowercase, r.special].filter(Boolean).length;
  });

  private readonly tier = computed<Tier>(() => {
    const n = this.passingCount();
    if (n === 0) return 'empty';
    if (n === 1) return 'weak';
    if (n < 4) return 'medium';
    return 'strong';
  });

  /**
   * Four bar segments. The first `passingCount` segments take the active tier
   * color; remaining segments stay neutral. That gives the "progressive light"
   * feel without staggered animations.
   */
  protected readonly segments = computed(() => {
    const n = this.passingCount();
    const activeColor = TIER_BAR[this.tier()];
    return Array.from({ length: 4 }, (_unused, idx) => ({
      classes: idx < n ? `${activeColor} opacity-100` : `${TIER_BAR.empty} opacity-60`,
    }));
  });

  protected readonly label = computed(() => TIER_LABEL[this.tier()]);
}
