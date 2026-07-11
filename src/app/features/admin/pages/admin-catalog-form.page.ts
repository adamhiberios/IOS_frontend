/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { Button, Checkbox, Input as IosInput } from '@ui';

import { AdminCatalogApi } from '../data-access/catalog.api';
import { type CertificateWritePayload } from '../data-access/catalog.model';

/** Decimal money string with up to 2 fraction digits (mirrors backend price). */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Admin catalog — create / edit certificate form.
 *
 * One component for both modes: mounted at `/admin/catalog/new` (create) and
 * `/admin/catalog/:id/edit` (edit, `id` bound from the route param). Talks to
 * `AdminCatalogApi` directly (a one-shot form, no shared list state); on success
 * it returns to the list, which reloads on entry.
 *
 * Fields mirror the backend `CreateCertificateDto` exactly — the catalog-card
 * extras (`badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl`) and
 * translations are intentionally absent (backend BE-I-04).
 */
@Component({
  selector: 'ios-admin-catalog-form-page',
  imports: [ReactiveFormsModule, RouterLink, IosInput, Button, Checkbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-2xl">
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">
          {{
            isEdit
              ? lang.t('admin.catalog.form.editTitle')
              : lang.t('admin.catalog.form.createTitle')
          }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          {{
            isEdit
              ? lang.t('admin.catalog.form.editSubtitle')
              : lang.t('admin.catalog.form.createSubtitle')
          }}
        </p>
      </header>

      @if (loadingDetail()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.catalog.form.loading') }}
        </p>
      } @else if (loadError()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ loadError() }}</p>
          <a
            routerLink="/admin/catalog"
            class="inline-block mt-3 text-sm text-ios-brand-primary underline"
          >
            {{ lang.t('admin.catalog.form.backToList') }}
          </a>
        </div>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          novalidate
          class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6"
        >
          <ios-input
            id="cert-title"
            [label]="lang.t('admin.catalog.form.titleLabel')"
            [control]="form.controls.title"
            [placeholder]="lang.t('admin.catalog.form.titlePlaceholder')"
            [errorText]="hasError('title') ? lang.t('admin.catalog.form.titleError') : ''"
          />

          <ios-input
            id="cert-code"
            [label]="lang.t('admin.catalog.form.codeLabel')"
            [control]="form.controls.programCode"
            [placeholder]="lang.t('admin.catalog.form.codePlaceholder')"
            [errorText]="hasError('programCode') ? lang.t('admin.catalog.form.codeError') : ''"
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ios-input
              id="cert-price"
              [label]="lang.t('admin.catalog.form.priceLabel')"
              [control]="form.controls.price"
              [placeholder]="lang.t('admin.catalog.form.pricePlaceholder')"
              [errorText]="hasError('price') ? lang.t('admin.catalog.form.priceError') : ''"
            />
            <ios-input
              id="cert-currency"
              [label]="lang.t('admin.catalog.form.currencyLabel')"
              [control]="form.controls.currency"
              [placeholder]="lang.t('admin.catalog.form.currencyPlaceholder')"
              [errorText]="hasError('currency') ? lang.t('admin.catalog.form.currencyError') : ''"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="cert-description" class="text-sm font-medium text-ios-brand-dark">
              {{ lang.t('admin.catalog.form.descriptionLabel') }}
            </label>
            <textarea
              id="cert-description"
              rows="4"
              [formControl]="form.controls.description"
              [placeholder]="lang.t('admin.catalog.form.descriptionPlaceholder')"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary"
            ></textarea>
          </div>

          <ios-input
            id="cert-thumbnail"
            [label]="lang.t('admin.catalog.form.thumbnailLabel')"
            type="url"
            [control]="form.controls.thumbnailUrl"
            [placeholder]="lang.t('admin.catalog.form.thumbnailPlaceholder')"
          />

          <ios-checkbox
            [formControl]="form.controls.active"
            [label]="lang.t('admin.catalog.form.activeLabel')"
          />

          @if (errorMessage()) {
            <p
              role="alert"
              aria-live="polite"
              class="text-sm p-2 rounded bg-red-50 text-red-700 border border-red-200"
            >
              {{ errorMessage() }}
            </p>
          }

          <div class="flex items-center gap-3 pt-2">
            <ios-button type="submit" variant="primary" [loading]="submitting()">
              {{ isEdit ? lang.t('admin.catalog.form.save') : lang.t('admin.catalog.form.create') }}
            </ios-button>
            <a routerLink="/admin/catalog" class="text-sm text-gray-600 hover:text-gray-900">
              {{ lang.t('admin.catalog.form.cancel') }}
            </a>
          </div>
        </form>
      }
    </section>
  `,
})
export class AdminCatalogFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AdminCatalogApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly lang = inject(LanguageService);

  /**
   * Certificate id from the `:id` route param — empty on the `/new` (create)
   * route. Read from the route snapshot rather than a signal input: with
   * `withComponentInputBinding()` an absent optional param yields `undefined`,
   * not the input's default, which would crash `isEdit`. The snapshot is
   * deterministic and fixed for this component instance.
   */
  protected readonly certId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly isEdit = this.certId.length > 0;

  protected readonly loadingDetail = signal(false);
  protected readonly loadError = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.group({
    title: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    programCode: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    price: this.fb.control('', {
      validators: [Validators.required, Validators.pattern(PRICE_PATTERN)],
    }),
    currency: this.fb.control('USD', {
      validators: [Validators.minLength(3), Validators.maxLength(3)],
    }),
    description: this.fb.control('', {
      validators: [Validators.maxLength(5000)],
    }),
    thumbnailUrl: this.fb.control('', {
      validators: [Validators.maxLength(500)],
    }),
    active: this.fb.control(true),
  });

  ngOnInit(): void {
    if (this.isEdit) {
      void this.loadDetail(this.certId);
    }
  }

  protected hasError = (controlName: 'title' | 'programCode' | 'price' | 'currency'): boolean => {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  };

  private async loadDetail(id: string): Promise<void> {
    this.loadingDetail.set(true);
    this.loadError.set('');
    try {
      const cert = await firstValueFrom(this.api.getById(id));
      this.form.patchValue({
        title: cert.title,
        programCode: cert.programCode,
        price: cert.price,
        currency: cert.currency,
        description: cert.description ?? '',
        thumbnailUrl: cert.thumbnailUrl ?? '',
        active: cert.active,
      });
    } catch (err) {
      this.loadError.set(problemDetailMessage(err) ?? this.lang.t('admin.catalog.form.loadError'));
    } finally {
      this.loadingDetail.set(false);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    void this.submit();
  }

  private async submit(): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set('');
    const payload = this.buildPayload();
    try {
      await firstValueFrom(
        this.isEdit ? this.api.update(this.certId, payload) : this.api.create(payload),
      );
      await this.router.navigate(['/admin/catalog']);
    } catch (err) {
      this.errorMessage.set(
        problemDetailMessage(err) ?? this.lang.t('admin.catalog.form.genericError'),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private buildPayload(): CertificateWritePayload {
    const v = this.form.getRawValue();
    const description = v.description.trim();
    const thumbnailUrl = v.thumbnailUrl.trim();
    const currency = v.currency.trim();
    return {
      title: v.title.trim(),
      programCode: v.programCode.trim(),
      price: Number(v.price),
      currency: currency || undefined,
      description: description ? description : null,
      thumbnailUrl: thumbnailUrl ? thumbnailUrl : null,
      active: v.active,
    };
  }
}

export default AdminCatalogFormPage;
