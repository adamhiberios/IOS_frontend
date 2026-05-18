import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars } from '@ui';

import { LanguageService } from '@core/i18n';

import { ConfirmExamDialog } from '../components/confirm-exam-dialog';
import { ExamSentDialog } from '../components/exam-sent-dialog';

/**
 * Exam Verify page — "Verify to go through exam".
 *
 * Flow:
 *   1. Learner lands here after purchasing an exam access.
 *   2. Reads the instructions (link active 24 h, repurchase if lost).
 *   3. Clicks "Continue" → `ConfirmExamDialog` opens.
 *   4. Confirms → backend sends the exam link email → `ExamSentDialog` opens.
 *   5. Learner opens their email and accesses the exam runner directly.
 *
 * Design reference:
 *   - Figma node 13271-13551 (Start exam page)
 *   - Figma node 13269-13490 (Confirm Start exam dialog)
 *   - Figma node 13461-40691 (Link sent success dialog)
 *
 * Layout conventions (CLAUDE.md §3, §5):
 *   - `ios-auth-header` (absolute) + `ios-auth-footer` wrap the shell.
 *   - `ios-accent-bars` provides the yellow flanking bars matching the
 *     register-page visual language.
 *   - All state is held in signals; no `.subscribe()` in this component.
 */
@Component({
  selector: 'ios-exam-verify-page',
  imports: [RouterLink, AuthHeader, AuthFooter, AccentBars, ConfirmExamDialog, ExamSentDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <!-- ── Page body — sits below the absolute header ─────────────── -->
      <div class="flex flex-col flex-1 pt-16">
        <!-- Breadcrumb nav -->
        <nav
          class="w-full border-b border-ios-surface-soft bg-white flex items-center
                 px-4 md:px-20 h-[70px]"
          [attr.aria-label]="lang.t('assessments.verify.pageNavAriaLabel')"
        >
          <div class="flex items-center gap-4">
            <!-- Back button -->
            <a
              routerLink="/dashboard"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                     bg-ios-surface-soft text-ios-fg-13 transition-colors
hover:bg-ios-surface-hover
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                     focus-visible:ring-ios-brand-primary/50"
              [attr.aria-label]="lang.t('assessments.verify.backAriaLabel')"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5" />
                <path d="M12 5l-7 7 7 7" />
              </svg>
            </a>

            <span class="font-semibold text-ios-fg-13 text-base leading-tight" dir="auto">
              {{ lang.t('assessments.verify.title') }}
            </span>
          </div>
        </nav>

        <!-- Main content -->
        <main class="relative flex-1 flex flex-col items-center px-4 py-12">
          <!-- Yellow accent bars — flanking the emergency icon vertically -->
          <ios-accent-bars top="7rem" start="27.5%" end="27.5%" />

          <!-- Emergency icon circle -->
          <div
            class="relative z-10 mb-8 flex h-28 w-28 items-center justify-center
                   rounded-full bg-ios-surface-soft"
            aria-hidden="true"
          >
            <svg
              width="62"
              height="62"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <!-- Base stand -->
              <rect x="14" y="53" width="52" height="16" rx="4" fill="#B0BEC5" />
              <!-- Siren dome -->
              <path
                d="M40 14C27.9 14 18 23.9 18 36v17h44V36C62 23.9 52.1 14 40 14z"
                fill="#C62828"
              />
              <!-- Inner glow -->
              <ellipse cx="40" cy="34" rx="11" ry="11" fill="#E53935" opacity="0.8" />
              <ellipse cx="40" cy="34" rx="5" ry="5" fill="#FFCDD2" opacity="0.75" />
              <!-- Light rays -->
              <line
                x1="40"
                y1="4"
                x2="40"
                y2="12"
                stroke="#EF5350"
                stroke-width="3"
                stroke-linecap="round"
              />
              <line
                x1="21"
                y1="10"
                x2="25"
                y2="17"
                stroke="#EF5350"
                stroke-width="3"
                stroke-linecap="round"
              />
              <line
                x1="59"
                y1="10"
                x2="55"
                y2="17"
                stroke="#EF5350"
                stroke-width="3"
                stroke-linecap="round"
              />
              <line
                x1="10"
                y1="30"
                x2="17"
                y2="32"
                stroke="#EF5350"
                stroke-width="3"
                stroke-linecap="round"
              />
              <line
                x1="70"
                y1="30"
                x2="63"
                y2="32"
                stroke="#EF5350"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
          </div>

          <!-- Content block (centered, 606 px wide in design) -->
          <div class="relative z-10 w-full max-w-[606px]">
            <!-- Email notice -->
            <p class="text-lg font-medium text-ios-fg-8 leading-relaxed mb-6">
              {{
                lang.t('assessments.verify.emailNotice', { email: 'ad*********am&#64;gmail.com' })
              }}
            </p>

            <!-- Instruction bullets -->
            <ul class="space-y-4 text-lg font-medium text-ios-fg-8 list-disc ps-5 mb-10">
              <li class="leading-relaxed">
                The system send a secure, personalized
                <strong class="font-bold text-ios-brand-primary-mid">link</strong>
                to you registered
                <strong class="font-bold text-ios-fg-10">email address</strong>.
              </li>
              <li class="leading-relaxed">
                If you
                <strong class="font-bold text-ios-brand-primary-mid">loses or misses</strong>
                the code, they will be ! required to
                <strong class="font-bold text-ios-fg-10">repurchase</strong>
                access to obtain a new one.
              </li>
              <li class="leading-relaxed">
                The link is only active for
                <strong class="font-bold text-ios-brand-primary-mid">24 hours</strong>
                to pass the test.
              </li>
            </ul>

            <!-- Action buttons -->
            <div class="flex flex-col gap-6">
              <button
                type="button"
                (click)="showConfirm.set(true)"
                class="flex h-14 w-full items-center justify-center rounded-xl
                       bg-ios-brand-primary text-ios-brand-primary-soft font-semibold text-lg
                       transition-colors hover:bg-ios-brand-primary-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('assessments.verify.continue') }}
              </button>

              <button
                type="button"
                class="flex h-14 w-full items-center justify-center rounded-xl
                       bg-ios-surface-soft text-ios-fg font-semibold text-lg
                       transition-colors hover:bg-ios-surface-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-[#d0d0d0]"
              >
                {{ lang.t('assessments.verify.resendLink') }}
              </button>
            </div>
          </div>
        </main>

        <ios-auth-footer />
      </div>

      <!-- ── Modals (portal-like, overlaid via position: fixed) ───────── -->
      @if (showConfirm()) {
        <ios-confirm-exam-dialog (confirmed)="onLinkSent()" (cancelled)="showConfirm.set(false)" />
      }

      @if (showSuccess()) {
        <ios-exam-sent-dialog (dismissed)="showSuccess.set(false)" />
      }
    </div>
  `,
})
export class ExamVerifyPage {
  protected readonly lang = inject(LanguageService);

  /** Controls visibility of the "Are you sure?" confirmation dialog. */
  protected readonly showConfirm = signal(false);

  /** Controls visibility of the "Link sent successfully" success dialog. */
  protected readonly showSuccess = signal(false);

  /** Called when the user confirms sending the link. */
  protected onLinkSent(): void {
    this.showConfirm.set(false);
    this.showSuccess.set(true);
  }
}

export default ExamVerifyPage;
