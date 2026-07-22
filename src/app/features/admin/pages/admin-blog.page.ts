import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type FormControl,
  type FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, RichText, Select, type SelectOption } from '@ui';

import {
  BLOG_STATUSES,
  BLOG_TRANSLATION_LOCALES,
  type BlogAdminItem,
  type BlogStatus,
  type BlogTranslationLocale,
  type BlogTranslationsPayload,
  isBlogStatus,
} from '../data-access/blog.model';
import { AdminBlogStore } from '../data-access/blog.store';

/** `Validators.required` wrapped as a call (unbound-method rule). */
const required: ValidatorFn = (control) => Validators.required(control);

/**
 * Kebab-case slug: lowercase letters/digits in hyphen-separated groups (e.g.
 * `what-is-scrum`). Applied only when non-empty — a blank slug is valid and the
 * backend derives one from the title.
 */
const slugValidator: ValidatorFn = Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Native locale display names for the translation matrix (authoring aid). */
const LOCALE_NAMES: Readonly<Record<BlogTranslationLocale, string>> = {
  tr: 'Türkçe',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
  de: 'Deutsch',
};

/**
 * Admin blog authoring (`/admin/blog`, BE-I-11 / BLOG-ADMIN).
 *
 * List / filter articles across all statuses and (per role) create, edit,
 * translate, publish, unpublish, and archive them. `content_creator` and
 * `learning_admin` author content; only `learning_admin` runs the lifecycle
 * actions; `super_admin` does everything (the backend enforces the split — the
 * UI only hides what the current staff member can't do). Server state + actions
 * live in {@link AdminBlogStore}.
 */
@Component({
  selector: 'ios-admin-blog-page',
  imports: [ReactiveFormsModule, IosInput, RichText, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">{{ lang.t('admin.blog.title') }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.blog.subtitle') }}</p>
        </div>
        @if (canManageContent()) {
          <ios-button variant="primary" (clicked)="openCreate()">
            {{ lang.t('admin.blog.new') }}
          </ios-button>
        }
      </header>

      <!-- Filters -->
      <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ios-select
          id="blog-status-filter"
          [label]="lang.t('admin.blog.filterStatus')"
          [options]="statusFilterOptions()"
          [control]="statusControl"
          (selected)="applyFilters()"
        />
        <ios-input
          id="blog-search"
          [label]="lang.t('admin.blog.searchLabel')"
          type="text"
          [control]="searchControl"
          [placeholder]="lang.t('admin.blog.searchPlaceholder')"
        />
      </div>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.blog.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.blog.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.blog.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.blog.colTitle') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.blog.colStatus') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.blog.colAuthor') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.blog.colUpdated') }}
                </th>
                @if (canManageContent() || canManageLifecycle()) {
                  <th scope="col" class="text-end font-medium px-4 py-3">
                    {{ lang.t('admin.blog.colActions') }}
                  </th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (a of store.items(); track a.id) {
                <tr class="hover:bg-gray-50 align-top" [class.opacity-60]="a.status === 'archived'">
                  <td class="px-4 py-3">
                    <p class="font-medium text-ios-brand-dark">{{ a.title }}</p>
                    <p class="font-mono text-xs text-gray-400 mt-0.5">/{{ a.slug }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="a.status === 'published'"
                      [class.text-green-700]="a.status === 'published'"
                      [class.bg-gray-100]="a.status === 'draft'"
                      [class.text-gray-600]="a.status === 'draft'"
                      [class.bg-amber-50]="a.status === 'archived'"
                      [class.text-amber-700]="a.status === 'archived'"
                    >
                      {{ statusLabel(a.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ a.authorName || '—' }}</td>
                  <td class="px-4 py-3 text-gray-500">{{ formatDate(a.updatedAt) }}</td>
                  @if (canManageContent() || canManageLifecycle()) {
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-3 flex-wrap">
                        @if (canManageContent()) {
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() !== null"
                            (click)="openEdit(a)"
                            class="text-sm text-ios-brand-primary underline disabled:opacity-50"
                          >
                            {{ lang.t('admin.blog.edit') }}
                          </button>
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() !== null"
                            (click)="openTranslations(a)"
                            class="text-sm text-ios-brand-primary underline disabled:opacity-50"
                          >
                            {{ lang.t('admin.blog.translations') }}
                          </button>
                        }
                        @if (canManageLifecycle()) {
                          @if (a.status !== 'published') {
                            <button
                              type="button"
                              [disabled]="store.actionPendingId() === a.id"
                              (click)="publish(a)"
                              class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                            >
                              {{ lang.t('admin.blog.publish') }}
                            </button>
                          } @else {
                            <button
                              type="button"
                              [disabled]="store.actionPendingId() === a.id"
                              (click)="unpublish(a)"
                              class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              {{ lang.t('admin.blog.unpublish') }}
                            </button>
                          }
                          @if (a.status !== 'archived') {
                            <button
                              type="button"
                              [disabled]="store.actionPendingId() === a.id"
                              (click)="askDelete(a)"
                              class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {{ lang.t('admin.blog.archive') }}
                            </button>
                          }
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.actionError() && !dialog() && !pendingDelete()) {
          <div class="mt-3 text-center" role="alert">
            <p class="text-sm text-red-600">{{ store.actionError() }}</p>
            @if (store.publishReasons().length > 0) {
              <ul class="mt-1 text-xs text-red-600 list-disc list-inside inline-block text-start">
                @for (reason of store.publishReasons(); track reason) {
                  <li>{{ reason }}</li>
                }
              </ul>
            }
          </div>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.blog.loadMore') }}
            </ios-button>
          </div>
        }
      }

      <!-- Create / edit dialog -->
      @if (dialog() === 'form') {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-dialog-title"
        >
          <div class="min-h-full flex items-start justify-center p-4">
            <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8">
              <h2 id="blog-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
                {{
                  editingId() ? lang.t('admin.blog.editTitle') : lang.t('admin.blog.createTitle')
                }}
              </h2>

              <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                <ios-input
                  id="blog-title"
                  [label]="lang.t('admin.blog.titleLabel')"
                  type="text"
                  [control]="form.controls.title"
                  [placeholder]="lang.t('admin.blog.titlePlaceholder')"
                />

                @if (slugLocked()) {
                  <div>
                    <p class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                      {{ lang.t('admin.blog.slugLabel') }}
                    </p>
                    <p class="font-mono text-sm text-gray-600">/{{ form.controls.slug.value }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ lang.t('admin.blog.slugLocked') }}</p>
                  </div>
                } @else {
                  <ios-input
                    id="blog-slug"
                    [label]="lang.t('admin.blog.slugLabel')"
                    type="text"
                    [control]="form.controls.slug"
                    [placeholder]="lang.t('admin.blog.slugPlaceholder')"
                    [errorText]="lang.t('admin.blog.slugError')"
                  />
                }

                <ios-input
                  id="blog-meta"
                  [label]="lang.t('admin.blog.metaLabel')"
                  type="text"
                  [control]="form.controls.metaDescription"
                  [placeholder]="lang.t('admin.blog.metaPlaceholder')"
                />

                <div>
                  <ios-rich-text
                    id="blog-content"
                    [label]="lang.t('admin.blog.contentLabel')"
                    [control]="form.controls.contentHtml"
                    [placeholder]="lang.t('admin.blog.contentPlaceholder')"
                    [errorText]="lang.t('admin.blog.contentError')"
                  />
                  <p class="text-xs text-gray-400 mt-1">{{ lang.t('admin.blog.contentHint') }}</p>
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
                    {{ lang.t('admin.blog.cancel') }}
                  </button>
                  <ios-button
                    type="submit"
                    variant="primary"
                    [loading]="store.actionPendingId() === (editingId() ?? 'new')"
                  >
                    {{ lang.t('admin.blog.save') }}
                  </ios-button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Translations dialog -->
      @if (dialog() === 'translations') {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-tr-title"
        >
          <div class="min-h-full flex items-start justify-center p-4">
            <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8">
              <h2 id="blog-tr-title" class="text-lg font-semibold text-ios-brand-dark">
                {{ lang.t('admin.blog.translations') }}
              </h2>
              <p class="text-sm text-gray-500 mt-1 mb-4">
                {{ lang.t('admin.blog.translationsHint') }}
                <span class="font-medium text-ios-brand-dark">{{ editingTitle() }}</span>
              </p>

              <form [formGroup]="translationsForm" (ngSubmit)="submitTranslations()">
                <div class="flex flex-col gap-6">
                  @for (loc of translationLocales; track loc) {
                    <fieldset [formGroupName]="loc" class="rounded-lg border border-gray-200 p-4">
                      <legend class="px-1 text-sm font-semibold text-ios-brand-dark">
                        {{ localeName(loc) }}
                        <span class="text-xs font-normal text-gray-400">({{ loc }})</span>
                      </legend>
                      <div class="flex flex-col gap-3 mt-2">
                        <div>
                          <label
                            [for]="'tr-title-' + loc"
                            class="block text-xs font-medium text-gray-600 mb-1"
                          >
                            {{ lang.t('admin.blog.trTitleLabel') }}
                          </label>
                          <input
                            [id]="'tr-title-' + loc"
                            type="text"
                            formControlName="title"
                            class="w-full h-11 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                          />
                        </div>
                        <div>
                          <label
                            [for]="'tr-meta-' + loc"
                            class="block text-xs font-medium text-gray-600 mb-1"
                          >
                            {{ lang.t('admin.blog.trMetaLabel') }}
                          </label>
                          <input
                            [id]="'tr-meta-' + loc"
                            type="text"
                            formControlName="metaDescription"
                            class="w-full h-11 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                          />
                        </div>
                        <ios-rich-text
                          [id]="'tr-content-' + loc"
                          [label]="lang.t('admin.blog.trContentLabel')"
                          [control]="translationsForm.controls[loc].controls.contentHtml"
                        />
                      </div>
                    </fieldset>
                  }
                </div>

                @if (store.actionError()) {
                  <p class="text-sm text-red-600 mt-4" role="alert">{{ store.actionError() }}</p>
                }

                <div class="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    (click)="closeDialog()"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {{ lang.t('admin.blog.cancel') }}
                  </button>
                  <ios-button
                    type="submit"
                    variant="primary"
                    [loading]="store.actionPendingId() === editingId()"
                  >
                    {{ lang.t('admin.blog.save') }}
                  </ios-button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Archive confirmation -->
      @if (pendingDelete(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-del-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="blog-del-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.blog.archiveTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.blog.archiveBody') }}
              <span class="font-medium text-ios-brand-dark">{{ pending.title }}</span>
            </p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDelete()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.blog.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDelete()"
              >
                {{ lang.t('admin.blog.archive') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminBlogPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminBlogStore);
  protected readonly lang = inject(LanguageService);
  protected readonly translationLocales = BLOG_TRANSLATION_LOCALES;

  /** Author content — super_admin, content_creator, learning_admin. */
  protected readonly canManageContent = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );
  /** Lifecycle (publish / unpublish / archive) — super_admin, learning_admin. */
  protected readonly canManageLifecycle = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly dialog = signal<'form' | 'translations' | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingTitle = signal('');
  protected readonly slugLocked = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly pendingDelete = signal<BlogAdminItem | null>(null);

  protected readonly statusControl = this.fb.control('');
  protected readonly searchControl = this.fb.control('');

  protected readonly form = this.fb.group({
    title: this.fb.control('', { validators: [required, Validators.maxLength(255)] }),
    slug: this.fb.control('', { validators: [slugValidator, Validators.maxLength(255)] }),
    metaDescription: this.fb.control('', { validators: [Validators.maxLength(500)] }),
    contentHtml: this.fb.control('', { validators: [required] }),
  });

  /** One nested group per non-English locale: { tr: {title,metaDescription,contentHtml}, … }. */
  protected readonly translationsForm = this.buildTranslationsForm();

  private readonly searchValue = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  protected readonly statusFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.blog.allStatuses') },
    ...BLOG_STATUSES.map((s) => ({ value: s, label: this.statusLabel(s) })),
  ]);

  constructor() {
    // Debounced search drives the same server-side filter as the status select.
    effect(() => {
      this.searchValue();
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  protected statusLabel(status: BlogStatus): string {
    return this.lang.t(`admin.blog.status.${status}`);
  }

  protected localeName(loc: BlogTranslationLocale): string {
    return LOCALE_NAMES[loc];
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.lang.locale());
  }

  // ── Filters ──────────────────────────────────────────────────────────────

  protected applyFilters(): void {
    const status = this.statusControl.value;
    void this.store.setFilters({
      status: isBlogStatus(status) ? status : undefined,
      search: this.searchValue().trim() || undefined,
    });
  }

  protected retry(): void {
    void this.store.retry();
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  // ── Create / edit dialog ───────────────────────────────────────────────────

  protected openCreate(): void {
    this.store.clearActionError();
    this.editingId.set(null);
    this.editingTitle.set('');
    this.slugLocked.set(false);
    this.formError.set(null);
    this.form.reset({ title: '', slug: '', metaDescription: '', contentHtml: '' });
    this.dialog.set('form');
  }

  protected async openEdit(item: BlogAdminItem): Promise<void> {
    this.store.clearActionError();
    const detail = await this.store.loadDetail(item.id);
    if (!detail) return;
    this.editingId.set(detail.id);
    this.editingTitle.set(detail.title);
    this.slugLocked.set(detail.status === 'published');
    this.formError.set(null);
    this.form.reset({
      title: detail.title,
      slug: detail.slug,
      metaDescription: detail.metaDescription ?? '',
      contentHtml: detail.contentHtml,
    });
    this.dialog.set('form');
  }

  protected closeDialog(): void {
    this.store.clearActionError();
    this.dialog.set(null);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.formError.set(null);
    if (this.form.invalid) {
      this.formError.set(this.lang.t('admin.blog.formError'));
      return;
    }
    const raw = this.form.getRawValue();
    const id = this.editingId();
    const ok = id
      ? await this.store.update(id, {
          title: raw.title,
          contentHtml: raw.contentHtml,
          slug: this.slugLocked() ? null : raw.slug.trim() || null,
          metaDescription: raw.metaDescription,
        })
      : await this.store.create({
          title: raw.title,
          contentHtml: raw.contentHtml,
          slug: raw.slug.trim() || null,
          metaDescription: raw.metaDescription.trim() || null,
        });
    if (ok) this.dialog.set(null);
  }

  // ── Translations dialog ──────────────────────────────────────────────────

  protected async openTranslations(item: BlogAdminItem): Promise<void> {
    this.store.clearActionError();
    const detail = await this.store.loadDetail(item.id);
    if (!detail) return;
    this.editingId.set(detail.id);
    this.editingTitle.set(detail.title);
    for (const loc of BLOG_TRANSLATION_LOCALES) {
      const block = detail.translations[loc];
      this.translationsForm.controls[loc].reset({
        title: block?.title ?? '',
        metaDescription: block?.metaDescription ?? '',
        contentHtml: block?.contentHtml ?? '',
      });
    }
    this.dialog.set('translations');
  }

  protected async submitTranslations(): Promise<void> {
    const id = this.editingId();
    if (!id) return;
    const raw = this.translationsForm.getRawValue();
    const payload: BlogTranslationsPayload = {};
    for (const loc of BLOG_TRANSLATION_LOCALES) {
      payload[loc] = raw[loc];
    }
    const ok = await this.store.updateTranslations(id, payload);
    if (ok) this.dialog.set(null);
  }

  // ── Lifecycle actions ──────────────────────────────────────────────────────

  protected publish(item: BlogAdminItem): void {
    void this.store.publish(item.id);
  }

  protected unpublish(item: BlogAdminItem): void {
    void this.store.unpublish(item.id);
  }

  protected askDelete(item: BlogAdminItem): void {
    this.store.clearActionError();
    this.pendingDelete.set(item);
  }

  protected cancelDelete(): void {
    this.store.clearActionError();
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const pending = this.pendingDelete();
    if (!pending) return;
    const ok = await this.store.remove(pending.id);
    if (ok) this.pendingDelete.set(null);
  }

  private buildTranslationsForm(): FormGroup<
    Record<
      BlogTranslationLocale,
      FormGroup<{
        title: FormControl<string>;
        metaDescription: FormControl<string>;
        contentHtml: FormControl<string>;
      }>
    >
  > {
    const groups = {} as Record<
      BlogTranslationLocale,
      FormGroup<{
        title: FormControl<string>;
        metaDescription: FormControl<string>;
        contentHtml: FormControl<string>;
      }>
    >;
    for (const loc of BLOG_TRANSLATION_LOCALES) {
      groups[loc] = this.fb.group({
        title: this.fb.control('', { validators: [Validators.maxLength(255)] }),
        metaDescription: this.fb.control('', { validators: [Validators.maxLength(500)] }),
        contentHtml: this.fb.control(''),
      });
    }
    return this.fb.group(groups);
  }
}

export default AdminBlogPage;
