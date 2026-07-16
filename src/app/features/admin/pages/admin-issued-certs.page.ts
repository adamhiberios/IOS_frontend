import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Select, type SelectOption } from '@ui';

import { type IssuedCertificate } from '../data-access/issued-certs.model';
import { AdminIssuedCertsStore } from '../data-access/issued-certs.store';
import { type StudentListItem } from '../data-access/users.model';

/**
 * Admin certificate revocation (`/admin/issued-certs`, BE-I-15 / B2).
 *
 * Lists issued certificates (cursor-paginated, newest-first) with the internal
 * id needed to revoke. Filters via pickers (a certificate select + a student
 * search-and-pick) rather than raw UUIDs. Revoke is idempotent server-side and
 * gated to super_admin / learning_admin (the backend still enforces); a confirm
 * dialog guards the action.
 */
@Component({
  selector: 'ios-admin-issued-certs-page',
  imports: [ReactiveFormsModule, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">
          {{ lang.t('admin.issuedCerts.title') }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.issuedCerts.subtitle') }}</p>
      </header>

      <!-- Filters -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <!-- Certificate select -->
        <ios-select
          id="filter-cert"
          [label]="lang.t('admin.issuedCerts.filterCert')"
          [options]="certOptions()"
          [placeholder]="
            store.certsLoading()
              ? lang.t('admin.issuedCerts.certsLoading')
              : lang.t('admin.issuedCerts.allCerts')
          "
          [control]="certControl"
          (selected)="onCertChange($event)"
        />

        <!-- Student search-and-pick -->
        <div>
          <p
            id="student-filter-label"
            class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
          >
            {{ lang.t('admin.issuedCerts.filterStudent') }}
          </p>
          @if (store.selectedStudent(); as s) {
            <div
              class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 h-12"
            >
              <span class="text-sm text-ios-brand-dark truncate">
                {{ s.fullName }} <span class="text-gray-400">· {{ s.email }}</span>
              </span>
              <button
                type="button"
                (click)="clearStudent()"
                class="text-sm text-gray-500 hover:text-gray-800 shrink-0"
              >
                {{ lang.t('admin.issuedCerts.clearStudent') }}
              </button>
            </div>
          } @else {
            <form [formGroup]="studentForm" (ngSubmit)="searchStudents()" class="flex gap-2">
              <input
                id="filter-student-search"
                type="text"
                formControlName="search"
                [placeholder]="lang.t('admin.issuedCerts.studentSearchPlaceholder')"
                aria-labelledby="student-filter-label"
                class="flex-1 h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
              />
              <ios-button type="submit" variant="secondary" [loading]="store.studentsLoading()">
                {{ lang.t('admin.issuedCerts.search') }}
              </ios-button>
            </form>

            @if (store.studentsError()) {
              <p class="mt-2 text-xs text-red-600" role="alert">{{ store.studentsError() }}</p>
            } @else if (store.students().length > 0) {
              <ul class="mt-2 rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                @for (s of store.students(); track s.id) {
                  <li>
                    <button
                      type="button"
                      (click)="pickStudent(s)"
                      class="w-full text-start px-3 py-2 hover:bg-gray-50"
                    >
                      <span class="text-sm text-ios-brand-dark">{{ s.fullName }}</span>
                      <span class="block text-xs text-gray-400">{{ s.email }}</span>
                    </button>
                  </li>
                }
              </ul>
            } @else if (store.noStudentResults()) {
              <p class="mt-2 text-xs text-gray-500">{{ lang.t('admin.issuedCerts.noStudents') }}</p>
            }
          }
        </div>
      </div>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.issuedCerts.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.issuedCerts.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.issuedCerts.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.issuedCerts.colStudent') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.issuedCerts.colProgram') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.issuedCerts.colSerial') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.issuedCerts.colIssued') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.issuedCerts.colStatus') }}
                </th>
                @if (canRevoke()) {
                  <th scope="col" class="text-end font-medium px-4 py-3">
                    {{ lang.t('admin.issuedCerts.colActions') }}
                  </th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (c of store.items(); track c.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-ios-brand-dark">{{ c.studentName }}</td>
                  <td class="px-4 py-3 text-gray-600">
                    {{ c.program }}
                    <span class="text-xs text-gray-400 ms-1">{{ c.programCode }}</span>
                  </td>
                  <td class="px-4 py-3 text-gray-500 font-mono text-xs">
                    {{ c.certId ?? lang.t('admin.issuedCerts.noSerial') }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ c.issuedAt }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="c.status === 'valid'"
                      [class.text-green-700]="c.status === 'valid'"
                      [class.bg-red-50]="c.status === 'revoked'"
                      [class.text-red-700]="c.status === 'revoked'"
                    >
                      {{ statusLabel(c.status) }}
                    </span>
                  </td>
                  @if (canRevoke()) {
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end">
                        @if (c.status === 'valid') {
                          <button
                            type="button"
                            [disabled]="store.revokePendingId() === c.id"
                            (click)="askRevoke(c)"
                            class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {{ lang.t('admin.issuedCerts.revoke') }}
                          </button>
                        } @else {
                          <span class="text-xs text-gray-400">
                            {{ lang.t('admin.issuedCerts.revoked') }}
                          </span>
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.revokeError() && !pendingRevoke()) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">
            {{ store.revokeError() }}
          </p>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.issuedCerts.loadMore') }}
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
              {{ lang.t('admin.issuedCerts.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.issuedCerts.confirmBody') }}
            </p>
            <p class="mt-2 text-sm">
              <span class="font-medium text-ios-brand-dark">{{ pending.studentName }}</span>
              <span class="text-gray-500"> — {{ pending.program }}</span>
              @if (pending.certId) {
                <span class="block font-mono text-xs text-gray-400 mt-1">{{ pending.certId }}</span>
              }
            </p>
            @if (store.revokeError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.revokeError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelRevoke()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.issuedCerts.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.revokePendingId() === pending.id"
                (clicked)="confirmRevoke()"
              >
                {{ lang.t('admin.issuedCerts.revoke') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminIssuedCertsPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminIssuedCertsStore);
  protected readonly lang = inject(LanguageService);

  /** Revoke gate — backend restricts to super_admin / learning_admin. */
  protected readonly canRevoke = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly pendingRevoke = signal<IssuedCertificate | null>(null);

  protected readonly certControl = this.fb.control('');
  protected readonly studentForm = this.fb.group({ search: this.fb.control('') });

  /** Catalog options prefixed with an explicit "All certificates" reset row. */
  protected readonly certOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.issuedCerts.allCerts') },
    ...this.store.certs().map((c) => ({ value: c.id, label: c.label })),
  ]);

  ngOnInit(): void {
    void this.store.load();
    void this.store.loadCerts();
  }

  protected onCertChange(certId: string): void {
    void this.store.selectCert(certId || null);
  }

  protected searchStudents(): void {
    void this.store.searchStudents(this.studentForm.controls.search.value);
  }

  protected pickStudent(student: StudentListItem): void {
    this.studentForm.reset({ search: '' });
    void this.store.selectStudent(student);
  }

  protected clearStudent(): void {
    this.studentForm.reset({ search: '' });
    void this.store.clearStudent();
  }

  protected retry(): void {
    void this.store.reload();
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  protected statusLabel(status: string): string {
    return status === 'revoked'
      ? this.lang.t('admin.issuedCerts.revoked')
      : this.lang.t('admin.issuedCerts.valid');
  }

  protected askRevoke(cert: IssuedCertificate): void {
    this.store.clearRevokeError();
    this.pendingRevoke.set(cert);
  }

  protected cancelRevoke(): void {
    this.store.clearRevokeError();
    this.pendingRevoke.set(null);
  }

  protected async confirmRevoke(): Promise<void> {
    const pending = this.pendingRevoke();
    if (!pending) return;
    const ok = await this.store.revoke(pending.id);
    if (ok) this.pendingRevoke.set(null);
  }
}

export default AdminIssuedCertsPage;
