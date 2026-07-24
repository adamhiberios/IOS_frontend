import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideBookOpen } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { CoursesStore } from '../data-access/courses.store';

/**
 * `ios-courses-index-page` — the learner's enrolled certificates with progress.
 * Backed by `GET /learning/progress` via `CoursesStore`.
 */
@Component({
  selector: 'ios-courses-index-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DashboardNavbar, CanadaFlag, IosIcon],
  providers: [provideIcons(LucideArrowRight, LucideBookOpen)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 w-full px-4 md:px-20 py-10" id="main-content">
        <div class="max-w-[1100px] mx-auto flex flex-col gap-8">
          <header class="flex flex-col gap-2">
            <h1 class="text-[28px] md:text-[32px] font-bold text-ios-fg-13 leading-tight">
              {{ lang.t('courses.index.title') }}
            </h1>
            <p class="text-[15px] font-medium text-ios-fg-8">
              {{ lang.t('courses.index.subtitle') }}
            </p>
          </header>

          @if (store.progressLoading()) {
            <p class="text-ios-fg-8" aria-live="polite">{{ lang.t('courses.common.loading') }}</p>
          } @else if (store.progressError()) {
            <p
              class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
              role="alert"
            >
              {{ store.progressError() }}
            </p>
          } @else if (store.progressEmpty()) {
            <div class="flex flex-col items-center gap-4 py-16 text-center">
              <ios-icon name="book-open" class="w-12 h-12 text-ios-fg-7" aria-hidden="true" />
              <p class="text-lg font-medium text-ios-fg-10">
                {{ lang.t('courses.index.emptyTitle') }}
              </p>
              <a
                routerLink="/certifications"
                class="inline-flex h-12 items-center justify-center rounded-xl bg-ios-brand-primary
                       px-6 font-semibold text-ios-brand-primary-soft transition-colors
                       hover:bg-ios-brand-primary-hover focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ios-brand-primary/50"
                >{{ lang.t('courses.index.browse') }}</a
              >
            </div>
          } @else {
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-5" role="list">
              @for (course of store.progress(); track course.certId) {
                <li>
                  <a
                    [routerLink]="['/courses', course.certId]"
                    class="group flex flex-col gap-4 rounded-2xl border border-ios-surface-hover bg-white p-6
                           transition-colors hover:border-ios-brand-primary/40 hover:bg-[#fcfcfc]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-ios-brand-primary/50"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex flex-col gap-1 min-w-0">
                        <span class="text-[13px] font-bold text-ios-brand-primary-mid">{{
                          course.programCode
                        }}</span>
                        <span
                          class="text-[17px] font-semibold text-ios-fg-13 leading-snug"
                          dir="auto"
                          >{{ course.title }}</span
                        >
                      </div>
                      <ios-icon
                        name="arrow-right"
                        class="w-5 h-5 text-ios-fg-8 shrink-0 rtl:rotate-180 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>

                    <div class="flex flex-col gap-2">
                      <div
                        class="flex items-center justify-between text-[13px] font-medium text-ios-fg-8"
                      >
                        <span>
                          {{
                            lang.t('courses.index.lessonsDone', {
                              done: course.completedLessons,
                              total: course.totalLessons,
                            })
                          }}
                        </span>
                        <span class="tabular-nums">{{ course.percentComplete }}%</span>
                      </div>
                      <div
                        class="h-2 rounded-full bg-ios-surface-soft overflow-hidden"
                        role="progressbar"
                        [attr.aria-valuenow]="course.percentComplete"
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div
                          class="h-full rounded-full bg-ios-brand-primary transition-all duration-300"
                          [style.width.%]="course.percentComplete"
                        ></div>
                      </div>
                    </div>
                  </a>
                </li>
              }
            </ul>
          }
        </div>
      </main>

      <footer class="bg-ios-fg w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: '2026' }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class CoursesIndexPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CoursesStore);

  constructor() {
    void this.store.loadProgress();
  }
}

export default CoursesIndexPage;
