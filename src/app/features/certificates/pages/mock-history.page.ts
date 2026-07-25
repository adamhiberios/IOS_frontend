import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideChevronRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { MockStore } from '../data-access/mock.store';
import { type MockHistoryItem } from '../data-access/mock.model';

/**
 * `ios-mock-history-page` — the student's past practice-exam attempts
 * (`GET /mock/history` via `MockStore`, cursor-paginated). A submitted row links
 * to its review; an in-progress row resumes the attempt.
 */
@Component({
  selector: 'ios-mock-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DashboardNavbar, CanadaFlag, IosIcon],
  providers: [provideIcons(LucideArrowLeft, LucideChevronRight)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 w-full px-4 md:px-20 py-8" id="main-content">
        <div class="max-w-[900px] mx-auto flex flex-col gap-6">
          <a
            routerLink="/courses"
            class="inline-flex items-center gap-2 text-[14px] font-medium text-ios-fg-8 hover:text-ios-fg-11 transition-colors w-fit"
          >
            <ios-icon name="arrow-left" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            {{ lang.t('mock.goToCourses') }}
          </a>

          <h1 class="text-[26px] md:text-[30px] font-bold text-ios-fg-13 leading-tight">
            {{ lang.t('mock.history.title') }}
          </h1>

          @if (store.historyLoading()) {
            <p class="text-ios-fg-8" aria-live="polite">{{ lang.t('courses.common.loading') }}</p>
          } @else if (store.historyError()) {
            <p
              class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
              role="alert"
            >
              {{ store.historyError() }}
            </p>
          } @else if (store.historyEmpty()) {
            <p class="text-ios-fg-8 py-10 text-center">{{ lang.t('mock.history.empty') }}</p>
          } @else {
            <ul class="flex flex-col gap-3" role="list">
              @for (item of store.history(); track item.attemptId) {
                <li>
                  <a
                    [routerLink]="rowLink(item)"
                    [queryParams]="{ attemptId: item.attemptId }"
                    class="group flex items-center gap-4 rounded-xl border border-ios-surface-hover bg-white px-5 py-4
                           transition-colors hover:border-ios-brand-primary/40 hover:bg-[#fcfcfc]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-ios-brand-primary/50"
                  >
                    <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span class="text-[15px] font-semibold text-ios-fg-13">
                        {{ formatDate(item.submittedAt ?? item.startedAt) }}
                      </span>
                      <span class="text-[13px] font-medium text-ios-fg-8">
                        @if (item.status === 'submitted') {
                          {{
                            lang.t('mock.history.scoreLine', {
                              correct: item.correctCount ?? 0,
                              total: item.totalCount ?? 0,
                            })
                          }}
                        } @else {
                          {{ lang.t('mock.history.inProgress') }}
                        }
                      </span>
                    </div>

                    @if (item.status === 'submitted' && item.score !== null) {
                      <span
                        class="inline-flex items-center rounded-lg px-3 py-1 text-[14px] font-bold tabular-nums shrink-0"
                        [class.bg-ios-success-soft]="item.readyForFinal === true"
                        [class.text-ios-success-strong]="item.readyForFinal === true"
                        [class.bg-ios-surface-soft]="item.readyForFinal !== true"
                        [class.text-ios-fg-11]="item.readyForFinal !== true"
                      >
                        {{ scorePercent(item) }}%
                      </span>
                    } @else {
                      <span
                        class="inline-flex items-center rounded-lg bg-ios-brand-yellow-bright/20 px-3 py-1 text-[13px] font-semibold text-ios-fg-11 shrink-0"
                      >
                        {{ lang.t('mock.history.resume') }}
                      </span>
                    }

                    <ios-icon
                      name="chevron-right"
                      class="w-5 h-5 text-ios-fg-8 shrink-0 rtl:rotate-180 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              }
            </ul>

            @if (store.historyHasMore()) {
              <button
                type="button"
                [disabled]="store.historyLoadingMore()"
                (click)="onLoadMore()"
                class="mx-auto inline-flex h-11 items-center justify-center rounded-xl bg-ios-surface-soft px-6
                       font-semibold text-ios-fg-11 transition-colors hover:bg-ios-surface-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-brand-primary/40 disabled:opacity-50 disabled:pointer-events-none"
              >
                {{
                  store.historyLoadingMore()
                    ? lang.t('courses.common.loading')
                    : lang.t('mock.history.loadMore')
                }}
              </button>
            }
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
export class MockHistoryPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(MockStore);

  constructor() {
    void this.store.loadHistory();
  }

  /** Submitted attempts open their review; in-progress attempts resume. */
  protected rowLink(item: MockHistoryItem): string {
    return item.status === 'submitted'
      ? '/dashboard/certificates/mock-test/result'
      : '/dashboard/certificates/mock-test';
  }

  protected scorePercent(item: MockHistoryItem): number {
    return Math.round(item.score ?? 0);
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  protected onLoadMore(): void {
    void this.store.loadMoreHistory();
  }
}

export default MockHistoryPage;
