import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import {
  type CreatePromoPayload,
  DISCOUNT_TYPES,
  type DiscountType,
  PROMO_PERCENT_MAX,
  PROMO_PERCENT_MIN,
  type PromoCode,
  type UpdatePromoPayload,
  isExpired,
} from '../data-access/promo.model';
import { AdminPromoStore } from '../data-access/promo.store';

/** `Validators.required` wrapped as a call (unbound-method rule). */
const required: ValidatorFn = (control) => Validators.required(control);

/**
 * Admin promo-code management (`/admin/promo-codes`, BE-I-05 / B4).
 *
 * List / filter promo codes and (for super_admin / finance_admin) create, edit,
 * retire, and reactivate them. support_admin gets read-only access (the backend
 * enforces the split). All server state + actions live in {@link AdminPromoStore}.
 */
@Component({
  selector: 'ios-admin-promo-codes-page',
  imports: [ReactiveFormsModule, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">{{ lang.t('admin.promo.title') }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.promo.subtitle') }}</p>
        </div>
        @if (canManage()) {
          <ios-button variant="primary" (clicked)="openCreate()">
            {{ lang.t('admin.promo.new') }}
          </ios-button>
        }
      </header>

      <!-- Filters -->
      <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ios-select
          id="promo-active-filter"
          [label]="lang.t('admin.promo.filterActive')"
          [options]="activeFilterOptions()"
          [control]="activeControl"
          (selected)="applyFilters()"
        />
        <ios-select
          id="promo-expired-filter"
          [label]="lang.t('admin.promo.filterExpired')"
          [options]="expiredFilterOptions()"
          [control]="expiredControl"
          (selected)="applyFilters()"
        />
      </div>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.promo.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.promo.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.promo.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.promo.colCode') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.promo.colDiscount') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.promo.colApplies') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.promo.colUses') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.promo.colExpires') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.promo.colStatus') }}
                </th>
                @if (canManage()) {
                  <th scope="col" class="text-end font-medium px-4 py-3">
                    {{ lang.t('admin.promo.colActions') }}
                  </th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (p of store.items(); track p.id) {
                <tr class="hover:bg-gray-50" [class.opacity-60]="!p.active">
                  <td class="px-4 py-3 font-mono font-medium text-ios-brand-dark">{{ p.code }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ discountLabel(p) }}</td>
                  <td class="px-4 py-3 text-gray-500">{{ appliesLabel(p) }}</td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ p.usageCount }} /
                    {{ p.maxUses !== null ? p.maxUses : lang.t('admin.promo.unlimited') }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ p.expiresAt ? formatDate(p.expiresAt) : '—' }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="p.active"
                      [class.text-green-700]="p.active"
                      [class.bg-gray-100]="!p.active"
                      [class.text-gray-500]="!p.active"
                    >
                      {{ p.active ? lang.t('admin.promo.active') : lang.t('admin.promo.retired') }}
                    </span>
                    @if (p.active && expired(p)) {
                      <span class="ms-1 text-xs text-amber-700">
                        {{ lang.t('admin.promo.expiredBadge') }}
                      </span>
                    }
                  </td>
                  @if (canManage()) {
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          (click)="openEdit(p)"
                          class="text-sm text-ios-brand-primary underline"
                        >
                          {{ lang.t('admin.promo.edit') }}
                        </button>
                        @if (p.active) {
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() === p.id"
                            (click)="askRetire(p)"
                            class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {{ lang.t('admin.promo.retire') }}
                          </button>
                        } @else {
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() === p.id"
                            (click)="reactivate(p)"
                            class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                          >
                            {{ lang.t('admin.promo.reactivate') }}
                          </button>
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.actionError() && !dialogOpen() && !pendingRetire()) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">
            {{ store.actionError() }}
          </p>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.promo.loadMore') }}
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
          aria-labelledby="promo-dialog-title"
        >
          <div class="min-h-full flex items-center justify-center p-4">
            <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <h2 id="promo-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
                {{
                  editingId() ? lang.t('admin.promo.editTitle') : lang.t('admin.promo.createTitle')
                }}
              </h2>

              <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (editingId()) {
                  <div>
                    <p class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                      {{ lang.t('admin.promo.codeLabel') }}
                    </p>
                    <p class="font-mono text-sm text-gray-600">{{ editingCode() }}</p>
                  </div>
                } @else {
                  <ios-input
                    id="promo-code"
                    [label]="lang.t('admin.promo.codeLabel')"
                    type="text"
                    [control]="form.controls.code"
                    [placeholder]="lang.t('admin.promo.codePlaceholder')"
                  />
                }

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ios-select
                    id="promo-type"
                    [label]="lang.t('admin.promo.discountTypeLabel')"
                    [options]="typeOptions()"
                    [control]="form.controls.discountType"
                  />
                  @if (discountType() === 'percentage') {
                    <ios-input
                      id="promo-value"
                      [label]="lang.t('admin.promo.discountValueLabel')"
                      type="text"
                      [control]="form.controls.discountValue"
                      [placeholder]="'1 – 100'"
                    />
                  }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ios-input
                    id="promo-max-uses"
                    [label]="lang.t('admin.promo.maxUsesLabel')"
                    type="text"
                    [control]="form.controls.maxUses"
                    [placeholder]="lang.t('admin.promo.maxUsesPlaceholder')"
                  />
                  <div>
                    <label
                      for="promo-expires"
                      class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                    >
                      {{ lang.t('admin.promo.expiresLabel') }}
                    </label>
                    <input
                      id="promo-expires"
                      type="datetime-local"
                      [formControl]="form.controls.expiresAt"
                      class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                    />
                  </div>
                </div>

                <!-- Applies to -->
                <div>
                  <p class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                    {{ lang.t('admin.promo.appliesLabel') }}
                  </p>
                  <p class="text-xs text-gray-500 mb-2">{{ lang.t('admin.promo.appliesHint') }}</p>
                  @if (store.certsLoading()) {
                    <p class="text-xs text-gray-400">{{ lang.t('admin.promo.certsLoading') }}</p>
                  } @else {
                    <div
                      class="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 flex flex-col gap-1"
                    >
                      @for (c of store.certs(); track c.id) {
                        <label class="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            [checked]="isCertSelected(c.id)"
                            (change)="toggleCert(c.id)"
                          />
                          {{ c.label }}
                        </label>
                      } @empty {
                        <p class="text-xs text-gray-400">{{ lang.t('admin.promo.noCerts') }}</p>
                      }
                    </div>
                  }
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
                    {{ lang.t('admin.promo.cancel') }}
                  </button>
                  <ios-button
                    type="submit"
                    variant="primary"
                    [loading]="store.actionPendingId() === (editingId() ?? 'new')"
                  >
                    {{ lang.t('admin.promo.save') }}
                  </ios-button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Retire confirmation -->
      @if (pendingRetire(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-retire-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="promo-retire-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.promo.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.promo.confirmBody') }}
              <span class="font-mono font-medium text-ios-brand-dark">{{ pending.code }}</span>
            </p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelRetire()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.promo.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmRetire()"
              >
                {{ lang.t('admin.promo.retire') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminPromoCodesPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly now = Date.now();

  protected readonly store = inject(AdminPromoStore);
  protected readonly lang = inject(LanguageService);

  /** Create/edit/retire — backend allows super_admin + finance_admin. */
  protected readonly canManage = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('finance_admin'),
  );

  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingCode = signal('');
  protected readonly formError = signal<string | null>(null);
  protected readonly pendingRetire = signal<PromoCode | null>(null);
  protected readonly selectedCertIds = signal<ReadonlySet<string>>(new Set());

  protected readonly activeControl = this.fb.control('');
  protected readonly expiredControl = this.fb.control('');

  protected readonly form = this.fb.group({
    code: this.fb.control('', { validators: [required, Validators.maxLength(100)] }),
    discountType: this.fb.control<DiscountType>('percentage', { validators: [required] }),
    discountValue: this.fb.control(''),
    maxUses: this.fb.control(''),
    expiresAt: this.fb.control(''),
  });

  /** Live discount type so the value field shows only for `percentage`. */
  protected readonly discountType = toSignal(this.form.controls.discountType.valueChanges, {
    initialValue: this.form.controls.discountType.value,
  });

  protected readonly typeOptions = computed<SelectOption[]>(() =>
    DISCOUNT_TYPES.map((t) => ({ value: t, label: this.typeLabel(t) })),
  );
  protected readonly activeFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.promo.allStatuses') },
    { value: 'true', label: this.lang.t('admin.promo.active') },
    { value: 'false', label: this.lang.t('admin.promo.inactive') },
  ]);
  protected readonly expiredFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.promo.allExpiry') },
    { value: 'false', label: this.lang.t('admin.promo.notExpired') },
    { value: 'true', label: this.lang.t('admin.promo.expired') },
  ]);

  ngOnInit(): void {
    void this.store.load();
    void this.store.loadCerts();
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  protected typeLabel(type: DiscountType): string {
    return type === 'percentage'
      ? this.lang.t('admin.promo.typePercentage')
      : this.lang.t('admin.promo.typeFullWaiver');
  }

  protected discountLabel(p: PromoCode): string {
    return p.discountType === 'percentage'
      ? `${p.discountValue ?? 0}%`
      : this.lang.t('admin.promo.fullWaiver');
  }

  protected appliesLabel(p: PromoCode): string {
    const count = p.applicableCertIds?.length ?? 0;
    return count === 0
      ? this.lang.t('admin.promo.allCerts')
      : this.lang.t('admin.promo.nCerts', { count });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.lang.locale());
  }

  protected expired(p: PromoCode): boolean {
    return isExpired(p, this.now);
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  protected applyFilters(): void {
    void this.store.setFilters({
      active: toBool(this.activeControl.value),
      expired: toBool(this.expiredControl.value),
    });
  }

  protected retry(): void {
    void this.store.load(true);
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  // ── Applies-to checklist ─────────────────────────────────────────────────

  protected isCertSelected(id: string): boolean {
    return this.selectedCertIds().has(id);
  }

  protected toggleCert(id: string): void {
    this.selectedCertIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Create / edit dialog ─────────────────────────────────────────────────

  protected openCreate(): void {
    this.store.clearActionError();
    this.editingId.set(null);
    this.editingCode.set('');
    this.formError.set(null);
    this.selectedCertIds.set(new Set());
    this.form.controls.code.setValidators([required, Validators.maxLength(100)]);
    this.form.controls.code.updateValueAndValidity();
    this.form.reset({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      maxUses: '',
      expiresAt: '',
    });
    this.dialogOpen.set(true);
  }

  protected openEdit(promo: PromoCode): void {
    this.store.clearActionError();
    this.editingId.set(promo.id);
    this.editingCode.set(promo.code);
    this.formError.set(null);
    this.selectedCertIds.set(new Set(promo.applicableCertIds ?? []));
    // `code` isn't editable here — drop its validator so it never blocks submit.
    this.form.controls.code.clearValidators();
    this.form.controls.code.updateValueAndValidity();
    this.form.reset({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue !== null ? String(promo.discountValue) : '',
      maxUses: promo.maxUses !== null ? String(promo.maxUses) : '',
      expiresAt: promo.expiresAt ? isoToLocalInput(promo.expiresAt) : '',
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
      this.formError.set(this.lang.t('admin.promo.formError'));
      return;
    }
    const raw = this.form.getRawValue();

    // discountValue: required + bounded for percentage; ignored for full_waiver.
    let discountValue: number | null = null;
    if (raw.discountType === 'percentage') {
      const num = Number(raw.discountValue);
      if (
        raw.discountValue.trim() === '' ||
        !Number.isFinite(num) ||
        num < PROMO_PERCENT_MIN ||
        num > PROMO_PERCENT_MAX
      ) {
        this.formError.set(this.lang.t('admin.promo.discountValueError'));
        return;
      }
      discountValue = num;
    }

    // maxUses: optional positive integer.
    let maxUses: number | null = null;
    if (raw.maxUses.trim() !== '') {
      const num = Number(raw.maxUses);
      if (!Number.isInteger(num) || num < 1) {
        this.formError.set(this.lang.t('admin.promo.maxUsesError'));
        return;
      }
      maxUses = num;
    }

    const expiresAt = raw.expiresAt.trim() !== '' ? isoFromLocalInput(raw.expiresAt) : null;
    const applicableCertIds = [...this.selectedCertIds()];
    const id = this.editingId();

    let ok: boolean;
    if (id) {
      const payload: UpdatePromoPayload = {
        discountType: raw.discountType,
        discountValue,
        applicableCertIds,
        maxUses,
        expiresAt,
      };
      ok = await this.store.update(id, payload);
    } else {
      const payload: CreatePromoPayload = {
        code: raw.code,
        discountType: raw.discountType,
        discountValue,
        applicableCertIds,
        maxUses,
        expiresAt,
      };
      ok = await this.store.create(payload);
    }
    if (ok) this.dialogOpen.set(false);
  }

  // ── Retire / reactivate ──────────────────────────────────────────────────

  protected askRetire(promo: PromoCode): void {
    this.store.clearActionError();
    this.pendingRetire.set(promo);
  }

  protected cancelRetire(): void {
    this.store.clearActionError();
    this.pendingRetire.set(null);
  }

  protected async confirmRetire(): Promise<void> {
    const pending = this.pendingRetire();
    if (!pending) return;
    const ok = await this.store.retire(pending.id);
    if (ok) this.pendingRetire.set(null);
  }

  protected reactivate(promo: PromoCode): void {
    void this.store.reactivate(promo.id);
  }
}

/** Filter select value → tri-state boolean (`''` → undefined). */
function toBool(value: string): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

/** ISO timestamp → `datetime-local` input value (`YYYY-MM-DDTHH:mm`, local time). */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `datetime-local` input value → ISO-8601 timestamp. */
function isoFromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export default AdminPromoCodesPage;
