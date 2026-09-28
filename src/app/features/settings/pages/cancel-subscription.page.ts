import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowLeft, LucideCheck } from '@lucide/angular';

import { provideIcons, PageBreadcrumbBar, PageFooter } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

/**
 * `ios-cancel-subscription-page` — Newsletter cancellation reason survey.
 *
 * Figma: node 13476-27255 (Cancel subscription page).
 *
 * Layout:
 *   ┌─ navbar ────────────────────────────────────────────────────────────┐
 *   ├─ breadcrumb (← Cancel subscription) ───────────────────────────── ┤
 *   │                                                                      │
 *   │  Why you Cancel subscription?                                        │
 *   │  ┌──────────────────────────────────────────────────────────────┐  │
 *   │  │ ● Once a week sounds about right.                            │  │
 *   │  │ ○ Let's slow it down-only once a month, please.              │  │
 *   │  │ ○ I take it back! Keep the inspiration coming.               │  │
 *   │  │ ○ It's just not working out. Unsubscribe me.                 │  │
 *   │  └──────────────────────────────────────────────────────────────┘  │
 *   │                                                                      │
 *   │           [     Send, and Cancel subscription    ]                  │
 *   ├─ footer ─────────────────────────────────────────────────────────── ┤
 *   └──────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-cancel-subscription-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardNavbar, PageBreadcrumbBar, PageFooter],
  providers: [provideIcons(LucideArrowLeft, LucideCheck)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <ios-page-breadcrumb-bar
        backLink="/dashboard/settings"
        [backLabel]="lang.t('settings.cancelSubscription.backAriaLabel')"
      >
        <li>
          <span class="font-semibold text-ios-fg-13" aria-current="page">
            {{ lang.t('settings.breadcrumb.cancelSubscription') }}
          </span>
        </li>
      </ios-page-breadcrumb-bar>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
          <!-- Question -->
          <h1 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
            {{ lang.t('settings.cancelSubscription.title') }}
          </h1>

          <!-- Radio option cards -->
          <div
            class="flex flex-col gap-3 max-w-[732px]"
            role="radiogroup"
            aria-labelledby="cancel-reason-heading"
          >
            <span id="cancel-reason-heading" class="sr-only">{{
              lang.t('settings.cancelSubscription.selectReasonSrOnly')
            }}</span>

            @for (option of cancelReasons(); track option.id) {
              <label
                class="flex items-center gap-3 md:gap-4 p-2 pe-4 rounded-3xl md:rounded-[72px] bg-ios-surface-soft cursor-pointer hover:bg-[#e8e8e8] transition-colors focus-within:ring-2 focus-within:ring-ios-brand-primary/30"
                [for]="option.id"
              >
                <input
                  [id]="option.id"
                  type="radio"
                  name="cancel-reason"
                  [value]="option.id"
                  [checked]="selectedReason() === option.id"
                  class="sr-only peer"
                  (change)="selectedReason.set(option.id)"
                />

                <!-- Radio indicator -->
                <span
                  aria-hidden="true"
                  class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  [class.bg-ios-fg]="selectedReason() === option.id"
                  [class.border-2]="selectedReason() !== option.id"
                  [class.border-ios-fg-7]="selectedReason() !== option.id"
                >
                  @if (selectedReason() === option.id) {
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="w-5 h-5 text-white"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  }
                </span>

                <span class="font-medium text-[16px] md:text-[18px] text-ios-fg leading-[1.4]">
                  {{ option.label }}
                </span>
              </label>
            }
          </div>

          <!-- Submit button -->
          <div class="max-w-[732px]">
            <button
              type="button"
              class="w-full sm:w-[378px] flex items-center justify-center h-14 rounded-xl bg-ios-brand-primary text-ios-brand-primary-soft text-[18px] font-semibold leading-[1.4] hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              (click)="onSubmit()"
            >
              {{ lang.t('settings.cancelSubscription.submit') }}
            </button>
          </div>
        </div>
      </main>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <ios-page-footer />
    </div>
  `,
})
export class CancelSubscriptionPage {
  private readonly router = inject(Router);
  protected readonly lang = inject(LanguageService);

  protected readonly cancelReasons = computed(() => [
    { id: 'once-a-week', label: this.lang.t('settings.cancelSubscription.reason1') },
    { id: 'once-a-month', label: this.lang.t('settings.cancelSubscription.reason2') },
    { id: 'keep-coming', label: this.lang.t('settings.cancelSubscription.reason3') },
    { id: 'unsubscribe', label: this.lang.t('settings.cancelSubscription.reason4') },
  ]);

  protected readonly selectedReason = signal<string>('once-a-week');

  protected onSubmit(): void {
    // TODO(epic-X): dispatch cancellation via SettingsStore once the API endpoint exists.
    void this.router.navigate(['/dashboard/settings/subscription-cancelled']);
  }
}

export default CancelSubscriptionPage;
