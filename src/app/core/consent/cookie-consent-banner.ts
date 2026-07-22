import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageService } from '@core/i18n';

import { ConsentStore } from './consent.store';

/**
 * `ios-cookie-consent-banner` — GDPR cookie-consent banner (BE-042 / C2).
 *
 * Root-mounted app chrome (rendered from `app.ts`), so it appears on public and
 * authenticated routes alike — consent can be given before login. Reads the
 * {@link ConsentStore}: shows while no decision exists for the current policy
 * version, hides once the user chooses.
 *
 * Privacy-preserving by default (all non-essential OFF until explicitly enabled
 * in the manage view). This is an explicit, user-driven consent action — nothing
 * is recorded until the user clicks a choice. Placed in `core/` as global
 * infrastructure tied to the consent singleton, not a reusable `ui/` primitive.
 *
 * A11y: a labelled `role="region"`; the manage view uses native checkboxes with
 * visible labels; every control has a `:focus-visible` ring.
 */
@Component({
  selector: 'ios-cookie-consent-banner',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.visible()) {
      <div
        class="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6"
        role="region"
        [attr.aria-label]="lang.t('consent.regionLabel')"
      >
        <div
          class="max-w-[1400px] mx-auto bg-white rounded-2xl border border-ios-surface-soft shadow-2xl p-6 flex flex-col gap-4"
        >
          <div class="flex flex-col gap-1">
            <h2 class="text-[18px] font-semibold leading-[1.3] text-ios-fg-13">
              {{ lang.t('consent.heading') }}
            </h2>
            <p class="text-sm leading-[1.5] text-ios-fg-8">
              {{ lang.t('consent.description') }}
              <a
                routerLink="/privacy-policy"
                class="font-semibold text-ios-brand-primary underline hover:text-ios-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40 rounded-sm"
              >
                {{ lang.t('consent.policyLink') }}
              </a>
            </p>
          </div>

          <!-- Manage view: per-category toggles (privacy-preserving defaults) -->
          @if (manageOpen()) {
            <fieldset class="flex flex-col gap-3 border-t border-ios-surface-soft pt-4">
              <legend class="sr-only">{{ lang.t('consent.manageLegend') }}</legend>

              <div class="flex items-start gap-3">
                <input
                  id="consent-necessary"
                  type="checkbox"
                  checked
                  disabled
                  class="mt-1 h-4 w-4 accent-ios-brand-primary"
                />
                <label for="consent-necessary" class="flex flex-col">
                  <span class="text-sm font-semibold text-ios-fg-13">
                    {{ lang.t('consent.categories.necessary.label') }}
                  </span>
                  <span class="text-xs text-ios-fg-8">
                    {{ lang.t('consent.categories.necessary.hint') }}
                  </span>
                </label>
              </div>

              <div class="flex items-start gap-3">
                <input
                  id="consent-analytics"
                  type="checkbox"
                  [checked]="analytics()"
                  (change)="analytics.set($any($event.target).checked)"
                  class="mt-1 h-4 w-4 accent-ios-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40"
                />
                <label for="consent-analytics" class="flex flex-col">
                  <span class="text-sm font-semibold text-ios-fg-13">
                    {{ lang.t('consent.categories.analytics.label') }}
                  </span>
                  <span class="text-xs text-ios-fg-8">
                    {{ lang.t('consent.categories.analytics.hint') }}
                  </span>
                </label>
              </div>

              <div class="flex items-start gap-3">
                <input
                  id="consent-marketing"
                  type="checkbox"
                  [checked]="marketing()"
                  (change)="marketing.set($any($event.target).checked)"
                  class="mt-1 h-4 w-4 accent-ios-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40"
                />
                <label for="consent-marketing" class="flex flex-col">
                  <span class="text-sm font-semibold text-ios-fg-13">
                    {{ lang.t('consent.categories.marketing.label') }}
                  </span>
                  <span class="text-xs text-ios-fg-8">
                    {{ lang.t('consent.categories.marketing.hint') }}
                  </span>
                </label>
              </div>
            </fieldset>
          }

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            @if (manageOpen()) {
              <button
                type="button"
                class="h-11 px-5 rounded-xl bg-ios-surface-soft text-ios-fg text-sm font-semibold hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg/30 order-2 sm:order-1"
                (click)="onSave()"
              >
                {{ lang.t('consent.savePreferences') }}
              </button>
            } @else {
              <button
                type="button"
                class="h-11 px-5 rounded-xl bg-transparent text-ios-fg-8 text-sm font-semibold hover:text-ios-fg-13 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg/30 order-3 sm:order-1"
                (click)="manageOpen.set(true)"
              >
                {{ lang.t('consent.manage') }}
              </button>
            }

            <button
              type="button"
              class="h-11 px-5 rounded-xl bg-ios-surface-soft text-ios-fg text-sm font-semibold hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg/30 order-2"
              (click)="store.rejectNonEssential()"
            >
              {{ lang.t('consent.rejectNonEssential') }}
            </button>

            <button
              type="button"
              class="h-11 px-5 rounded-xl bg-ios-brand-primary text-white text-sm font-semibold hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 order-1 sm:order-3"
              (click)="store.acceptAll()"
            >
              {{ lang.t('consent.acceptAll') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CookieConsentBanner {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(ConsentStore);

  protected readonly manageOpen = signal(false);
  protected readonly analytics = signal(this.store.selection().analytics);
  protected readonly marketing = signal(this.store.selection().marketing);

  protected onSave(): void {
    this.store.save({ analytics: this.analytics(), marketing: this.marketing() });
  }
}
