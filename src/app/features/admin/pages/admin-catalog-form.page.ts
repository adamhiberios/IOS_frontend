/* eslint-disable @typescript-eslint/unbound-method */
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { Button, Checkbox, Input as IosInput, Select, type SelectOption } from '@ui';

import { CertImageUpload } from '../components/cert-image-upload';
import { AdminCatalogApi } from '../data-access/catalog.api';
import {
  type CertLevel,
  type CertificateLocaleFields,
  type CertificateTranslationsPayload,
  type CertificateWritePayload,
} from '../data-access/catalog.model';

/** Integer string (estimated study hours). */
const INT_PATTERN = /^\d+$/;

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
 * Fields mirror the backend `CreateCertificateDto` — including the catalog-card
 * metadata (`badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl`,
 * BE-I-04). Per-locale translations are edited via a separate dialog.
 */
@Component({
  selector: 'ios-admin-catalog-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IosInput,
    Button,
    Checkbox,
    Select,
    CertImageUpload,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
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

          <!-- Image slots: pasted URL or a direct upload (BE-I-27 / 66a7632) -->
          <ios-cert-image-upload
            imageType="thumbnail"
            [control]="form.controls.thumbnailUrl"
            [certId]="certId"
            [label]="lang.t('admin.catalog.form.thumbnailLabel')"
            [placeholder]="lang.t('admin.catalog.form.thumbnailPlaceholder')"
          />

          <!-- Catalog-card metadata (BE-I-04) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ios-cert-image-upload
              imageType="badge"
              [control]="form.controls.badgeImageUrl"
              [certId]="certId"
              [label]="lang.t('admin.catalog.form.badgeLabel')"
              [placeholder]="lang.t('admin.catalog.form.badgePlaceholder')"
            />
            <ios-input
              id="cert-syllabus"
              [label]="lang.t('admin.catalog.form.syllabusLabel')"
              type="url"
              [control]="form.controls.syllabusUrl"
              [placeholder]="lang.t('admin.catalog.form.syllabusPlaceholder')"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ios-input
              id="cert-track"
              [label]="lang.t('admin.catalog.form.trackLabel')"
              [control]="form.controls.track"
              [placeholder]="lang.t('admin.catalog.form.trackPlaceholder')"
            />
            <ios-input
              id="cert-duration"
              [label]="lang.t('admin.catalog.form.durationLabel')"
              [control]="form.controls.durationHours"
              [placeholder]="lang.t('admin.catalog.form.durationPlaceholder')"
              [errorText]="
                hasError('durationHours') ? lang.t('admin.catalog.form.durationError') : ''
              "
            />
          </div>

          <ios-select
            id="cert-level"
            [label]="lang.t('admin.catalog.form.levelLabel')"
            [options]="levelOptions()"
            [control]="form.controls.level"
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
            @if (isEdit) {
              <button
                type="button"
                (click)="openTranslations()"
                class="text-sm text-ios-brand-primary underline"
              >
                {{ lang.t('admin.catalog.translations.button') }}
              </button>
            }
            <a routerLink="/admin/catalog" class="text-sm text-gray-600 hover:text-gray-900">
              {{ lang.t('admin.catalog.form.cancel') }}
            </a>
          </div>
        </form>
      }

      <!-- Translations dialog -->
      @if (translationsOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cat-tr-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="cat-tr-title" class="text-lg font-semibold text-ios-brand-dark mb-1">
              {{ lang.t('admin.catalog.translations.title') }}
            </h2>
            <p class="text-xs text-gray-500 mb-4">
              {{ lang.t('admin.catalog.translations.hint') }}
            </p>

            <form
              [formGroup]="translationsForm"
              (ngSubmit)="onSaveTranslations()"
              novalidate
              class="flex flex-col gap-5"
            >
              <fieldset class="flex flex-col gap-3">
                <legend class="text-sm font-heading font-medium text-ios-brand-dark">
                  {{ localeLabel('ar') }}
                </legend>
                <ios-input
                  id="cat-tr-ar-title"
                  [label]="lang.t('admin.catalog.translations.titleLabel')"
                  [control]="translationsForm.controls.arTitle"
                  [placeholder]="form.controls.title.value"
                />
                <div class="flex flex-col gap-1.5">
                  <label for="cat-tr-ar-desc" class="text-sm font-medium text-ios-brand-dark">
                    {{ lang.t('admin.catalog.translations.descriptionLabel') }}
                  </label>
                  <textarea
                    id="cat-tr-ar-desc"
                    rows="3"
                    [formControl]="translationsForm.controls.arDescription"
                    class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary"
                  ></textarea>
                </div>
              </fieldset>

              <fieldset class="flex flex-col gap-3">
                <legend class="text-sm font-heading font-medium text-ios-brand-dark">
                  {{ localeLabel('fr') }}
                </legend>
                <ios-input
                  id="cat-tr-fr-title"
                  [label]="lang.t('admin.catalog.translations.titleLabel')"
                  [control]="translationsForm.controls.frTitle"
                  [placeholder]="form.controls.title.value"
                />
                <div class="flex flex-col gap-1.5">
                  <label for="cat-tr-fr-desc" class="text-sm font-medium text-ios-brand-dark">
                    {{ lang.t('admin.catalog.translations.descriptionLabel') }}
                  </label>
                  <textarea
                    id="cat-tr-fr-desc"
                    rows="3"
                    [formControl]="translationsForm.controls.frDescription"
                    class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary"
                  ></textarea>
                </div>
              </fieldset>

              @if (translationsError()) {
                <p
                  role="alert"
                  class="text-sm p-2 rounded bg-red-50 text-red-700 border border-red-200"
                >
                  {{ translationsError() }}
                </p>
              }

              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  (click)="closeTranslations()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.catalog.translations.cancel') }}
                </button>
                <ios-button type="submit" variant="primary" [loading]="translationsSaving()">
                  {{ lang.t('admin.catalog.translations.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
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

  // Per-locale translations (edited via a dialog; English is the canonical form).
  protected readonly translationsOpen = signal(false);
  protected readonly translationsSaving = signal(false);
  protected readonly translationsError = signal('');
  private readonly certTranslations = signal<Record<string, CertificateLocaleFields>>({});
  private readonly localeLabels = new Map<string, string>(
    this.lang.supportedLocales.map((l) => [l.code, l.label]),
  );

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
    // Catalog-card metadata (BE-I-04).
    badgeImageUrl: this.fb.control('', { validators: [Validators.maxLength(500)] }),
    track: this.fb.control('', { validators: [Validators.maxLength(100)] }),
    level: this.fb.control(''),
    durationHours: this.fb.control('', { validators: [Validators.pattern(INT_PATTERN)] }),
    syllabusUrl: this.fb.control('', { validators: [Validators.maxLength(500)] }),
  });

  protected readonly levelOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.catalog.form.levelNone') },
    { value: 'foundation', label: this.lang.t('admin.catalog.form.levelFoundation') },
    { value: 'practitioner', label: this.lang.t('admin.catalog.form.levelPractitioner') },
    { value: 'authority', label: this.lang.t('admin.catalog.form.levelAuthority') },
  ]);

  protected readonly translationsForm = this.fb.group({
    arTitle: this.fb.control('', { validators: [Validators.maxLength(255)] }),
    arDescription: this.fb.control('', { validators: [Validators.maxLength(5000)] }),
    frTitle: this.fb.control('', { validators: [Validators.maxLength(255)] }),
    frDescription: this.fb.control('', { validators: [Validators.maxLength(5000)] }),
  });

  protected localeLabel(code: string): string {
    return this.localeLabels.get(code) ?? code;
  }

  ngOnInit(): void {
    if (this.isEdit) {
      void this.loadDetail(this.certId);
    }
  }

  protected hasError = (
    controlName: 'title' | 'programCode' | 'price' | 'currency' | 'durationHours',
  ): boolean => {
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
        badgeImageUrl: cert.badgeImageUrl ?? '',
        track: cert.track ?? '',
        level: cert.level ?? '',
        durationHours: cert.durationHours != null ? String(cert.durationHours) : '',
        syllabusUrl: cert.syllabusUrl ?? '',
      });
      this.certTranslations.set(cert.translations);
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

  protected openTranslations(): void {
    this.translationsError.set('');
    const t = this.certTranslations();
    this.translationsForm.reset({
      arTitle: t['ar']?.title ?? '',
      arDescription: t['ar']?.description ?? '',
      frTitle: t['fr']?.title ?? '',
      frDescription: t['fr']?.description ?? '',
    });
    this.translationsOpen.set(true);
  }

  protected closeTranslations(): void {
    this.translationsError.set('');
    this.translationsOpen.set(false);
  }

  protected onSaveTranslations(): void {
    if (this.translationsForm.invalid) {
      this.translationsForm.markAllAsTouched();
      return;
    }
    void this.saveTranslations();
  }

  private async saveTranslations(): Promise<void> {
    this.translationsSaving.set(true);
    this.translationsError.set('');
    const payload = this.buildTranslationsPayload();
    try {
      await firstValueFrom(this.api.updateTranslations(this.certId, payload));
      // Reflect the per-locale replace-merge locally (no reload needed).
      const next = { ...this.certTranslations() };
      for (const [locale, entry] of Object.entries(payload.translations)) {
        next[locale] = entry;
      }
      this.certTranslations.set(next);
      this.translationsOpen.set(false);
    } catch (err) {
      this.translationsError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.catalog.translations.error'),
      );
    } finally {
      this.translationsSaving.set(false);
    }
  }

  /**
   * Build the translations body: for each locale send its non-empty fields
   * (a REPLACE), or `{}` to clear a locale that previously had content. Locales
   * that are and were empty are omitted (no-op).
   */
  private buildTranslationsPayload(): CertificateTranslationsPayload {
    const v = this.translationsForm.getRawValue();
    const translations: Record<string, CertificateLocaleFields> = {};
    const add = (locale: string, title: string, description: string): void => {
      const entry: { title?: string; description?: string } = {};
      const t = title.trim();
      const d = description.trim();
      if (t) entry.title = t;
      if (d) entry.description = d;
      const prev = this.certTranslations()[locale];
      const hadContent = Boolean(prev?.title ?? prev?.description);
      if (Object.keys(entry).length > 0) translations[locale] = entry;
      else if (hadContent) translations[locale] = {};
    };
    add('ar', v.arTitle, v.arDescription);
    add('fr', v.frTitle, v.frDescription);
    return { translations };
  }

  private buildPayload(): CertificateWritePayload {
    const v = this.form.getRawValue();
    const description = v.description.trim();
    const thumbnailUrl = v.thumbnailUrl.trim();
    const currency = v.currency.trim();
    const badgeImageUrl = v.badgeImageUrl.trim();
    const track = v.track.trim();
    const syllabusUrl = v.syllabusUrl.trim();
    const durationHours = v.durationHours.trim();
    const level = v.level;
    return {
      title: v.title.trim(),
      programCode: v.programCode.trim(),
      price: Number(v.price),
      currency: currency || undefined,
      description: description ? description : null,
      thumbnailUrl: thumbnailUrl ? thumbnailUrl : null,
      active: v.active,
      badgeImageUrl: badgeImageUrl ? badgeImageUrl : null,
      track: track ? track : null,
      syllabusUrl: syllabusUrl ? syllabusUrl : null,
      level: level ? (level as CertLevel) : null,
      // Omit when blank — the backend coerces null → 0, so a blank field
      // preserves the existing value rather than clearing it.
      ...(durationHours ? { durationHours: Number(durationHours) } : {}),
    };
  }
}

export default AdminCatalogFormPage;
