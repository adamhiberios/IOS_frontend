import { ChangeDetectionStrategy, Component, computed, inject, type OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowDown, LucideArrowLeft, LucideFileText } from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';

import { DashboardNavbar } from '@layouts';
import { CertChapterNav } from '../components/cert-chapter-nav';
import type { SessionChapter } from '../data-access/certificates.model';
import { CertificatesStore } from '../data-access/certificates.store';

/**
 * `ios-cert-session-page` — Session material viewer page.
 *
 * ┌── Layout ─────────────────────────────────────────────────────────────────┐
 * │  DashboardNavbar                                                          │
 * │  [← Back] Dashboard / My certificates / ESM-P     [Start Final Test]     │
 * │  ─────────────────────────────────────────────────────────────────────    │
 * │  ┌─ Chapter nav (354px) ──┐  ┌─ Session header card (#e8edf0) ────────┐  │
 * │  │  What Is a Project?    │  │  [file icon]  Session 1   ████████     │  │
 * │  │  ● Introduction        │  └────────────────────────────────────────┘  │
 * │  │  Project Mgmt vs Ops   │                                               │
 * │  │  …                     │  ┌─ Content area ─────────────────────────┐  │
 * │  └────────────────────────┘  │  Introduction                          │  │
 * │                              │  [body paragraphs…]                    │  │
 * │                              └────────────────────────────────────────┘  │
 * │                                                    [Back]  [Next ↓]       │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Route params:
 *   · `:code`       — cert code, e.g. "ESM-P"
 *   · `:materialId` — learning material ID, e.g. "session-1-a"
 *
 * Chapter navigation is signal-driven (no URL change per chapter).
 *
 * Figma: node 13110-52150.
 */
@Component({
  selector: 'ios-cert-session-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardNavbar, CertChapterNav, RouterLink, IosIcon, CanadaFlag],
  providers: [provideIcons(LucideArrowLeft, LucideFileText, LucideArrowDown)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-6">
          <!-- ── Breadcrumb row ── -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <a
                [routerLink]="['/dashboard/certificates', certCode()]"
                class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
                [attr.aria-label]="lang.t('dashboard.certs.backToCertDetail')"
              >
                <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </a>
              <nav aria-label="Breadcrumb">
                <ol
                  class="flex items-center gap-3 text-[16px] font-medium leading-[1.4] text-ios-fg-8"
                  role="list"
                >
                  <li>
                    <span>{{ lang.t('dashboard.breadcrumb.dashboard') }}</span>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <a
                      routerLink="/dashboard/certificates"
                      class="hover:text-ios-fg-10 transition-colors"
                    >
                      {{ lang.t('dashboard.nav.myCertificates') }}
                    </a>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <span class="font-semibold text-ios-fg-13">{{ certCode() }}</span>
                  </li>
                </ol>
              </nav>
            </div>

            <!-- Start Final Test CTA -->
            <a
              routerLink="/assessments/verify"
              class="inline-flex items-center justify-center h-11 px-4 rounded-2xl text-[16px] font-semibold text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('dashboard.certs.startFinalTest') }}
            </a>
          </div>

          <!-- ── Session header card + chapter nav row ── -->
          <div class="flex gap-6 items-start">
            <!-- Left chapter nav -->
            @if (session()) {
              <ios-cert-chapter-nav
                [chapters]="session()!.chapters"
                [activeChapterId]="activeChapterId()"
                (chapterChange)="onChapterChange($event)"
              />
            }

            <!-- Right content column -->
            <div class="flex flex-col gap-6 flex-1 min-w-0">
              <!-- Session header card -->
              @if (session()) {
                <div
                  class="flex items-center justify-between bg-cer-blue-soft rounded-2xl ps-6 overflow-hidden"
                  aria-label="{{ session()!.sessionTitle }} header"
                >
                  <div class="flex items-center gap-3 py-8">
                    <ios-icon
                      name="file-text"
                      class="w-8 h-8 text-cer-blue-text shrink-0"
                      aria-hidden="true"
                    />
                    <h1
                      class="text-[28px] font-semibold leading-[1.2] text-cer-blue-text whitespace-nowrap"
                    >
                      {{ session()!.sessionTitle }}
                    </h1>
                  </div>
                  <!-- Yellow accent bar -->
                  <div
                    class="h-[8px] w-[145px] bg-ios-brand-gold shrink-0 self-end mb-0"
                    aria-hidden="true"
                  ></div>
                </div>
              }

              <!-- Chapter content -->
              @if (activeChapter()) {
                <article class="flex flex-col gap-3" aria-label="{{ activeChapter()!.title }}">
                  <h2 class="text-[20px] font-bold leading-[1.2] text-ios-fg-13">
                    {{ activeChapter()!.title }}
                  </h2>
                  <div
                    class="flex flex-col gap-0 text-[16px] font-medium leading-[1.4] text-ios-fg"
                  >
                    @for (para of activeChapter()!.paragraphs; track $index) {
                      <p class="mb-4 last:mb-0">{{ para }}</p>
                    }
                  </div>
                </article>
              }

              <!-- Back / Next navigation -->
              <div class="flex items-center justify-end gap-4 pt-4 pb-8">
                <button
                  type="button"
                  class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg-10 bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
                  [class.opacity-40]="isFirstChapter()"
                  [attr.aria-disabled]="isFirstChapter() ? 'true' : null"
                  (click)="onBack()"
                >
                  {{ lang.t('dashboard.examRunner.back') }}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-3 h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-white bg-ios-fg-13 hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg-13/50 min-w-[158px]"
                  (click)="onNext()"
                >
                  {{
                    isLastChapter()
                      ? lang.t('dashboard.examRunner.finish')
                      : lang.t('dashboard.examRunner.next')
                  }}
                  @if (!isLastChapter()) {
                    <ios-icon name="arrow-down" class="w-6 h-6 shrink-0" aria-hidden="true" />
                  }
                </button>
              </div>
            </div>
            <!-- end right content -->
          </div>
        </div>
      </main>

      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class CertSessionPage implements OnInit {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CertificatesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  /** Route `:code` param — e.g. "ESM-P". */
  protected readonly certCode = computed(() => this.route.snapshot.params['code'] as string);

  /** Route `:materialId` param — e.g. "session-1-a". */
  protected readonly materialId = computed(
    () => this.route.snapshot.params['materialId'] as string,
  );

  /** The full session data resolved from the materialId. */
  protected readonly session = computed(() => this.store.sessionByMaterialId(this.materialId()));

  /** The currently active chapter ID (falls back to first chapter). */
  protected readonly activeChapterId = computed(() => {
    const storedId = this.store.activeChapterId();
    const session = this.session();
    if (!session) return '';
    if (storedId && session.chapters.some((c) => c.id === storedId)) {
      return storedId;
    }
    return session.chapters[0]?.id ?? '';
  });

  /** The active chapter object derived from `activeChapterId`. */
  protected readonly activeChapter = computed((): SessionChapter | null => {
    const session = this.session();
    if (!session) return null;
    return session.chapters.find((c) => c.id === this.activeChapterId()) ?? null;
  });

  /** Index of the active chapter within the list. */
  private readonly activeChapterIndex = computed(() => {
    const session = this.session();
    if (!session) return 0;
    return session.chapters.findIndex((c) => c.id === this.activeChapterId());
  });

  protected readonly isFirstChapter = computed(() => this.activeChapterIndex() === 0);

  protected readonly isLastChapter = computed(() => {
    const session = this.session();
    if (!session) return true;
    return this.activeChapterIndex() === session.chapters.length - 1;
  });

  ngOnInit(): void {
    // Ensure the store knows which session is open and defaults to first chapter.
    this.store.openSession(this.materialId());
  }

  protected onChapterChange(chapterId: string): void {
    this.store.setActiveChapter(chapterId);
  }

  protected onBack(): void {
    const idx = this.activeChapterIndex();
    if (idx <= 0) return;
    const prevId = this.session()!.chapters[idx - 1].id;
    this.store.setActiveChapter(prevId);
  }

  protected onNext(): void {
    const session = this.session();
    if (!session) return;
    const idx = this.activeChapterIndex();
    if (idx >= session.chapters.length - 1) {
      // Last chapter — navigate back to learning materials list.
      void this.router.navigate(['/dashboard/certificates', this.certCode()]);
      return;
    }
    this.store.setActiveChapter(session.chapters[idx + 1].id);
  }
}

export default CertSessionPage;
