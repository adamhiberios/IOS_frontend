import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { Button } from '@ui';

import { ExamAttemptsStore } from '../data-access/exam-attempts.store';
import { formatDuration, formatScore } from '../data-access/exam-attempts.model';

/**
 * `ios-exam-history` — the student's real-exam results list on the Dashboard
 * overview (BE-I-17 / A7). Self-contained: reads the root
 * {@link ExamAttemptsStore}, fetches the first page on init, and offers cursor
 * "load more". Read-only — the backend never returns the answer snapshot.
 *
 * States: loading skeleton · error (with retry) · empty · list. Styled with the
 * dashboard `ios-surface-muted` card language; pass/fail uses the same palette
 * badges as the rest of the dashboard.
 */
@Component({
  selector: 'ios-exam-history',
  imports: [DatePipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="exam-history-heading" class="flex flex-col gap-4">
      <h2 id="exam-history-heading" class="text-[18px] font-semibold leading-[1.3] text-ios-fg-13">
        {{ lang.t('studentInsights.examHistory.title') }}
      </h2>

      @if (store.loading() && store.attempts().length === 0) {
        <div class="flex items-center gap-3 py-6 text-ios-fg-8" role="status" aria-live="polite">
          <span
            class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ios-fg-8 border-t-transparent"
            aria-hidden="true"
          ></span>
          <span>{{ lang.t('studentInsights.examHistory.loading') }}</span>
        </div>
      } @else if (store.error() && store.attempts().length === 0) {
        <div
          class="flex flex-wrap items-center justify-between gap-3 bg-ios-surface-muted rounded-2xl px-6 py-4"
          role="alert"
        >
          <p class="text-sm font-medium text-ios-brand-primary">{{ store.error() }}</p>
          <button
            type="button"
            class="h-9 px-4 rounded-lg bg-ios-fg-13 text-white text-sm font-semibold hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            (click)="onRetry()"
          >
            {{ lang.t('studentInsights.examHistory.retry') }}
          </button>
        </div>
      } @else if (store.isEmpty()) {
        <div class="bg-ios-surface-muted rounded-2xl px-6 py-8 text-center">
          <p class="text-sm text-ios-fg-8">{{ lang.t('studentInsights.examHistory.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-2xl bg-ios-surface-muted">
          <table class="w-full text-sm">
            <thead class="text-ios-fg-8 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-6 py-3">
                  {{ lang.t('studentInsights.examHistory.exam') }}
                </th>
                <th scope="col" class="text-start font-medium px-6 py-3">
                  {{ lang.t('studentInsights.examHistory.score') }}
                </th>
                <th scope="col" class="text-start font-medium px-6 py-3">
                  {{ lang.t('studentInsights.examHistory.result') }}
                </th>
                <th scope="col" class="text-start font-medium px-6 py-3">
                  {{ lang.t('studentInsights.examHistory.duration') }}
                </th>
                <th scope="col" class="text-start font-medium px-6 py-3">
                  {{ lang.t('studentInsights.examHistory.submitted') }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (a of store.attempts(); track a.id) {
                <tr class="border-t border-ios-surface-soft">
                  <td class="px-6 py-3">
                    <span class="block font-medium text-ios-fg-13">{{ a.examTitle }}</span>
                    <span class="block text-xs text-ios-fg-8">{{ a.program }}</span>
                  </td>
                  <td class="px-6 py-3 tabular-nums font-semibold text-ios-fg-13">
                    {{ formatScore(a.score) }}%
                  </td>
                  <td class="px-6 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="a.passed"
                      [class.text-green-700]="a.passed"
                      [class.bg-red-50]="!a.passed"
                      [class.text-red-700]="!a.passed"
                    >
                      {{
                        a.passed
                          ? lang.t('studentInsights.examHistory.passed')
                          : lang.t('studentInsights.examHistory.failed')
                      }}
                    </span>
                    @if (a.lateFlag) {
                      <span class="ms-1 text-xs text-amber-600">
                        {{ lang.t('studentInsights.examHistory.late') }}
                      </span>
                    }
                  </td>
                  <td class="px-6 py-3 tabular-nums text-ios-fg-8">
                    {{ formatDuration(a.durationSeconds) ?? '—' }}
                  </td>
                  <td class="px-6 py-3 text-ios-fg-8">{{ a.submittedAt | date: 'medium' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.error() && store.attempts().length > 0) {
          <p class="text-sm text-ios-brand-primary text-center" role="alert">{{ store.error() }}</p>
        }

        @if (store.hasMore()) {
          <div class="text-center">
            <ios-button
              variant="secondary"
              [loading]="store.loadingMore()"
              (clicked)="onLoadMore()"
            >
              {{ lang.t('studentInsights.examHistory.loadMore') }}
            </ios-button>
          </div>
        }
      }
    </section>
  `,
})
export class ExamHistory implements OnInit {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(ExamAttemptsStore);

  /** Exposed to the template for score/duration formatting. */
  protected readonly formatScore = formatScore;
  protected readonly formatDuration = formatDuration;

  ngOnInit(): void {
    void this.store.load();
  }

  protected onRetry(): void {
    void this.store.reload();
  }

  protected onLoadMore(): void {
    void this.store.loadMore();
  }
}
