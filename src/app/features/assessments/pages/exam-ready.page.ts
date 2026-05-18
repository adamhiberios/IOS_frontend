import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { CertificatesBadge } from '@ui';

/**
 * Exam Ready page — "Hi Adam, Are you ready?"
 *
 * Reached after the learner clicks the exam link from their email. Shows:
 *   - The relevant certification badge and name.
 *   - Remaining time window to complete the exam (from backend in real flow).
 *   - A "Let's start" CTA that navigates to the exam runner.
 *
 * Design reference: Figma node 13271-14042 (Dashboard-New mock exam).
 *
 * Layout: left-aligned content block within a full-height page shell.
 * The certificate info card sits above the heading + CTA section.
 */
@Component({
  selector: 'ios-exam-ready-page',
  imports: [RouterLink, AuthHeader, AuthFooter, CertificatesBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <!-- Main — vertically centered, left-anchored content block -->
      <main
        class="flex-1 flex items-center pt-16 px-4 md:px-20 pb-10"
        aria-labelledby="exam-ready-heading"
      >
        <div class="w-full max-w-[606px] flex flex-col gap-14">
          <!-- ── Certification badge card ──────────────────────────────── -->
          <div
            class="flex items-center gap-4 rounded-2xl bg-[#eeefed] px-6 py-4"
            aria-label="Exam certification: EPO-P — Endorsed Product Owner Practitioner"
          >
            <div class="w-24 shrink-0">
              <ios-certificates-badge
                svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
                code="EPO-P"
                fullName="Endorsed Product Owner Practitioner"
              />
            </div>
            <div class="flex flex-col">
              <p class="font-bold text-[#272827] text-lg leading-tight" dir="auto">EPO-P</p>
              <p class="font-medium text-[#373837] text-base leading-relaxed">
                Endorsed Product Owner Practitioner
              </p>
            </div>
          </div>

          <!-- ── Heading + instructions + CTA ─────────────────────────── -->
          <div class="flex flex-col gap-[60px]">
            <!-- Heading + bullets -->
            <div class="flex flex-col gap-6">
              <h1
                id="exam-ready-heading"
                class="text-[40px] font-bold text-[#141514] leading-snug"
                dir="auto"
              >
                Hi Adam, Are you ready?
              </h1>

              <ul class="space-y-4 text-lg font-medium text-[#666766] list-disc ps-5">
                <li class="leading-relaxed">
                  You have
                  <strong class="font-bold text-[#a02e2e]">12 hours and 43 minutes</strong>
                  to pass the exam.
                </li>
                <li class="leading-relaxed">
                  After this period, you will need to
                  <strong class="font-bold text-[#a02e2e]">repurchase access</strong>
                  to get a new one.
                </li>
              </ul>
            </div>

            <!-- Let's start CTA -->
            <a
              routerLink="/assessments/run"
              class="flex h-14 w-full max-w-[444px] items-center justify-center rounded-xl
                     bg-ios-brand-primary text-[#f1e6e8] font-semibold text-lg
                     transition-colors hover:bg-ios-brand-primary-hover
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                     focus-visible:ring-ios-brand-primary/50"
            >
              Let's start
            </a>
          </div>
        </div>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class ExamReadyPage {}

export default ExamReadyPage;
