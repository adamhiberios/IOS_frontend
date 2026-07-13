import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideAward,
  LucideDownload,
  LucideQrCode,
  LucideRotateCw,
  LucideShieldCheck,
} from '@lucide/angular';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import { CredentialsStore } from '../data-access/credentials.store';

/**
 * `ios-credentials-page` — the student's earned certificates (BE-I-16 / A3).
 *
 * Lists every credential from `GET /me/certificates` with its program, issue
 * date, and status, plus per-row links to the downloadable PDF (`certificateUrl`),
 * the QR image (`qrUrl`), and the public verification page (`verifyUrl`). Each
 * action is shown only when its URL is present (a row without a public `certId`
 * has no verifiable artefacts). This is distinct from the mock "My Certificates"
 * learning hub at `/dashboard/certificates`.
 *
 * States: loading spinner · error + retry · empty · list.
 */
@Component({
  selector: 'ios-credentials-page',
  imports: [DashboardNavbar, RouterLink, DatePipe, IosIcon, CanadaFlag],
  providers: [
    provideIcons(
      LucideArrowLeft,
      LucideAward,
      LucideDownload,
      LucideQrCode,
      LucideRotateCw,
      LucideShieldCheck,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb bar ─────────────────────────────────────────────── -->
      <div class="w-full bg-white border-b border-ios-surface-soft">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 h-[70px] flex items-center">
          <div class="flex items-center gap-4">
            <a
              routerLink="/dashboard"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [attr.aria-label]="lang.t('credentials.backToDashboard')"
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
                    class="font-medium text-ios-fg-8 hover:text-ios-fg-13 transition-colors"
                    >{{ lang.t('credentials.breadcrumb.dashboard') }}</a
                  >
                </li>
                <li class="font-medium text-ios-fg-8" aria-hidden="true">/</li>
                <li>
                  <span class="font-semibold text-ios-fg-13" aria-current="page">{{
                    lang.t('credentials.title')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
          <header class="flex flex-col gap-1">
            <h1 class="text-[24px] font-bold leading-[1.3] text-ios-fg-13">
              {{ lang.t('credentials.title') }}
            </h1>
            <p class="text-base text-ios-fg-8">{{ lang.t('credentials.subtitle') }}</p>
          </header>

          <!-- Loading -->
          @if (store.loading() && !store.loaded()) {
            <div class="flex items-center justify-center gap-3 py-16 text-ios-fg-8" role="status">
              <span
                class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-ios-fg-8 border-t-transparent"
                aria-hidden="true"
              ></span>
              <span>{{ lang.t('credentials.loading') }}</span>
            </div>
          } @else if (store.error(); as err) {
            <!-- Error + retry -->
            <div class="flex flex-col items-center gap-4 py-16 text-center" role="alert">
              <p class="text-base font-medium text-ios-brand-primary">{{ err }}</p>
              <button
                type="button"
                class="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-ios-fg-13 text-white text-base font-semibold hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                (click)="onRetry()"
              >
                <ios-icon name="rotate-cw" class="w-5 h-5" aria-hidden="true" />
                {{ lang.t('credentials.retry') }}
              </button>
            </div>
          } @else if (store.isEmpty()) {
            <!-- Empty -->
            <div class="flex flex-col items-center gap-3 py-16 text-center">
              <div
                class="flex items-center justify-center w-16 h-16 rounded-full bg-ios-surface-soft text-ios-fg-8"
                aria-hidden="true"
              >
                <ios-icon name="award" class="w-8 h-8" />
              </div>
              <h2 class="text-lg font-semibold text-ios-fg-13">
                {{ lang.t('credentials.empty.title') }}
              </h2>
              <p class="max-w-md text-base text-ios-fg-8">{{ lang.t('credentials.empty.body') }}</p>
            </div>
          } @else {
            <!-- List -->
            <ul class="flex flex-col gap-4" role="list">
              @for (cert of store.items(); track cert.program + cert.issuedAt) {
                <li
                  class="flex flex-col md:flex-row md:items-center gap-4 bg-ios-surface-mid rounded-2xl p-4 md:p-6"
                  [class.opacity-70]="cert.status === 'revoked'"
                >
                  <!-- Badge icon -->
                  <div
                    class="flex items-center justify-center w-14 h-14 rounded-xl bg-white text-ios-brand-primary shrink-0"
                    aria-hidden="true"
                  >
                    <ios-icon name="award" class="w-7 h-7" />
                  </div>

                  <!-- Program + meta -->
                  <div class="flex-1 flex flex-col gap-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-lg font-semibold text-ios-fg-13">{{ cert.program }}</h3>
                      <span
                        class="text-xs font-semibold px-2 py-0.5 rounded-full bg-ios-surface-soft text-ios-fg-8"
                        >{{ cert.programCode }}</span
                      >
                      @if (cert.status === 'revoked') {
                        <span
                          class="text-xs font-semibold px-2 py-0.5 rounded-full bg-ios-brand-primary-soft text-ios-brand-primary"
                          >{{ lang.t('credentials.status.revoked') }}</span
                        >
                      } @else {
                        <span
                          class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"
                          >{{ lang.t('credentials.status.valid') }}</span
                        >
                      }
                    </div>
                    <p class="text-sm text-ios-fg-8">
                      {{ lang.t('credentials.issuedLabel') }}:
                      {{ cert.issuedAt | date: 'mediumDate' }}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    @if (cert.certificateUrl; as url) {
                      <a
                        [href]="url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ios-fg-13 text-white text-sm font-semibold hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                        [attr.aria-label]="
                          lang.t('credentials.actions.downloadAria', { program: cert.program })
                        "
                      >
                        <ios-icon name="download" class="w-4 h-4" aria-hidden="true" />
                        {{ lang.t('credentials.actions.download') }}
                      </a>
                    }
                    @if (cert.qrUrl; as url) {
                      <a
                        [href]="url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ios-surface-soft text-ios-fg-13 text-sm font-semibold hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                        [attr.aria-label]="
                          lang.t('credentials.actions.qrAria', { program: cert.program })
                        "
                      >
                        <ios-icon name="qr-code" class="w-4 h-4" aria-hidden="true" />
                        {{ lang.t('credentials.actions.qr') }}
                      </a>
                    }
                    @if (cert.verifyUrl; as url) {
                      <a
                        [href]="url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ios-surface-soft text-ios-fg-13 text-sm font-semibold hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                        [attr.aria-label]="
                          lang.t('credentials.actions.verifyAria', { program: cert.program })
                        "
                      >
                        <ios-icon name="shield-check" class="w-4 h-4" aria-hidden="true" />
                        {{ lang.t('credentials.actions.verify') }}
                      </a>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </main>

      <!-- ── Footer ────────────────────────────────────────────────────── -->
      <footer class="bg-ios-fg w-full py-4 shrink-0">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-sm"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: year.toString() }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class CredentialsPage implements OnInit {
  protected readonly store = inject(CredentialsStore);
  protected readonly lang = inject(LanguageService);
  protected readonly year = new Date().getFullYear();

  ngOnInit(): void {
    void this.store.load();
  }

  protected onRetry(): void {
    void this.store.reload();
  }
}

export default CredentialsPage;
