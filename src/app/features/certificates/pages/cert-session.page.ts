import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowDown, LucideArrowLeft, LucideFileText } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { SanitizedHtml } from '@shared';
import { IosIcon, provideIcons, PageFooter } from '@ui';
import { DashboardNavbar } from '@layouts';

import { CoursesStore } from '@features/courses/data-access/courses.store';
import { CertChapterNav, type CertNavItem } from '../components/cert-chapter-nav';
import { FinalExamCta } from '../components/final-exam-cta';

/**
 * `ios-cert-session-page` — the lesson viewer.
 *
 * Route: `/dashboard/certificates/:code/session/:lessonId`
 *   · `:code`     — program code, e.g. `ESM` (display + breadcrumb only)
 *   · `:lessonId` — the lesson **UUID**
 *
 * ## Rewired to the real backend (was hardcoded `ESM_P_*` fixtures)
 * Content comes from `GET /learning/lessons/:id` via {@link CoursesStore}; the
 * sidebar and Back/Next come from `GET /learning/certs/:certId/curriculum`.
 *
 * **Two deliberate departures from the fixture design**, both because the
 * backend has no source for what the fixtures invented:
 *
 * 1. **The sidebar lists sibling lessons, not chapters.** A lesson is one
 *    `contentHtml` blob — there is no chapter structure to navigate. Lessons
 *    within the module are the real equivalent, and Back/Next now move between
 *    them (previously they moved between chapters and "Finish" bounced to the
 *    detail page).
 * 2. **Navigating changes the URL.** Chapter switching was signal-only; a lesson
 *    is addressable, so each is its own route — which is what makes
 *    `/session/:lessonId` linkable at all.
 *
 * `contentHtml` is rendered through Angular's sanitizer via `[iosSanitizedHtml]`
 * (which also lazy-loads its images) and styled by the global `.ios-lesson-prose`
 * block in `styles.css` — shared with the admin Word-import preview.
 * **Never** `bypassSecurityTrust*` here — it is author-supplied HTML.
 */
@Component({
  selector: 'ios-cert-session-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DashboardNavbar,
    CertChapterNav,
    FinalExamCta,
    RouterLink,
    IosIcon,
    SanitizedHtml,
    PageFooter,
  ],
  providers: [provideIcons(LucideArrowLeft, LucideFileText, LucideArrowDown)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
          <!-- ── Breadcrumb row ── -->
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div class="flex items-center gap-3 min-w-0">
              <a
                [routerLink]="['/dashboard/certificates', certCode()]"
                class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
                [attr.aria-label]="lang.t('dashboard.certs.backToCertDetail')"
              >
                <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </a>
              <nav aria-label="Breadcrumb">
                <ol
                  class="flex flex-wrap items-center gap-x-1.5 gap-y-1 md:gap-3 text-[14px] md:text-[16px] font-medium leading-[1.4] text-ios-fg-8 [&>li]:whitespace-nowrap"
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

            <div class="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                class="inline-flex items-center justify-center h-11 px-4 rounded-2xl text-[16px] font-semibold text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-60 disabled:pointer-events-none"
                [iosFinalExamCta]="store.curriculum()?.certificate?.id"
                #cta="iosFinalExamCta"
              >
                {{
                  cta.requesting()
                    ? lang.t('dashboard.certs.sendingExamCode')
                    : lang.t('dashboard.certs.startFinalExam')
                }}
              </button>
              @if (cta.error(); as message) {
                <p class="max-w-sm text-end text-sm font-medium text-ios-danger-mid" role="alert">
                  {{ message }}
                </p>
              }
            </div>
          </div>

          @if (store.lessonError(); as message) {
            <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center" role="alert">
              <p class="text-[15px] font-medium text-ios-fg-13">{{ message }}</p>
              <a
                [routerLink]="['/dashboard/certificates', certCode()]"
                class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ios-fg-13 px-5 font-semibold text-white hover:bg-ios-fg transition-colors"
              >
                {{ lang.t('dashboard.certs.backToCertDetail') }}
              </a>
            </div>
          } @else if (store.lessonLoading() && !store.lesson()) {
            <p class="py-16 text-center text-ios-fg-8" role="status" aria-live="polite">
              {{ lang.t('dashboard.certs.lessonLoading') }}
            </p>
          } @else if (store.lesson(); as lesson) {
            <div class="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-start">
              <!-- Sibling lessons in this module -->
              @if (siblingLessons().length > 0) {
                <ios-cert-chapter-nav
                  [chapters]="siblingLessons()"
                  [activeChapterId]="lessonId()"
                  (chapterChange)="onLessonChange($event)"
                />
              }

              <div class="flex flex-col gap-6 flex-1 min-w-0">
                <!-- Lesson header card -->
                <div
                  class="flex items-center justify-between bg-cer-blue-soft rounded-2xl ps-4 md:ps-6 overflow-hidden"
                >
                  <div class="flex items-center gap-3 py-6 md:py-8 min-w-0">
                    <ios-icon
                      name="file-text"
                      class="w-8 h-8 text-cer-blue-text shrink-0"
                      aria-hidden="true"
                    />
                    <h1
                      class="text-[22px] md:text-[28px] font-semibold leading-[1.2] text-cer-blue-text min-w-0"
                      dir="auto"
                    >
                      {{ lesson.title }}
                    </h1>
                  </div>
                  <div
                    class="h-[8px] w-16 md:w-[145px] bg-ios-brand-gold shrink-0 self-end mb-0"
                    aria-hidden="true"
                  ></div>
                </div>

                <!-- Video, when the lesson has one (short-lived signed URL) -->
                @if (lesson.videoUrl; as videoUrl) {
                  <video
                    [src]="videoUrl"
                    controls
                    class="w-full rounded-2xl bg-black"
                    [attr.aria-label]="lesson.title"
                  ></video>
                }

                <!-- Lesson body — sanitised by Angular, never bypassed -->
                @if (lesson.contentHtml; as html) {
                  <article
                    class="ios-lesson-prose flex flex-col gap-3 min-w-0 overflow-x-auto text-[16px] font-medium leading-[1.4] text-ios-fg"
                    dir="auto"
                    [iosSanitizedHtml]="html"
                  ></article>
                } @else {
                  <p class="text-[15px] text-ios-fg-8">
                    {{ lang.t('dashboard.certs.lessonNoContent') }}
                  </p>
                }

                <!-- Back / Next across lessons, + mark complete -->
                <div class="flex flex-wrap items-center justify-end gap-3 md:gap-4 pt-4 pb-8">
                  @if (!lesson.completed) {
                    <button
                      type="button"
                      class="basis-full sm:basis-auto inline-flex items-center justify-center h-12 md:h-14 px-6 rounded-xl text-[16px] md:text-[18px] font-semibold text-ios-fg-10 bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
                      (click)="onMarkComplete()"
                    >
                      {{ lang.t('dashboard.certs.markComplete') }}
                    </button>
                  } @else {
                    <span
                      class="basis-full sm:basis-auto text-end text-[15px] font-semibold text-green-700"
                    >
                      {{ lang.t('dashboard.certs.completed') }}
                    </span>
                  }

                  <button
                    type="button"
                    class="flex-1 sm:flex-none inline-flex items-center justify-center h-12 md:h-14 px-6 rounded-xl text-[16px] md:text-[18px] font-semibold text-ios-fg-10 bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
                    [class.opacity-40]="isFirstLesson()"
                    [attr.aria-disabled]="isFirstLesson() ? 'true' : null"
                    (click)="onBack()"
                  >
                    {{ lang.t('dashboard.examRunner.back') }}
                  </button>
                  <button
                    type="button"
                    class="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 h-12 md:h-14 px-6 rounded-xl text-[16px] md:text-[18px] font-semibold text-white bg-ios-fg-13 hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg-13/50 sm:min-w-[158px]"
                    (click)="onNext()"
                  >
                    {{
                      isLastLesson()
                        ? lang.t('dashboard.examRunner.finish')
                        : lang.t('dashboard.examRunner.next')
                    }}
                    @if (!isLastLesson()) {
                      <ios-icon name="arrow-down" class="w-6 h-6 shrink-0" aria-hidden="true" />
                    }
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </main>

      <ios-page-footer />
    </div>
  `,
})
export class CertSessionPage implements OnInit {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CoursesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Program code — display only; the lesson is addressed by its own UUID. */
  protected readonly certCode = signal(this.route.snapshot.params['code'] as string);
  protected readonly lessonId = signal(this.route.snapshot.params['lessonId'] as string);

  /**
   * The other lessons in this lesson's module, in order. Derived from the
   * curriculum rather than fetched separately — the detail page has usually
   * already loaded it, and `loadCurriculum` is a no-op refresh when it hasn't.
   */
  protected readonly siblingLessons = computed<readonly CertNavItem[]>(() => {
    const lesson = this.store.lesson();
    const curriculum = this.store.curriculum();
    if (!lesson || !curriculum) return [];
    const module = curriculum.modules.find((m) => m.id === lesson.moduleId);
    return (module?.lessons ?? []).map((l) => ({ id: l.id, title: l.title }));
  });

  private readonly activeIndex = computed(() =>
    this.siblingLessons().findIndex((l) => l.id === this.lessonId()),
  );

  protected readonly isFirstLesson = computed(() => this.activeIndex() <= 0);

  protected readonly isLastLesson = computed(() => {
    const list = this.siblingLessons();
    return list.length === 0 || this.activeIndex() === list.length - 1;
  });

  ngOnInit(): void {
    void this.store.loadLesson(this.lessonId());
  }

  /** Sibling navigation is a real route change — each lesson is addressable. */
  protected onLessonChange(lessonId: string): void {
    if (lessonId === this.lessonId()) return;
    void this.router
      .navigate(['/dashboard/certificates', this.certCode(), 'session', lessonId])
      .then(() => {
        this.lessonId.set(lessonId);
        void this.store.loadLesson(lessonId);
      });
  }

  protected onBack(): void {
    const idx = this.activeIndex();
    if (idx <= 0) return;
    this.onLessonChange(this.siblingLessons()[idx - 1].id);
  }

  /** "Next" walks the module; on the last lesson it returns to the detail page. */
  protected onNext(): void {
    const list = this.siblingLessons();
    const idx = this.activeIndex();
    if (idx < 0 || idx >= list.length - 1) {
      void this.router.navigate(['/dashboard/certificates', this.certCode()]);
      return;
    }
    this.onLessonChange(list[idx + 1].id);
  }

  protected onMarkComplete(): void {
    void this.store.markComplete(this.lessonId());
  }
}

export default CertSessionPage;
