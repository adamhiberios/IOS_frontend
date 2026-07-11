import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '@core/auth';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { Button } from '@ui';

import { AdminUsersApi } from '../data-access/users.api';
import { type AccessCode } from '../data-access/users.model';

const PAGE_LIMIT = 20;

/**
 * A student's issued exam access codes (`GET /admin/users/:id/access-codes`),
 * with a role-gated Revoke action (`POST …/revoke`, learning_admin only) behind
 * a confirm dialog. Self-contained: fetches on init from the bound `userId`.
 * Only UNUSED codes can be revoked (backend 409s on used ones), so Revoke is
 * shown only for non-used statuses.
 */
@Component({
  selector: 'ios-student-access-codes',
  imports: [DatePipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
      {{ lang.t('admin.userDetail.codesTitle') }}
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
        {{ lang.t('admin.userDetail.loadingCodes') }}
      </p>
    } @else if (items().length === 0) {
      <div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p class="text-sm text-gray-500">{{ lang.t('admin.userDetail.noCodes') }}</p>
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
                {{ lang.t('admin.userDetail.codeStatus') }}
              </th>
              <th scope="col" class="text-start font-medium px-4 py-3">
                {{ lang.t('admin.userDetail.codeExpires') }}
              </th>
              @if (canRevoke()) {
                <th scope="col" class="text-end font-medium px-4 py-3">
                  {{ lang.t('admin.userDetail.actions') }}
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (c of items(); track c.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ shortId(c.examId) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    [class.bg-green-50]="c.status === 'active'"
                    [class.text-green-700]="c.status === 'active'"
                    [class.bg-gray-100]="c.status === 'used'"
                    [class.text-gray-500]="c.status === 'used'"
                    [class.bg-amber-50]="c.status === 'expired'"
                    [class.text-amber-700]="c.status === 'expired'"
                  >
                    {{ lang.t('admin.userDetail.codeStatus_' + c.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ c.expiresAt | date: 'medium' }}</td>
                @if (canRevoke()) {
                  <td class="px-4 py-3 text-end">
                    @if (c.status !== 'used') {
                      <button
                        type="button"
                        (click)="askRevoke(c)"
                        class="text-sm text-red-600 hover:text-red-700"
                      >
                        {{ lang.t('admin.userDetail.revoke') }}
                      </button>
                    }
                  </td>
                }
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

    <!-- Revoke confirmation -->
    @if (pendingRevoke(); as pending) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-title"
      >
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 id="revoke-title" class="text-lg font-semibold text-ios-brand-dark">
            {{ lang.t('admin.userDetail.revokeTitle') }}
          </h2>
          <p class="mt-2 text-sm text-gray-600">{{ lang.t('admin.userDetail.revokeBody') }}</p>

          @if (revokeError()) {
            <p class="mt-3 text-sm text-red-600" role="alert">{{ revokeError() }}</p>
          }

          <div class="mt-5 flex justify-end gap-3">
            <button
              type="button"
              (click)="cancelRevoke()"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {{ lang.t('admin.userDetail.cancel') }}
            </button>
            <ios-button
              variant="danger"
              [loading]="revokingId() === pending.id"
              (clicked)="confirmRevoke()"
            >
              {{ lang.t('admin.userDetail.revoke') }}
            </ios-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StudentAccessCodes implements OnInit {
  private readonly api = inject(AdminUsersApi);
  private readonly auth = inject(AuthStore);
  protected readonly lang = inject(LanguageService);

  readonly userId = input.required<string>();

  /** Revoke is learning_admin-only on the backend (super_admin bypass). */
  protected readonly canRevoke = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly items = signal<readonly AccessCode[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal('');
  private readonly nextCursor = signal<string | null>(null);
  protected readonly hasMore = signal(false);

  protected readonly pendingRevoke = signal<AccessCode | null>(null);
  protected readonly revokingId = signal<string | null>(null);
  protected readonly revokeError = signal('');

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
        this.api.getAccessCodes(this.userId(), {
          cursor: append ? (this.nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this.items.update((c) => (append ? [...c, ...page.items] : [...page.items]));
      this.nextCursor.set(page.nextCursor);
      this.hasMore.set(page.hasMore);
    } catch (err) {
      this.error.set(problemDetailMessage(err) ?? this.lang.t('admin.userDetail.codesError'));
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  protected askRevoke(code: AccessCode): void {
    this.revokeError.set('');
    this.pendingRevoke.set(code);
  }

  protected cancelRevoke(): void {
    this.revokeError.set('');
    this.pendingRevoke.set(null);
  }

  protected async confirmRevoke(): Promise<void> {
    const pending = this.pendingRevoke();
    if (!pending || this.revokingId() !== null) return;
    this.revokingId.set(pending.id);
    this.revokeError.set('');
    try {
      await firstValueFrom(this.api.revokeAccessCode(this.userId(), pending.id));
      this.pendingRevoke.set(null);
      await this.load(false);
    } catch (err) {
      this.revokeError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.userDetail.revokeError'),
      );
    } finally {
      this.revokingId.set(null);
    }
  }
}
