import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { Button } from '@ui';

import { AdminUsersApi } from '../data-access/users.api';
import { type StudentAttempt } from '../data-access/users.model';

const PAGE_LIMIT = 20;

/**
 * A student's exam-attempt history (`GET /admin/users/:id/attempts`), rendered
 * as a paginated table on the detail page. Self-contained: fetches on init from
 * the bound `userId`, with cursor "load more". Read-only (no answer snapshot is
 * returned by the backend).
 */
@Component({
  selector: 'ios-student-attempts',
  imports: [DatePipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
      {{ lang.t('admin.userDetail.attemptsTitle') }}
    </h2>

    @if (error() && items().length === 0) {
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
        <p class="text-sm text-red-700">{{ error() }}</p>
        <ios-button class="mt-2 inline-block" variant="secondary" (clicked)="load(false)">
          {{ lang.t('admin.userDetail.retry') }}
        </ios-button>
      </div>
    } @else if (loading() && items().length === 0) {
      <p class="text-sm text-gray-500 py-6 text-center" role="status" aria-live="polite">
        {{ lang.t('admin.userDetail.loadingAttempts') }}
      </p>
    } @else if (items().length === 0) {
      <div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p class="text-sm text-gray-500">{{ lang.t('admin.userDetail.noAttempts') }}</p>
      </div>
    } @else {
      <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th scope="col" class="text-start font-medium px-4 py-3">
                {{ lang.t('admin.userDetail.attExam') }}
              </th>
              <th scope="col" class="text-start font-medium px-4 py-3">
                {{ lang.t('admin.userDetail.attScore') }}
              </th>
              <th scope="col" class="text-start font-medium px-4 py-3">
                {{ lang.t('admin.userDetail.attResult') }}
              </th>
              <th scope="col" class="text-start font-medium px-4 py-3">
                {{ lang.t('admin.userDetail.attSubmitted') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (a of items(); track a.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ shortId(a.examId) }}</td>
                <td class="px-4 py-3 text-gray-700">{{ a.score }}%</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    [class.bg-green-50]="a.passed"
                    [class.text-green-700]="a.passed"
                    [class.bg-red-50]="!a.passed"
                    [class.text-red-700]="!a.passed"
                  >
                    {{
                      a.passed
                        ? lang.t('admin.userDetail.passed')
                        : lang.t('admin.userDetail.failed')
                    }}
                  </span>
                  @if (a.lateFlag) {
                    <span class="ms-1 text-xs text-amber-600">
                      {{ lang.t('admin.userDetail.late') }}
                    </span>
                  }
                </td>
                <td class="px-4 py-3 text-gray-500">{{ a.submittedAt | date: 'medium' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (error() && items().length > 0) {
        <p class="text-sm text-red-600 mt-2 text-center" role="alert">{{ error() }}</p>
      }

      @if (hasMore()) {
        <div class="mt-3 text-center">
          <ios-button variant="secondary" [loading]="loadingMore()" (clicked)="load(true)">
            {{ lang.t('admin.userDetail.loadMore') }}
          </ios-button>
        </div>
      }
    }
  `,
})
export class StudentAttempts implements OnInit {
  private readonly api = inject(AdminUsersApi);
  protected readonly lang = inject(LanguageService);

  readonly userId = input.required<string>();

  protected readonly items = signal<readonly StudentAttempt[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal('');
  private readonly nextCursor = signal<string | null>(null);
  protected readonly hasMore = signal(false);

  ngOnInit(): void {
    void this.load(false);
  }

  protected shortId(id: string): string {
    return id.slice(0, 8);
  }

  protected async load(append: boolean): Promise<void> {
    if (append) {
      if (this.loadingMore() || !this.hasMore() || this.nextCursor() === null) return;
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set('');
    try {
      const page = await firstValueFrom(
        this.api.getAttempts(this.userId(), {
          cursor: append ? (this.nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this.items.update((c) => (append ? [...c, ...page.items] : [...page.items]));
      this.nextCursor.set(page.nextCursor);
      this.hasMore.set(page.hasMore);
    } catch (err) {
      this.error.set(problemDetailMessage(err) ?? this.lang.t('admin.userDetail.attemptsError'));
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }
}
