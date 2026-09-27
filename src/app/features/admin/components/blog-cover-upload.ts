import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { type FormControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminBlogApi } from '../data-access/blog.api';
import { BLOG_COVER_ACCEPT, isBlogCoverContentType } from '../data-access/blog.model';

/**
 * Blog article cover-photo picker (IDD-384 / IDD-387). The backend already
 * signed covers (`POST /admin/blog/:id/cover-upload-url`); the admin form had no
 * field for them, so articles could never get an image.
 *
 * **Writes through the bound `FormControl`.** The control holds the cover URL
 * and is what the form's own save PATCHes, so an upload followed by "cancel"
 * never half-commits a change. Same contract as `ios-cert-image-upload`.
 *
 * **Upload requires a saved article.** The upload URL 404s for an id that does
 * not exist yet, so while creating, the picker is replaced by a hint to save
 * the draft first.
 *
 * Flow: request presigned URL → PUT bytes direct to storage (echoing
 * `requiredHeaders`, interceptor-free) → write `publicUrl` into the control.
 */
@Component({
  selector: 'ios-blog-cover-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
        {{ lang.t('admin.blog.coverLabel') }}
      </p>

      @if (control().value; as url) {
        <!--
          Plain [src], not [ngSrc]: an admin-only preview of an uploaded image
          with unknown dimensions, which may fail to resolve — hence (error).
        -->
        <!-- eslint-disable @angular-eslint/template/prefer-ngsrc -->
        <img
          [src]="url"
          loading="lazy"
          [alt]="lang.t('admin.blog.coverPreviewAlt')"
          class="mb-2 aspect-video w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50 object-cover"
          (error)="previewBroken.set(true)"
          [class.hidden]="previewBroken()"
        />
        <!-- eslint-enable @angular-eslint/template/prefer-ngsrc -->
        @if (previewBroken()) {
          <p class="mb-2 text-xs text-gray-400">{{ lang.t('admin.blog.coverPreviewFailed') }}</p>
        }
      }

      @if (canUpload()) {
        <div class="flex flex-wrap items-center gap-3">
          <label
            for="blog-cover-file"
            class="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            [class.opacity-50]="uploading()"
          >
            {{
              uploading()
                ? lang.t('admin.blog.coverUploading')
                : control().value
                  ? lang.t('admin.blog.coverReplace')
                  : lang.t('admin.blog.coverUpload')
            }}
          </label>
          <input
            id="blog-cover-file"
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
              {{ lang.t('admin.blog.coverRemove') }}
            </button>
          }
        </div>
        <p class="mt-1 text-xs text-gray-400">{{ lang.t('admin.blog.coverHint') }}</p>
      } @else {
        <p class="text-xs text-gray-400">{{ lang.t('admin.blog.coverUploadAfterSave') }}</p>
      }

      @if (error(); as message) {
        <p class="mt-1 text-xs text-red-600" role="alert">{{ message }}</p>
      }
    </div>
  `,
})
export class BlogCoverUpload {
  private readonly api = inject(AdminBlogApi);

  protected readonly lang = inject(LanguageService);
  protected readonly accept = BLOG_COVER_ACCEPT;

  /** The form control holding the cover URL — the single source of truth. */
  readonly control = input.required<FormControl<string>>();
  /** Empty while creating: no article exists to upload against yet. */
  readonly articleId = input('');

  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly previewBroken = signal(false);

  protected readonly canUpload = computed(() => this.articleId().length > 0);

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

    // The backend signs PNG/JPEG/WebP only and 400s the rest; checking here
    // turns a round trip into an instant, specific message.
    if (!isBlogCoverContentType(file.type)) {
      this.error.set(this.lang.t('admin.blog.coverTypeError'));
      return;
    }

    this.uploading.set(true);
    try {
      const target = await firstValueFrom(
        this.api.requestCoverUploadUrl(this.articleId(), file.type),
      );
      await firstValueFrom(this.api.uploadCoverBytes(target, file));
      // The backend reuses one object key per article (`blog/<id>/cover.<ext>`),
      // so a replaced cover keeps the same URL; the version param stops browsers
      // and the CDN serving the old image. Persisting happens on form save.
      this.control().setValue(`${target.publicUrl}?v=${Date.now()}`);
      this.control().markAsDirty();
    } catch (err) {
      this.error.set(problemDetailMessage(err) ?? this.lang.t('admin.blog.coverUploadError'));
    } finally {
      this.uploading.set(false);
    }
  }
}
