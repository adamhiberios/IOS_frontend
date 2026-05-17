import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCheck } from '@lucide/angular';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

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
  imports: [DashboardNavbar, RouterLink, IosIcon, CanadaFlag],
  providers: [provideIcons(LucideArrowLeft, LucideCheck)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-[#f1f1f1]">
        <div class="max-w-[1400px] mx-auto px-8 h-[70px] flex items-center">
          <div class="flex items-center gap-4">
            <a
              routerLink="/dashboard/settings"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f1f1f1] text-[#272827] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/30"
              aria-label="Back to Settings"
            >
              <ios-icon name="arrow-left" class="w-5 h-5" aria-hidden="true" />
            </a>
            <nav aria-label="Breadcrumb">
              <ol
                class="flex items-center gap-3 text-base leading-[1.4] whitespace-nowrap"
                role="list"
              >
                <li>
                  <span class="font-semibold text-[#141514]" aria-current="page">
                    Cancel subscription
                  </span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-8 flex flex-col gap-8">
          <!-- Question -->
          <h1 class="text-[18px] font-semibold leading-[1.4] text-[#141514]">
            Why you Cancel subscription?
          </h1>

          <!-- Radio option cards -->
          <div
            class="flex flex-col gap-3 max-w-[732px]"
            role="radiogroup"
            aria-labelledby="cancel-reason-heading"
          >
            <span id="cancel-reason-heading" class="sr-only">Select a reason for cancellation</span>

            @for (option of cancelReasons; track option.id) {
              <label
                class="flex items-center gap-4 p-2 rounded-[72px] bg-[#f1f1f1] cursor-pointer hover:bg-[#e8e8e8] transition-colors focus-within:ring-2 focus-within:ring-ios-brand-primary/30"
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
                  [class.bg-[#272827]]="selectedReason() === option.id"
                  [class.border-2]="selectedReason() !== option.id"
                  [class.border-[#959695]]="selectedReason() !== option.id"
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

                <span class="font-medium text-[18px] text-[#272827] leading-[1.4]">
                  {{ option.label }}
                </span>
              </label>
            }
          </div>

          <!-- Submit button -->
          <div class="max-w-[732px]">
            <button
              type="button"
              class="w-[378px] flex items-center justify-center h-14 rounded-xl bg-[#8b0000] text-[#f1e6e8] text-[18px] font-semibold leading-[1.4] hover:bg-[#6f0000] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b0000]/50"
              (click)="onSubmit()"
            >
              Send, and Cancel subscription
            </button>
          </div>
        </div>
      </main>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>© {{ year }} Institute of Scrum. All rights reserved.</span>
        </div>
      </footer>
    </div>
  `,
})
export class CancelSubscriptionPage {
  private readonly router = inject(Router);

  protected readonly year = new Date().getFullYear().toString();

  protected readonly cancelReasons = [
    { id: 'once-a-week', label: 'Once a week sounds about right.' },
    {
      id: 'once-a-month',
      label: `Let's slow it down-only once a month, please.`,
    },
    { id: 'keep-coming', label: 'I take it back! Keep the inspiration coming.' },
    { id: 'unsubscribe', label: `It's just not working out. Unsubscribe me.` },
  ] as const;

  protected readonly selectedReason = signal<string>('once-a-week');

  protected onSubmit(): void {
    // TODO: dispatch cancellation action through a SettingsStore / API
    void this.router.navigate(['/dashboard/settings/subscription-cancelled']);
  }
}

export default CancelSubscriptionPage;
