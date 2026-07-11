import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { StudentAccessCodes } from '../components/student-access-codes';
import { StudentAttempts } from '../components/student-attempts';
import { AdminUsersApi } from '../data-access/users.api';
import { type StudentDetail } from '../data-access/users.model';

/**
 * Admin users — student detail (`GET /admin/users/:id`).
 *
 * Shows the safe profile projection + activity counts (purchases, attempts,
 * certificates earned), plus the student's attempt history and issued access
 * codes (with role-gated revoke) via the two child components. The `userId` is
 * read from the route snapshot (see the catalog-form note on why not a signal
 * input).
 */
@Component({
  selector: 'ios-admin-user-detail-page',
  imports: [RouterLink, DatePipe, StudentAttempts, StudentAccessCodes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-3xl">
      <a routerLink="/admin/users" class="text-sm text-ios-brand-primary underline">
        {{ lang.t('admin.userDetail.back') }}
      </a>

      @if (loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.userDetail.loading') }}
        </p>
      } @else if (error()) {
        <div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ error() }}</p>
        </div>
      } @else if (student(); as s) {
        <header class="mt-3 mb-6">
          <h1 class="text-2xl font-bold text-ios-brand-dark">{{ s.fullName }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ s.email }}</p>
        </header>

        <!-- Profile -->
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.emailVerified') }}
            </dt>
            <dd class="mt-1 text-base font-semibold">
              {{ s.emailVerified ? lang.t('admin.userDetail.yes') : lang.t('admin.userDetail.no') }}
            </dd>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.country') }}
            </dt>
            <dd class="mt-1 text-base font-semibold">{{ s.country ?? '—' }}</dd>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.locale') }}
            </dt>
            <dd class="mt-1 text-base font-semibold">{{ s.locale }}</dd>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.joined') }}
            </dt>
            <dd class="mt-1 text-base font-semibold">{{ s.createdAt | date: 'mediumDate' }}</dd>
          </div>
        </dl>

        <!-- Activity counts -->
        <h2 class="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {{ lang.t('admin.userDetail.activity') }}
        </h2>
        <dl class="grid grid-cols-3 gap-4">
          <div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.purchases') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">{{ s.counts.purchases }}</dd>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.attempts') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">{{ s.counts.attempts }}</dd>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <dt class="text-xs uppercase tracking-wide text-gray-500">
              {{ lang.t('admin.userDetail.certificates') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
              {{ s.counts.certificatesEarned }}
            </dd>
          </div>
        </dl>

        <!-- Attempt history -->
        <div class="mt-8">
          <ios-student-attempts [userId]="s.id" />
        </div>

        <!-- Access codes -->
        <div class="mt-8">
          <ios-student-access-codes [userId]="s.id" />
        </div>
      }
    </section>
  `,
})
export class AdminUserDetailPage implements OnInit {
  private readonly api = inject(AdminUsersApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly lang = inject(LanguageService);

  private readonly userId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly student = signal<StudentDetail | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.userId) {
      this.error.set(this.lang.t('admin.userDetail.error'));
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      this.student.set(await firstValueFrom(this.api.getDetail(this.userId)));
    } catch (err) {
      this.error.set(problemDetailMessage(err) ?? this.lang.t('admin.userDetail.error'));
    } finally {
      this.loading.set(false);
    }
  }
}

export default AdminUserDetailPage;
