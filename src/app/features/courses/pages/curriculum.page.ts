import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCheck, LucideCirclePlay, LucideClock } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { CoursesStore } from '../data-access/courses.store';

/**
 * `ios-curriculum-page` — a certificate's module/lesson tree with per-lesson
 * completion. Backed by `GET /learning/certs/:certId/curriculum`.
 */
@Component({
  selector: 'ios-curriculum-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DashboardNavbar, CanadaFlag, IosIcon],
  providers: [provideIcons(LucideArrowLeft, LucideCheck, LucideCirclePlay, LucideClock)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 w-full px-4 md:px-20 py-8" id="main-content">
        <div class="max-w-[900px] mx-auto flex flex-col gap-8">
          <a
            routerLink="/courses"
            class="inline-flex items-center gap-2 text-[14px] font-medium text-ios-fg-8
                   hover:text-ios-fg-11 transition-colors w-fit"
          >
            <ios-icon name="arrow-left" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            {{ lang.t('courses.curriculum.back') }}
          </a>

          @if (store.curriculumLoading()) {
            <p class="text-ios-fg-8" aria-live="polite">{{ lang.t('courses.common.loading') }}</p>
          } @else if (store.curriculumError()) {
            <p
              class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
              role="alert"
            >
              {{ store.curriculumError() }}
            </p>
          } @else if (store.curriculum(); as cur) {
            <header class="flex flex-col gap-1">
              <span class="text-[13px] font-bold text-ios-brand-primary-mid">{{
                cur.certificate.programCode
              }}</span>
              <h1
                class="text-[28px] md:text-[32px] font-bold text-ios-fg-13 leading-tight"
                dir="auto"
              >
                {{ cur.certificate.title }}
              </h1>
            </header>

            <div class="flex flex-col gap-8">
              @for (module of cur.modules; track module.id) {
                <section class="flex flex-col gap-3">
                  <h2 class="text-[18px] font-semibold text-ios-fg-13" dir="auto">
                    {{ module.position }}. {{ module.title }}
                  </h2>
                  <ul class="flex flex-col gap-2" role="list">
                    @for (lesson of module.lessons; track lesson.id) {
                      <li>
                        <a
                          [routerLink]="['/courses', cur.certificate.id, 'lessons', lesson.id]"
                          class="group flex items-center gap-4 rounded-xl border border-ios-surface-hover
                                 bg-white px-4 py-3 transition-colors hover:border-ios-brand-primary/40
                                 hover:bg-[#fcfcfc] focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-offset-2 focus-visible:ring-ios-brand-primary/50"
                        >
                          <!-- Completion / play indicator -->
                          @if (lesson.completed) {
                            <span
                              class="inline-flex items-center justify-center size-8 rounded-full bg-ios-success-mid shrink-0"
                              [attr.aria-label]="lang.t('courses.curriculum.completed')"
                            >
                              <ios-icon name="check" class="size-4 text-white" aria-hidden="true" />
                            </span>
                          } @else {
                            <span
                              class="inline-flex items-center justify-center size-8 rounded-full bg-ios-surface-soft
                                     text-ios-fg-8 shrink-0"
                              aria-hidden="true"
                            >
                              <ios-icon name="circle-play" class="size-4" />
                            </span>
                          }

                          <span
                            class="flex-1 min-w-0 text-[15px] font-medium text-ios-fg-11"
                            dir="auto"
                            >{{ lesson.title }}</span
                          >

                          @if (mins(lesson.durationSeconds); as m) {
                            <span
                              class="inline-flex items-center gap-1.5 text-[13px] font-medium text-ios-fg-8 shrink-0"
                            >
                              <ios-icon name="clock" class="size-4" aria-hidden="true" />
                              {{ lang.t('courses.common.minutes', { minutes: m }) }}
                            </span>
                          }
                        </a>
                      </li>
                    }
                  </ul>
                </section>
              }
            </div>
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
export class CurriculumPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CoursesStore);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    const certId = this.route.snapshot.paramMap.get('certId');
    if (certId) void this.store.loadCurriculum(certId);
    else this.store.clear();
  }

  /** Whole minutes for a lesson duration, or null when unknown/zero. */
  protected mins(seconds: number | null): number | null {
    return seconds && seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : null;
  }
}

export default CurriculumPage;
