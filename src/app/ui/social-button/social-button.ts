import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon, type LucideIconData } from '@lucide/angular';

import { AppleIcon, GoogleIcon, LinkedinIcon } from './social-icons';

export type SocialProvider = 'google' | 'apple' | 'linkedin';

const PROVIDER_ICON: Record<SocialProvider, LucideIconData> = {
  google: GoogleIcon,
  apple: AppleIcon,
  linkedin: LinkedinIcon,
};

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  linkedin: 'Continue with LinkedIn',
};

/**
 * `ios-social-button` — circular button with a single Lucide-rendered brand
 * glyph. Used for OAuth handoffs (Google / Apple / LinkedIn).
 *
 * Behavior is intentionally inert here: it emits `select` and lets the
 * containing page hand off to the `AuthService` (mocked for now). That keeps
 * this component reusable on the login page later in EPIC 3.
 */
@Component({
  selector: 'ios-social-button',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [attr.aria-label]="label()"
      (click)="selected.emit(provider())"
      class="w-10 h-10 inline-flex items-center justify-center
             rounded-full border border-gray-200 bg-white
             text-ios-brand-dark hover:border-ios-brand-dark/40
             hover:bg-gray-50 focus:outline-none focus:ring-2
             focus:ring-ios-brand-primary/40 transition-colors"
    >
      <svg [lucideIcon]="icon()" class="w-5 h-5" aria-hidden="true"></svg>
    </button>
  `,
})
export class SocialButton {
  readonly provider = input.required<SocialProvider>();

  /** Emits the same provider id on click so the parent can dispatch.
   * Named `selected` (not `select`) to avoid colliding with the native DOM
   * `select` event — caught by `@angular-eslint/no-output-native`. */
  readonly selected = output<SocialProvider>();

  protected readonly icon = computed(() => PROVIDER_ICON[this.provider()]);
  protected readonly label = computed(() => PROVIDER_LABEL[this.provider()]);
}
