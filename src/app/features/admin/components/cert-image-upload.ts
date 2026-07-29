import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { type FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { Input as IosInput } from '@ui';

import { AdminCatalogApi } from '../data-access/catalog.api';
import {
  CERTIFICATE_IMAGE_ACCEPT,
  type CertificateImageType,
  isCertificateImageContentType,
} from '../data-access/catalog.model';

/**
 * Certificate image field with a real upload picker (BE-I-27, narrowed by
 * backend `66a7632`). Replaces the pasted-URL-only inputs on the B8 catalog
 * form for the `badge` and `thumbnail` slots.
 *
 * **Writes through the bound `FormControl`.** The control still holds the URL
 * and is still what the form submits, so uploading is an *alternative* way to
 * fill it, not a parallel mechanism. That keeps the existing save path — and the
 * ability to paste a URL from elsewhere — untouched.
 *
 * **Upload requires an existing certificate.** `POST /admin/catalog/:id/
 * image-upload-url` 404s for an id that doesn't exist yet, so on the *create*
 * form there is nothing to upload against. Rather than fake it, the picker is
 * hidden until the certificate has been saved once and the field explains why.
 *
 * Flow: request presigned URL → PUT bytes direct to storage (echoing
 * `requiredHeaders`, interceptor-free) → write the returned `publicUrl` into the
 * control. The certificate is **not** patched here — the form's own save does
 * that, so an upload followed by "cancel" doesn't half-commit a change.
 */
@Component({
  selector: 'ios-cert-image-upload',
  imports: [ReactiveFormsModule, IosInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <ios-input
        [id]="inputId()"
        [label]="label()"
        type="url"
        [control]="control()"
        [placeholder]="placeholder()"
      />

      @if (canUpload()) {
        <div class="mt-2 flex flex-wrap items-center gap-3">
          <label
            [for]="fileInputId()"
            class="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            [class.opacity-50]="uploading()"
          >
            {{
              uploading()
                ? lang.t('admin.catalog.form.imageUploading')
                : lang.t('admin.catalog.form.imageUpload')
            }}
          </label>
          <input
            [id]="fileInputId()"
            type="file"
            class="sr-only"
            [accept]="accept"
            [disabled]="uploading()"
            (change)="onFileSelected($event)"
          />

          @if (control().value) {
            <button
              type="button"
              [disabled]="uploading()"
              (click)="clear()"
              class="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {{ lang.t('admin.catalog.form.imageRemove') }}
            </button>
          }
        </div>
      } @else {
        <p class="mt-1 text-xs text-gray-400">
          {{ lang.t('admin.catalog.form.imageUploadAfterSave') }}
        </p>
      }

      @if (error(); as message) {
        <p class="mt-1 text-xs text-red-600" role="alert">{{ message }}</p>
      }

      @if (control().value; as url) {
        <!--
          Plain [src], not [ngSrc]: NgOptimizedImage is for known, pre-sized,
          layout-critical images. This is an admin-only thumbnail of an
          arbitrary operator-supplied URL with unknown dimensions that may not
          resolve at all — which is what the (error) handler below is for.
        -->
        <!-- eslint-disable @angular-eslint/template/prefer-ngsrc -->
        <img
          [src]="url"
          [alt]="lang.t('admin.catalog.form.imagePreviewAlt')"
          class="mt-2 h-20 w-auto rounded border border-gray-200 bg-gray-50 object-contain"
          (error)="onPreviewError()"
          [class.hidden]="previewBroken()"
        />
        <!-- eslint-enable @angular-eslint/template/prefer-ngsrc -->
        @if (previewBroken()) {
          <p class="mt-1 text-xs text-gray-400">
            {{ lang.t('admin.catalog.form.imagePreviewFailed') }}
          </p>
        }
      }
    </div>
  `,
})
export class CertImageUpload {
  private readonly api = inject(AdminCatalogApi);

  protected readonly lang = inject(LanguageService);
  protected readonly accept = CERTIFICATE_IMAGE_ACCEPT;

  /** The form control holding the image URL — the single source of truth. */
  readonly control = input.required<FormControl<string>>();
  readonly imageType = input.required<CertificateImageType>();
  readonly label = input('');
  readonly placeholder = input('');
  /** Empty while creating: no certificate exists to upload against yet. */
  readonly certId = input('');

  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly previewBroken = signal(false);

  protected readonly canUpload = computed(() => this.certId().length > 0);
  protected readonly inputId = computed(() => `cert-image-${this.imageType()}`);
  protected readonly fileInputId = computed(() => `cert-image-file-${this.imageType()}`);

  protected onPreviewError(): void {
    this.previewBroken.set(true);
  }

  protected clear(): void {
    this.control().setValue('');
    this.control().markAsDirty();
    this.error.set(null);
    this.previewBroken.set(false);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset immediately so re-picking the *same* file fires `change` again.
    input.value = '';
    if (!file) return;

    this.error.set(null);
    this.previewBroken.set(false);

    // The backend signs only four MIME types and 400s the rest; checking here
    // turns a round trip into an instant, specific message.
    if (!isCertificateImageContentType(file.type)) {
      this.error.set(this.lang.t('admin.catalog.form.imageTypeError'));
      return;
    }

    this.uploading.set(true);
    try {
      const target = await firstValueFrom(
        this.api.requestImageUploadUrl(this.certId(), this.imageType(), file.type),
      );
      await firstValueFrom(this.api.uploadImageBytes(target, file));
      // Persisting happens on form save, not here — see the class docs.
      this.control().setValue(target.publicUrl);
      this.control().markAsDirty();
    } catch (err) {
      this.error.set(
        problemDetailMessage(err) ?? this.lang.t('admin.catalog.form.imageUploadError'),
      );
    } finally {
      this.uploading.set(false);
    }
  }
}

export default CertImageUpload;
