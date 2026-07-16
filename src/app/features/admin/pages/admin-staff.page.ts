import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';

import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import {
  ASSIGNABLE_STAFF_ROLES,
  type CreateStaffPayload,
  STAFF_LOCALES,
  STAFF_PASSWORD_MIN,
  STAFF_ROLES,
  type StaffMember,
  type StaffRole,
  type UpdateStaffPayload,
  isEditableStaff,
  isStaffRole,
} from '../data-access/staff.model';
import { AdminStaffStore } from '../data-access/staff.store';

/** `Validators.required` / `Validators.email` wrapped as calls (unbound-method rule). */
const required: ValidatorFn = (control) => Validators.required(control);
const emailValidator: ValidatorFn = (control) => Validators.email(control);

/**
 * Admin staff management (`/admin/staff`, BE-I-03 / B3) — **super_admin only**.
 *
 * List / search staff, create accounts, edit (name / role / locale), and
 * deactivate / reactivate. `super_admin` accounts are protected: they can't be
 * created, assigned, edited, or deactivated (the backend 400s/403s), so those
 * roles/actions are hidden. All server state + actions live in
 * {@link AdminStaffStore}.
 */
@Component({
  selector: 'ios-admin-staff-page',
  imports: [ReactiveFormsModule, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">{{ lang.t('admin.staff.title') }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.staff.subtitle') }}</p>
        </div>
        <ios-button variant="primary" (clicked)="openCreate()">
          {{ lang.t('admin.staff.new') }}
        </ios-button>
      </header>

      <!-- Filters -->
      <form
        [formGroup]="filterForm"
        (ngSubmit)="applyFilters()"
        class="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
      >
        <ios-input
          id="staff-search"
          [label]="lang.t('admin.staff.searchLabel')"
          type="text"
          [control]="filterForm.controls.search"
          [placeholder]="lang.t('admin.staff.searchPlaceholder')"
        />
        <ios-select
          id="staff-role-filter"
          [label]="lang.t('admin.staff.roleFilter')"
          [options]="roleFilterOptions()"
          [control]="filterForm.controls.role"
          (selected)="applyFilters()"
        />
        <ios-select
          id="staff-active-filter"
          [label]="lang.t('admin.staff.activeFilter')"
          [options]="activeFilterOptions()"
          [control]="filterForm.controls.active"
          (selected)="applyFilters()"
        />
        <ios-button type="submit" variant="secondary" [fullWidth]="true">
          {{ lang.t('admin.staff.apply') }}
        </ios-button>
      </form>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.staff.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.staff.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.staff.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.staff.colName') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.staff.colEmail') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.staff.colRole') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.staff.colLocale') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.staff.colStatus') }}
                </th>
                <th scope="col" class="text-end font-medium px-4 py-3">
                  {{ lang.t('admin.staff.colActions') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (m of store.items(); track m.id) {
                <tr class="hover:bg-gray-50" [class.opacity-60]="!m.active">
                  <td class="px-4 py-3 font-medium text-ios-brand-dark">
                    {{ m.firstName }} {{ m.lastName }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ m.email }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ roleLabel(m.role) }}</td>
                  <td class="px-4 py-3 text-gray-500 uppercase">{{ m.locale }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="m.active"
                      [class.text-green-700]="m.active"
                      [class.bg-gray-100]="!m.active"
                      [class.text-gray-500]="!m.active"
                    >
                      {{ m.active ? lang.t('admin.staff.active') : lang.t('admin.staff.inactive') }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-3">
                      @if (editable(m)) {
                        <button
                          type="button"
                          (click)="openEdit(m)"
                          class="text-sm text-ios-brand-primary underline"
                        >
                          {{ lang.t('admin.staff.edit') }}
                        </button>
                        @if (m.active) {
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() === m.id"
                            (click)="askDeactivate(m)"
                            class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {{ lang.t('admin.staff.deactivate') }}
                          </button>
                        } @else {
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() === m.id"
                            (click)="reactivate(m)"
                            class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                          >
                            {{ lang.t('admin.staff.reactivate') }}
                          </button>
                        }
                      } @else {
                        <span class="text-xs text-gray-400">{{
                          lang.t('admin.staff.protected')
                        }}</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.actionError() && !dialogOpen() && !pendingDeactivate()) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">
            {{ store.actionError() }}
          </p>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.staff.loadMore') }}
            </ios-button>
          </div>
        }
      }

      <!-- Create / edit dialog -->
      @if (dialogOpen()) {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-dialog-title"
        >
          <div class="min-h-full flex items-center justify-center p-4">
            <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <h2 id="staff-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
                {{
                  editingId() ? lang.t('admin.staff.editTitle') : lang.t('admin.staff.createTitle')
                }}
              </h2>

              <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (!editingId()) {
                  <ios-input
                    id="staff-email"
                    [label]="lang.t('admin.staff.emailLabel')"
                    type="email"
                    [control]="form.controls.email"
                    [placeholder]="lang.t('admin.staff.emailPlaceholder')"
                  />
                  <ios-input
                    id="staff-password"
                    [label]="lang.t('admin.staff.passwordLabel')"
                    type="password"
                    [control]="form.controls.password"
                    [placeholder]="lang.t('admin.staff.passwordPlaceholder')"
                  />
                  <p class="text-xs text-gray-500 -mt-2">
                    {{ lang.t('admin.staff.passwordHint', { min: passwordMin }) }}
                  </p>
                }

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ios-input
                    id="staff-first"
                    [label]="lang.t('admin.staff.firstNameLabel')"
                    type="text"
                    [control]="form.controls.firstName"
                  />
                  <ios-input
                    id="staff-last"
                    [label]="lang.t('admin.staff.lastNameLabel')"
                    type="text"
                    [control]="form.controls.lastName"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ios-select
                    id="staff-role"
                    [label]="lang.t('admin.staff.roleLabel')"
                    [options]="roleOptions()"
                    [control]="form.controls.role"
                  />
                  <ios-select
                    id="staff-locale"
                    [label]="lang.t('admin.staff.localeLabel')"
                    [options]="localeOptions()"
                    [control]="form.controls.locale"
                  />
                </div>

                @if (formError()) {
                  <p class="text-xs text-ios-brand-primary" role="alert">{{ formError() }}</p>
                }
                @if (store.actionError()) {
                  <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
                }

                <div class="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    (click)="closeDialog()"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {{ lang.t('admin.staff.cancel') }}
                  </button>
                  <ios-button
                    type="submit"
                    variant="primary"
                    [loading]="store.actionPendingId() === (editingId() ?? 'new')"
                  >
                    {{ lang.t('admin.staff.save') }}
                  </ios-button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Deactivate confirmation -->
      @if (pendingDeactivate(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-deactivate-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="staff-deactivate-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.staff.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.staff.confirmBody') }}
              <span class="font-medium text-ios-brand-dark">
                {{ pending.firstName }} {{ pending.lastName }}
              </span>
            </p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDeactivate()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.staff.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDeactivate()"
              >
                {{ lang.t('admin.staff.deactivate') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminStaffPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly store = inject(AdminStaffStore);
  protected readonly lang = inject(LanguageService);
  protected readonly passwordMin = STAFF_PASSWORD_MIN;

  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly pendingDeactivate = signal<StaffMember | null>(null);

  protected readonly filterForm = this.fb.group({
    search: this.fb.control(''),
    role: this.fb.control(''),
    active: this.fb.control(''),
  });

  protected readonly form = this.fb.group({
    email: this.fb.control(''),
    password: this.fb.control(''),
    firstName: this.fb.control('', { validators: [required, Validators.maxLength(100)] }),
    lastName: this.fb.control('', { validators: [required, Validators.maxLength(100)] }),
    role: this.fb.control<StaffRole>('learning_admin', { validators: [required] }),
    locale: this.fb.control('en', { validators: [required] }),
  });

  protected readonly roleOptions = computed<SelectOption[]>(() =>
    ASSIGNABLE_STAFF_ROLES.map((r) => ({ value: r, label: this.roleLabel(r) })),
  );
  protected readonly localeOptions = computed<SelectOption[]>(() =>
    STAFF_LOCALES.map((l) => ({ value: l, label: l.toUpperCase() })),
  );
  protected readonly roleFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.staff.allRoles') },
    ...STAFF_ROLES.map((r) => ({ value: r, label: this.roleLabel(r) })),
  ]);
  protected readonly activeFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.staff.allStatuses') },
    { value: 'true', label: this.lang.t('admin.staff.active') },
    { value: 'false', label: this.lang.t('admin.staff.inactive') },
  ]);

  ngOnInit(): void {
    void this.store.load();
  }

  protected editable(member: StaffMember): boolean {
    return isEditableStaff(member);
  }

  protected roleLabel(role: string): string {
    return this.lang.t(`admin.staff.roleNames.${role}`);
  }

  protected applyFilters(): void {
    const raw = this.filterForm.getRawValue();
    void this.store.setFilters({
      search: raw.search,
      role: isStaffRole(raw.role) ? raw.role : undefined,
      active: raw.active === 'true' ? true : raw.active === 'false' ? false : undefined,
    });
  }

  protected retry(): void {
    void this.store.load(true);
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  // ── Create / edit dialog ─────────────────────────────────────────────────

  protected openCreate(): void {
    this.store.clearActionError();
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'learning_admin',
      locale: 'en',
    });
    this.form.controls.email.setValidators([required, emailValidator]);
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.setValidators([required, Validators.minLength(STAFF_PASSWORD_MIN)]);
    this.form.controls.password.updateValueAndValidity();
    this.dialogOpen.set(true);
  }

  protected openEdit(member: StaffMember): void {
    this.store.clearActionError();
    this.editingId.set(member.id);
    this.formError.set(null);
    // Email / password aren't editable — drop their validators so they don't block.
    this.form.controls.email.clearValidators();
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.form.reset({
      email: '',
      password: '',
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      locale: member.locale,
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.store.clearActionError();
    this.dialogOpen.set(false);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.formError.set(null);
    if (this.form.invalid) {
      this.formError.set(this.lang.t('admin.staff.formError'));
      return;
    }
    const raw = this.form.getRawValue();
    const id = this.editingId();
    let ok: boolean;
    if (id) {
      const payload: UpdateStaffPayload = {
        firstName: raw.firstName,
        lastName: raw.lastName,
        role: raw.role,
        locale: raw.locale,
      };
      ok = await this.store.update(id, payload);
    } else {
      const payload: CreateStaffPayload = {
        email: raw.email,
        password: raw.password,
        firstName: raw.firstName,
        lastName: raw.lastName,
        role: raw.role,
        locale: raw.locale,
      };
      ok = await this.store.create(payload);
    }
    if (ok) this.dialogOpen.set(false);
  }

  // ── Deactivate / reactivate ──────────────────────────────────────────────

  protected askDeactivate(member: StaffMember): void {
    this.store.clearActionError();
    this.pendingDeactivate.set(member);
  }

  protected cancelDeactivate(): void {
    this.store.clearActionError();
    this.pendingDeactivate.set(null);
  }

  protected async confirmDeactivate(): Promise<void> {
    const pending = this.pendingDeactivate();
    if (!pending) return;
    const ok = await this.store.deactivate(pending.id);
    if (ok) this.pendingDeactivate.set(null);
  }

  protected reactivate(member: StaffMember): void {
    void this.store.reactivate(member.id);
  }
}

export default AdminStaffPage;
