import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight } from '@lucide/angular';

import { CanadaFlag, Checkbox, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import { AuthStore } from '@core/auth';

import { DeleteAccountDialog } from '../components/delete-account-dialog';

/**
 * `ios-settings-page` — Student dashboard Settings tab.
 *
 * Figma: node 13172-57302 (Dashborad-Certifications / Settings tab).
 *
 * Checkboxes use `<ios-checkbox>` + `FormControl`, matching the register page style:
 *  · 20×20px box, `rounded-[2px]`, white bg
 *  · border-ios-brand-dark when checked, border-gray-300 when unchecked
 *  · Lucide `check` glyph inset at 12.5% when checked
 *
 * Layout:
 *   ┌─ dashboard navbar (Settings tab active) ─────────────────────────┐
 *   ├─ breadcrumb (Dashboard / Settings) ────────────────────────────── ┤
 *   │  Notification Preferences  [card with 5 ios-checkboxes]          │
 *   │  Newsletter                [card: checkbox + email + link]        │
 *   │  Account Preferences       [Delete account pill]                  │
 *   ├─ footer ─────────────────────────────────────────────────────────┤
 *   └────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DashboardNavbar,
    RouterLink,
    IosIcon,
    CanadaFlag,
    Checkbox,
    ReactiveFormsModule,
    DeleteAccountDialog,
  ],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-[#f1f1f1]">
        <div class="max-w-[1400px] mx-auto px-8 h-[70px] flex items-center">
          <div class="flex items-center gap-4">
            <a
              routerLink="/dashboard"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f1f1f1] text-[#272827] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/30"
              aria-label="Back to Dashboard"
            >
              <ios-icon name="arrow-left" class="w-5 h-5" aria-hidden="true" />
            </a>
            <nav aria-label="Breadcrumb">
              <ol
                class="flex items-center gap-3 text-base leading-[1.4] whitespace-nowrap"
                role="list"
              >
                <li>
                  <a
                    routerLink="/dashboard"
                    class="font-medium text-[#666766] hover:text-[#141514] transition-colors"
                  >
                    Dashboard
                  </a>
                </li>
                <li class="font-medium text-[#666766]" aria-hidden="true">/</li>
                <li>
                  <span class="font-semibold text-[#141514]" aria-current="page">Settings</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-8 flex flex-col gap-6">
          <!-- ── Notification Preferences ───────────────────────────────── -->
          <section aria-labelledby="notif-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="notif-heading"
                class="text-[18px] font-semibold leading-[1.4] text-[#141514] w-[228px] shrink-0"
              >
                Notification Preferences
              </h2>

              <div class="flex-1 bg-[#f6f6f6] rounded-2xl p-6 flex flex-col gap-8">
                <ios-checkbox id="notif-all" [formControl]="notifAllCtrl">
                  Get notification for all updates
                </ios-checkbox>

                <ios-checkbox id="notif-insights" [formControl]="notifInsightsCtrl">
                  Get notification for new Insights / blog publications
                </ios-checkbox>

                <ios-checkbox id="notif-recommended" [formControl]="notifRecommendedCtrl">
                  Recommended courses
                </ios-checkbox>

                <ios-checkbox id="notif-completion" [formControl]="notifCompletionCtrl">
                  Course completion notification
                </ios-checkbox>

                <ios-checkbox id="notif-material" [formControl]="notifMaterialCtrl">
                  New learning material added
                </ios-checkbox>
              </div>
            </div>
          </section>

          <!-- ── Newsletter ──────────────────────────────────────────────── -->
          <section aria-labelledby="newsletter-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="newsletter-heading"
                class="text-[18px] font-semibold leading-[1.4] text-[#141514] w-[228px] shrink-0"
              >
                Newsletter
              </h2>

              <div class="flex-1 bg-[#f6f6f6] rounded-2xl p-6 flex flex-col gap-4">
                <!-- Newsletter subscription checkbox -->
                <ios-checkbox id="newsletter-check" [formControl]="newsletterEnabledCtrl">
                  Newsletter subscription notification
                </ios-checkbox>

                <!-- Email + Enabled badge row -->
                <div class="flex flex-col gap-4">
                  <div class="flex items-stretch">
                    <!-- Email display field -->
                    <div
                      class="flex-1 bg-[#f6f6f6] border border-[#c4c5c4] border-e-0 rounded-s-lg px-4 py-4 flex items-center"
                    >
                      <span class="font-bold text-[16px] text-[#373837] leading-[1.3] truncate">
                        {{ newsletterEmail() }}
                      </span>
                    </div>

                    <!-- Enabled badge -->
                    <div
                      class="flex items-center gap-3 bg-[#f1f1f1] px-6 py-4 rounded-e-xl shrink-0"
                      aria-label="Subscription status: Enabled"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="w-5 h-5 text-[#272827] shrink-0"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span class="font-semibold text-[16px] text-[#272827] whitespace-nowrap">
                        Enabled
                      </span>
                    </div>
                  </div>

                  <!-- Cancel subscription link -->
                  <a
                    routerLink="/dashboard/settings/cancel-subscription"
                    class="font-semibold text-[16px] text-[#c33811] leading-[1.4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c33811]/40 rounded-sm w-fit"
                  >
                    Cancel subscription
                  </a>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Account Preferences ─────────────────────────────────────── -->
          <section aria-labelledby="account-heading">
            <div class="flex gap-6 items-start">
              <h2
                id="account-heading"
                class="text-[18px] font-semibold leading-[1.4] text-[#141514] w-[228px] shrink-0"
              >
                Account Preferences
              </h2>

              <!-- Delete account pill -->
              <button
                type="button"
                class="flex items-center gap-4 bg-[#fbece7] ps-8 pe-6 py-4 rounded-2xl hover:bg-[#f8ddd5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c33811]/40"
                (click)="showDeleteDialog.set(true)"
              >
                <span
                  class="font-semibold text-[16px] text-[#c33811] leading-[1.4] whitespace-nowrap"
                >
                  Delete account
                </span>
                <ios-icon name="arrow-right" class="w-6 h-6 text-[#c33811]" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </main>

      <!-- ── Footer ────────────────────────────────────────────────────────── -->
      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>© {{ year }} Institute of Scrum. All rights reserved.</span>
        </div>
      </footer>
    </div>

    <!-- ── Delete account dialog ─────────────────────────────────────────── -->
    @if (showDeleteDialog()) {
      <ios-delete-account-dialog
        (cancelled)="showDeleteDialog.set(false)"
        (confirmed)="onDeleteConfirmed()"
      />
    }
  `,
})
export class SettingsPage {
  private readonly auth = inject(AuthStore);

  protected readonly year = new Date().getFullYear().toString();

  /** Controls visibility of the delete-account confirmation dialog. */
  protected readonly showDeleteDialog = signal(false);

  // ── Notification preference controls (matches register page FormControl pattern) ──
  protected readonly notifAllCtrl = new FormControl(true);
  protected readonly notifInsightsCtrl = new FormControl(true);
  protected readonly notifRecommendedCtrl = new FormControl(true);
  protected readonly notifCompletionCtrl = new FormControl(true);
  protected readonly notifMaterialCtrl = new FormControl(true);

  // ── Newsletter ──
  protected readonly newsletterEnabledCtrl = new FormControl(true);
  /** Email address — would come from a SettingsStore in production. */
  protected readonly newsletterEmail = signal('adam.ama.@gml.co');

  protected onDeleteConfirmed(): void {
    this.showDeleteDialog.set(false);
    // TODO: dispatch delete-account action through a SettingsStore
    void this.auth.logout({ reason: 'user-initiated' });
  }
}

export default SettingsPage;
