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

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import {
  type AdminLesson,
  type AdminModule,
  type LessonDraft,
  type ModuleDraft,
  translatedLocales,
} from '../data-access/curriculum.model';
import { AdminCurriculumStore } from '../data-access/curriculum.store';

/**
 * `Validators.required` wrapped as a call — the mixed string/number control set
 * degrades form-builder overload inference enough that the type-aware
 * `unbound-method` lint rule loses the bare reference's `ValidatorFn` context.
 */
const required: ValidatorFn = (control) => Validators.required(control);

/**
 * Admin curriculum management (`/admin/curriculum`, BE-I-13 / B1).
 *
 * Pick a certificate, then manage its modules and lessons (all statuses):
 * create / edit, reorder via position, and reactivate / deactivate (soft-delete).
 * All server state + actions live in {@link AdminCurriculumStore}; create/edit/
 * reactivate are gated to content_creator + learning_admin, deactivate to
 * learning_admin (the backend still enforces). Lesson-quiz authoring (B5) and a
 * per-locale translation editor are follow-up increments.
 */
@Component({
  selector: 'ios-admin-curriculum-page',
  imports: [ReactiveFormsModule, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">
            {{ lang.t('admin.curriculum.title') }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.curriculum.subtitle') }}</p>
        </div>
        @if (canManage() && store.certId()) {
          <ios-button variant="primary" (clicked)="openCreateModule()">
            {{ lang.t('admin.curriculum.newModule') }}
          </ios-button>
        }
      </header>

      <!-- Certificate picker -->
      <div class="mb-6">
        @if (store.certsError()) {
          <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p class="text-sm text-red-700">{{ store.certsError() }}</p>
            <ios-button class="mt-2 inline-block" variant="secondary" (clicked)="retryCerts()">
              {{ lang.t('admin.curriculum.retry') }}
            </ios-button>
          </div>
        } @else {
          <ios-select
            id="curriculum-cert"
            [label]="lang.t('admin.curriculum.certLabel')"
            [options]="certOptions()"
            [placeholder]="
              store.certsLoading()
                ? lang.t('admin.curriculum.certsLoading')
                : lang.t('admin.curriculum.certPlaceholder')
            "
            [control]="certControl"
            (selected)="onCertChange($event)"
          />
        }
      </div>

      @if (!store.certId()) {
        <div class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.curriculum.pickCert') }}</p>
        </div>
      } @else if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.curriculum.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.curriculum.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.curriculum.empty') }}</p>
        </div>
      } @else {
        <div class="flex flex-col gap-4">
          @for (m of store.modules(); track m.id) {
            <article
              class="rounded-xl border bg-white"
              [class.border-gray-200]="m.active"
              [class.border-gray-300]="!m.active"
              [class.opacity-60]="!m.active"
            >
              <!-- Module header -->
              <div class="flex items-start justify-between gap-4 p-4 border-b border-gray-100">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs text-gray-400">#{{ m.position }}</span>
                    <h2 class="text-base font-semibold text-ios-brand-dark truncate">
                      {{ m.title }}
                    </h2>
                    @if (!m.active) {
                      <span
                        class="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"
                      >
                        {{ lang.t('admin.curriculum.inactive') }}
                      </span>
                    }
                    @for (loc of localesOf(m.translations); track loc) {
                      <span
                        class="text-[10px] font-semibold uppercase text-ios-brand-primary bg-ios-brand-amber-soft rounded px-1.5 py-0.5"
                      >
                        {{ loc }}
                      </span>
                    }
                  </div>
                  @if (m.description) {
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ m.description }}</p>
                  }
                </div>
                @if (canManage()) {
                  <div class="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      (click)="openEditModule(m)"
                      class="text-sm text-ios-brand-primary underline"
                    >
                      {{ lang.t('admin.curriculum.edit') }}
                    </button>
                    @if (m.active) {
                      @if (canDelete()) {
                        <button
                          type="button"
                          [disabled]="isPending('module', m.id)"
                          (click)="deactivateModule(m)"
                          class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {{ lang.t('admin.curriculum.deactivate') }}
                        </button>
                      }
                    } @else {
                      <button
                        type="button"
                        [disabled]="isPending('module', m.id)"
                        (click)="reactivateModule(m)"
                        class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                      >
                        {{ lang.t('admin.curriculum.reactivate') }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Lessons -->
              <ul class="divide-y divide-gray-50">
                @for (l of m.lessons; track l.id) {
                  <li
                    class="flex items-start justify-between gap-4 px-4 py-3"
                    [class.opacity-60]="!l.active"
                  >
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs text-gray-400">#{{ l.position }}</span>
                        <p class="text-sm font-medium text-ios-brand-dark truncate">
                          {{ l.title }}
                        </p>
                        @if (!l.active) {
                          <span
                            class="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"
                          >
                            {{ lang.t('admin.curriculum.inactive') }}
                          </span>
                        }
                        @for (loc of localesOf(l.translations); track loc) {
                          <span
                            class="text-[10px] font-semibold uppercase text-ios-brand-primary bg-ios-brand-amber-soft rounded px-1.5 py-0.5"
                          >
                            {{ loc }}
                          </span>
                        }
                      </div>
                      <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        @if (l.durationSeconds) {
                          <span>{{
                            lang.t('admin.curriculum.duration', { seconds: l.durationSeconds })
                          }}</span>
                        }
                        @if (l.videoUrl) {
                          <span>{{ lang.t('admin.curriculum.hasVideo') }}</span>
                        }
                      </div>
                    </div>
                    @if (canManage()) {
                      <div class="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          (click)="openEditLesson(m, l)"
                          class="text-sm text-ios-brand-primary underline"
                        >
                          {{ lang.t('admin.curriculum.edit') }}
                        </button>
                        @if (l.active) {
                          @if (canDelete()) {
                            <button
                              type="button"
                              [disabled]="isPending('lesson', l.id)"
                              (click)="deactivateLesson(l)"
                              class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {{ lang.t('admin.curriculum.deactivate') }}
                            </button>
                          }
                        } @else {
                          <button
                            type="button"
                            [disabled]="isPending('lesson', l.id)"
                            (click)="reactivateLesson(l)"
                            class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                          >
                            {{ lang.t('admin.curriculum.reactivate') }}
                          </button>
                        }
                      </div>
                    }
                  </li>
                } @empty {
                  <li class="px-4 py-3 text-sm text-gray-400">
                    {{ lang.t('admin.curriculum.noLessons') }}
                  </li>
                }
              </ul>

              @if (canManage()) {
                <div class="px-4 py-3 border-t border-gray-100">
                  <button
                    type="button"
                    (click)="openCreateLesson(m)"
                    class="text-sm text-ios-brand-primary hover:underline"
                  >
                    + {{ lang.t('admin.curriculum.addLesson') }}
                  </button>
                </div>
              }
            </article>
          }
        </div>

        @if (store.actionError() && !moduleDialogOpen() && !lessonDialogOpen()) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">
            {{ store.actionError() }}
          </p>
        }
      }

      <!-- Module create / edit dialog -->
      @if (moduleDialogOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-dialog-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="module-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
              {{
                editingModuleId()
                  ? lang.t('admin.curriculum.editModuleTitle')
                  : lang.t('admin.curriculum.createModuleTitle')
              }}
            </h2>

            <form [formGroup]="moduleForm" (ngSubmit)="submitModule()" class="flex flex-col gap-4">
              <ios-input
                id="module-title"
                [label]="lang.t('admin.curriculum.moduleTitleLabel')"
                type="text"
                [control]="moduleForm.controls.title"
                [placeholder]="lang.t('admin.curriculum.moduleTitlePlaceholder')"
              />
              <div>
                <label
                  for="module-description"
                  class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                >
                  {{ lang.t('admin.curriculum.descriptionLabel') }}
                </label>
                <textarea
                  id="module-description"
                  rows="3"
                  [formControl]="moduleForm.controls.description"
                  class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                ></textarea>
              </div>
              <div>
                <label
                  for="module-position"
                  class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                >
                  {{ lang.t('admin.curriculum.positionLabel') }}
                </label>
                <input
                  id="module-position"
                  type="number"
                  min="0"
                  [formControl]="moduleForm.controls.position"
                  class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
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
                  (click)="closeModuleDialog()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.curriculum.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="isPending('module', editingModuleId() ?? 'new')"
                >
                  {{ lang.t('admin.curriculum.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Lesson create / edit dialog -->
      @if (lessonDialogOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-dialog-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="lesson-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-1">
              {{
                editingLessonId()
                  ? lang.t('admin.curriculum.editLessonTitle')
                  : lang.t('admin.curriculum.createLessonTitle')
              }}
            </h2>
            <p class="text-xs text-gray-500 mb-4">{{ lessonModuleTitle() }}</p>

            <form [formGroup]="lessonForm" (ngSubmit)="submitLesson()" class="flex flex-col gap-4">
              <ios-input
                id="lesson-title"
                [label]="lang.t('admin.curriculum.lessonTitleLabel')"
                type="text"
                [control]="lessonForm.controls.title"
                [placeholder]="lang.t('admin.curriculum.lessonTitlePlaceholder')"
              />
              <div>
                <label
                  for="lesson-content"
                  class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                >
                  {{ lang.t('admin.curriculum.contentLabel') }}
                </label>
                <textarea
                  id="lesson-content"
                  rows="4"
                  [formControl]="lessonForm.controls.contentText"
                  class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                ></textarea>
              </div>
              <ios-input
                id="lesson-video"
                [label]="lang.t('admin.curriculum.videoLabel')"
                type="text"
                [control]="lessonForm.controls.videoUrl"
                [placeholder]="lang.t('admin.curriculum.videoPlaceholder')"
              />
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="lesson-position"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.curriculum.positionLabel') }}
                  </label>
                  <input
                    id="lesson-position"
                    type="number"
                    min="0"
                    [formControl]="lessonForm.controls.position"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
                <div>
                  <label
                    for="lesson-duration"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.curriculum.durationLabel') }}
                  </label>
                  <input
                    id="lesson-duration"
                    type="number"
                    min="0"
                    [formControl]="lessonForm.controls.durationSeconds"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
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
                  (click)="closeLessonDialog()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.curriculum.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="isPending('lesson', editingLessonId() ?? 'new')"
                >
                  {{ lang.t('admin.curriculum.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminCurriculumPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminCurriculumStore);
  protected readonly lang = inject(LanguageService);

  /** Create / edit / reactivate — backend allows content_creator + learning_admin. */
  protected readonly canManage = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );
  /** Deactivate (soft-delete DELETE) — backend restricts to learning_admin. */
  protected readonly canDelete = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly certControl = this.fb.control('');
  protected readonly certOptions = computed<SelectOption[]>(() =>
    this.store.certs().map((c) => ({ value: c.id, label: c.label })),
  );

  protected readonly moduleDialogOpen = signal(false);
  protected readonly editingModuleId = signal<string | null>(null);
  protected readonly lessonDialogOpen = signal(false);
  protected readonly editingLessonId = signal<string | null>(null);
  protected readonly lessonModuleId = signal<string | null>(null);
  protected readonly lessonModuleTitle = signal('');
  protected readonly formError = signal<string | null>(null);

  protected readonly moduleForm = this.fb.group({
    title: this.fb.control('', { validators: [required] }),
    description: this.fb.control(''),
    position: this.fb.control(0, { validators: [required, Validators.min(0)] }),
  });

  protected readonly lessonForm = this.fb.group({
    title: this.fb.control('', { validators: [required] }),
    contentText: this.fb.control(''),
    videoUrl: this.fb.control(''),
    position: this.fb.control(0, { validators: [required, Validators.min(0)] }),
    durationSeconds: this.fb.control(0, { validators: [required, Validators.min(0)] }),
  });

  ngOnInit(): void {
    void this.store.loadCerts();
    // Restore the picker + refresh if the store already has a selected cert
    // (root-provided store survives navigation).
    const certId = this.store.certId();
    if (certId) {
      this.certControl.setValue(certId);
      void this.store.load();
    }
  }

  protected onCertChange(certId: string): void {
    void this.store.setCert(certId);
  }

  protected retryCerts(): void {
    void this.store.loadCerts();
  }

  protected retry(): void {
    void this.store.load();
  }

  protected localesOf(
    translations: AdminModule['translations'] | AdminLesson['translations'],
  ): readonly string[] {
    return translatedLocales(translations);
  }

  /** True while the given row's write is in flight (matches the store's pending key). */
  protected isPending(kind: 'module' | 'lesson', id: string): boolean {
    return this.store.actionPendingId() === `${kind}:${id}`;
  }

  // ── Module dialog ──────────────────────────────────────────────────────────

  protected openCreateModule(): void {
    this.store.clearActionError();
    this.editingModuleId.set(null);
    this.formError.set(null);
    this.moduleForm.reset({ title: '', description: '', position: this.nextModulePosition() });
    this.moduleDialogOpen.set(true);
  }

  protected openEditModule(module: AdminModule): void {
    this.store.clearActionError();
    this.editingModuleId.set(module.id);
    this.formError.set(null);
    this.moduleForm.reset({
      title: module.title,
      description: module.description ?? '',
      position: module.position,
    });
    this.moduleDialogOpen.set(true);
  }

  protected closeModuleDialog(): void {
    this.store.clearActionError();
    this.moduleDialogOpen.set(false);
  }

  protected async submitModule(): Promise<void> {
    this.moduleForm.markAllAsTouched();
    this.formError.set(null);
    if (this.moduleForm.invalid) {
      this.formError.set(this.lang.t('admin.curriculum.formError'));
      return;
    }
    const draft: ModuleDraft = this.moduleForm.getRawValue();
    const ok = await this.store.saveModule(draft, this.editingModuleId() ?? undefined);
    if (ok) this.moduleDialogOpen.set(false);
  }

  // ── Lesson dialog ──────────────────────────────────────────────────────────

  protected openCreateLesson(module: AdminModule): void {
    this.store.clearActionError();
    this.editingLessonId.set(null);
    this.lessonModuleId.set(module.id);
    this.lessonModuleTitle.set(module.title);
    this.formError.set(null);
    this.lessonForm.reset({
      title: '',
      contentText: '',
      videoUrl: '',
      position: this.nextLessonPosition(module),
      durationSeconds: 0,
    });
    this.lessonDialogOpen.set(true);
  }

  protected openEditLesson(module: AdminModule, lesson: AdminLesson): void {
    this.store.clearActionError();
    this.editingLessonId.set(lesson.id);
    this.lessonModuleId.set(module.id);
    this.lessonModuleTitle.set(module.title);
    this.formError.set(null);
    this.lessonForm.reset({
      title: lesson.title,
      contentText: lesson.contentText ?? '',
      videoUrl: lesson.videoUrl ?? '',
      position: lesson.position,
      durationSeconds: lesson.durationSeconds ?? 0,
    });
    this.lessonDialogOpen.set(true);
  }

  protected closeLessonDialog(): void {
    this.store.clearActionError();
    this.lessonDialogOpen.set(false);
  }

  protected async submitLesson(): Promise<void> {
    const moduleId = this.lessonModuleId();
    if (!moduleId) return;
    this.lessonForm.markAllAsTouched();
    this.formError.set(null);
    if (this.lessonForm.invalid) {
      this.formError.set(this.lang.t('admin.curriculum.formError'));
      return;
    }
    const draft: LessonDraft = this.lessonForm.getRawValue();
    const ok = await this.store.saveLesson(draft, moduleId, this.editingLessonId() ?? undefined);
    if (ok) this.lessonDialogOpen.set(false);
  }

  // ── Row actions ────────────────────────────────────────────────────────────

  protected deactivateModule(module: AdminModule): void {
    void this.store.deactivateModule(module.id);
  }

  protected reactivateModule(module: AdminModule): void {
    void this.store.reactivateModule(module.id);
  }

  protected deactivateLesson(lesson: AdminLesson): void {
    void this.store.deactivateLesson(lesson.id);
  }

  protected reactivateLesson(lesson: AdminLesson): void {
    void this.store.reactivateLesson(lesson.id);
  }

  /** Suggest the next module position (max existing + 1) for a new module. */
  private nextModulePosition(): number {
    const positions = this.store.modules().map((m) => m.position);
    return positions.length ? Math.max(...positions) + 1 : 0;
  }

  /** Suggest the next lesson position within a module. */
  private nextLessonPosition(module: AdminModule): number {
    const positions = module.lessons.map((l) => l.position);
    return positions.length ? Math.max(...positions) + 1 : 0;
  }
}

export default AdminCurriculumPage;
