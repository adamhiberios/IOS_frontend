import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { Button } from '@ui';

import { AdminQuestionImportStore } from '../data-access/question-import.store';
import {
  IMPORT_FILE_ACCEPT,
  IMPORT_MAX_ROWS,
  type ImportPreviewOption,
  type ImportTarget,
  isOptionObject,
} from '../data-access/question-import.model';

/** One staged question flattened for display — see {@link QuestionImportDialog.previewRows}. */
interface PreviewRow {
  readonly sourceRow: number;
  readonly text: string;
  readonly meta: string;
  readonly options: readonly { readonly text: string; readonly correct: boolean }[];
  readonly freeTextAnswer: string | null;
}

/**
 * Bulk question-import wizard (backend `docs/question-import.md`).
 *
 * Drives the two-phase flow: upload → report → confirm → (optionally) undo.
 * Reused by all three admin question screens; the caller supplies the target
 * and its id (an exam id, a **certificate** id for mock, or a quiz id).
 *
 * **Nothing is written until the admin confirms.** The first upload only
 * validates and stages, so the report on screen is the last chance to catch a
 * file that parses cleanly but says the wrong thing — which is exactly what the
 * `preview` table below is for: it shows the answer key as it would be stored.
 *
 * Emits {@link imported} once questions actually land (and again after an undo)
 * so the host page can refresh its list without knowing the wizard's internals.
 */
@Component({
  selector: 'ios-question-import-dialog',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qi-title"
    >
      <div class="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 id="qi-title" class="text-lg font-semibold text-ios-brand-dark">
          {{ lang.t('admin.questionImport.title') }}
        </h2>
        <p class="mt-1 text-xs text-gray-500">
          {{ lang.t('admin.questionImport.subtitle.' + target()) }}
        </p>

        <!-- ── Step 1: pick a file ─────────────────────────────────────── -->
        @if (store.phase() === 'idle' || store.phase() === 'previewing') {
          <div class="mt-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
            <p class="text-sm text-gray-700">
              {{ lang.t('admin.questionImport.pickHint', { max: maxRows }) }}
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-3">
              <label
                for="qi-file"
                class="cursor-pointer rounded-lg bg-ios-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-within:ring-2 focus-within:ring-ios-brand-primary focus-within:ring-offset-2"
                [class.opacity-50]="store.busy()"
              >
                {{
                  store.phase() === 'previewing'
                    ? lang.t('admin.questionImport.checking')
                    : lang.t('admin.questionImport.chooseFile')
                }}
              </label>
              <input
                id="qi-file"
                type="file"
                class="sr-only"
                [accept]="accept"
                [disabled]="store.busy()"
                (change)="onFileSelected($event)"
              />

              <button
                type="button"
                [disabled]="store.templateBusy()"
                (click)="downloadTemplate()"
                class="text-sm text-ios-brand-primary underline disabled:opacity-50"
              >
                {{
                  store.templateBusy()
                    ? lang.t('admin.questionImport.templateDownloading')
                    : lang.t('admin.questionImport.downloadTemplate')
                }}
              </button>
            </div>

            @if (store.fileName()) {
              <p class="mt-3 text-xs text-gray-500">
                {{ lang.t('admin.questionImport.selectedFile') }}: {{ store.fileName() }}
              </p>
            }
          </div>

          @if (store.phase() === 'previewing') {
            <p class="mt-3 text-sm text-gray-500" role="status" aria-live="polite">
              {{ lang.t('admin.questionImport.checking') }}
            </p>
          }
        }

        <!-- ── Step 2: the report ──────────────────────────────────────── -->
        @if (store.report(); as report) {
          @if (store.phase() !== 'committed' && store.phase() !== 'undone') {
            <div class="mt-5">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                  {{ lang.t('admin.questionImport.rows', { count: report.totalRows }) }}
                </span>
                <span
                  class="rounded-full px-3 py-1"
                  [class.bg-green-50]="!store.hasErrors()"
                  [class.text-green-700]="!store.hasErrors()"
                  [class.bg-gray-100]="store.hasErrors()"
                  [class.text-gray-700]="store.hasErrors()"
                >
                  {{ lang.t('admin.questionImport.valid', { count: report.validRows }) }}
                </span>
                @if (report.errorCount > 0) {
                  <span class="rounded-full bg-red-50 px-3 py-1 text-red-700">
                    {{ lang.t('admin.questionImport.errors', { count: report.errorCount }) }}
                  </span>
                }
                @if (report.warningCount > 0) {
                  <span class="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
                    {{ lang.t('admin.questionImport.warnings', { count: report.warningCount }) }}
                  </span>
                }
              </div>

              @if (store.hasErrors()) {
                <p class="mt-3 text-sm text-red-700">
                  {{ lang.t('admin.questionImport.errorsIntro') }}
                </p>
              } @else {
                <p class="mt-3 text-sm text-green-700">
                  {{ lang.t('admin.questionImport.readyIntro', { count: report.validRows }) }}
                </p>
              }

              <!-- Blocking problems -->
              @if (report.errors.length > 0) {
                <div class="mt-3 overflow-x-auto rounded-lg border border-red-200">
                  <table class="w-full text-start text-sm">
                    <caption class="sr-only">
                      {{
                        lang.t('admin.questionImport.errorsCaption')
                      }}
                    </caption>
                    <thead class="bg-red-50 text-xs uppercase text-red-800">
                      <tr>
                        <th scope="col" class="px-3 py-2 text-start">
                          {{ lang.t('admin.questionImport.colRow') }}
                        </th>
                        <th scope="col" class="px-3 py-2 text-start">
                          {{ lang.t('admin.questionImport.colColumn') }}
                        </th>
                        <th scope="col" class="px-3 py-2 text-start">
                          {{ lang.t('admin.questionImport.colProblem') }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-red-100">
                      @for (issue of report.errors; track $index) {
                        <tr>
                          <td class="px-3 py-2 whitespace-nowrap text-gray-700">
                            {{ issue.row ?? '—' }}
                          </td>
                          <td class="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-600">
                            {{ issue.column ?? '—' }}
                          </td>
                          <td class="px-3 py-2 text-gray-800">{{ issue.message }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              <!-- Non-blocking observations -->
              @if (report.warnings.length > 0) {
                <details class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <summary class="cursor-pointer text-sm text-amber-900">
                    {{ lang.t('admin.questionImport.warnings', { count: report.warningCount }) }}
                  </summary>
                  <ul class="mt-2 space-y-1 text-xs text-amber-900">
                    @for (issue of report.warnings; track $index) {
                      <li>
                        @if (issue.row !== null) {
                          <span class="font-medium"
                            >{{ lang.t('admin.questionImport.colRow') }} {{ issue.row }}:
                          </span>
                        }
                        {{ issue.message }}
                      </li>
                    }
                  </ul>
                </details>
              }

              @if (report.truncated) {
                <p class="mt-2 text-xs text-gray-500">
                  {{ lang.t('admin.questionImport.truncated') }}
                </p>
              }

              <!-- What will actually be stored -->
              @if (previewRows().length > 0) {
                <details
                  class="mt-3 rounded-lg border border-gray-200 p-3"
                  [open]="!store.hasErrors()"
                >
                  <summary class="cursor-pointer text-sm text-gray-700">
                    {{ lang.t('admin.questionImport.previewToggle') }}
                  </summary>
                  <p class="mt-1 text-xs text-gray-500">
                    {{ lang.t('admin.questionImport.previewHint') }}
                  </p>
                  <ol class="mt-3 space-y-3">
                    @for (row of previewRows(); track row.sourceRow) {
                      <li class="rounded-lg bg-gray-50 p-3">
                        <p class="text-sm text-ios-brand-dark">{{ row.text }}</p>
                        @if (row.meta) {
                          <p class="mt-0.5 text-xs text-gray-500">{{ row.meta }}</p>
                        }
                        @if (row.freeTextAnswer !== null) {
                          <p class="mt-2 text-xs text-gray-700">
                            <span class="text-gray-500"
                              >{{ lang.t('admin.questionImport.answerLabel') }}:
                            </span>
                            {{ row.freeTextAnswer }}
                          </p>
                        } @else {
                          <ul class="mt-2 space-y-1">
                            @for (opt of row.options; track $index) {
                              <li
                                class="text-xs"
                                [class.text-green-700]="opt.correct"
                                [class.font-medium]="opt.correct"
                                [class.text-gray-600]="!opt.correct"
                              >
                                {{ opt.correct ? '✓' : '·' }} {{ opt.text }}
                              </li>
                            }
                          </ul>
                        }
                      </li>
                    }
                  </ol>
                </details>
              }
            </div>
          }
        }

        <!-- ── Step 3: applied ─────────────────────────────────────────── -->
        @if (store.phase() === 'committed' && store.commitResult(); as result) {
          <div class="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
            <p class="text-sm text-green-800">
              {{ lang.t('admin.questionImport.committed', { count: result.created }) }}
            </p>
            <p class="mt-1 text-xs text-green-700">
              {{ lang.t('admin.questionImport.undoHint') }}
            </p>
          </div>
        }

        @if (store.phase() === 'undone') {
          <div class="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p class="text-sm text-gray-700">
              {{ lang.t('admin.questionImport.undone', { count: store.deletedCount() ?? 0 }) }}
            </p>
          </div>
        }

        @if (store.error(); as message) {
          <p class="mt-4 text-sm text-red-600" role="alert">{{ message }}</p>
        }

        <!-- ── Actions ─────────────────────────────────────────────────── -->
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          @if (store.phase() === 'committed') {
            <ios-button
              variant="secondary"
              [loading]="store.phase() === 'undoing'"
              (clicked)="undo()"
            >
              {{ lang.t('admin.questionImport.undo') }}
            </ios-button>
            <ios-button variant="primary" (clicked)="close()">
              {{ lang.t('admin.questionImport.done') }}
            </ios-button>
          } @else if (store.phase() === 'undone') {
            <ios-button variant="primary" (clicked)="close()">
              {{ lang.t('admin.questionImport.close') }}
            </ios-button>
          } @else {
            <button
              type="button"
              [disabled]="store.busy()"
              (click)="close()"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {{ lang.t('admin.questionImport.cancel') }}
            </button>
            @if (store.canCommit()) {
              <ios-button
                variant="primary"
                [loading]="store.phase() === 'committing'"
                (clicked)="commit()"
              >
                {{
                  lang.t('admin.questionImport.import', {
                    count: store.report()?.validRows ?? 0,
                  })
                }}
              </ios-button>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class QuestionImportDialog {
  protected readonly store = inject(AdminQuestionImportStore);
  protected readonly lang = inject(LanguageService);

  protected readonly accept = IMPORT_FILE_ACCEPT;
  protected readonly maxRows = IMPORT_MAX_ROWS;

  /** Which bank to import into. Drives the copy and the request path. */
  readonly target = input.required<ImportTarget>();

  /** Exam id, certificate id (mock) or quiz id — see the API docs. */
  readonly targetId = input.required<string>();

  /** Raised when the dialog should be torn down. */
  readonly closed = output<void>();

  /**
   * Raised whenever the destination's question set changed — after a commit and
   * again after an undo — so the host can refetch. Distinct from {@link closed}
   * because the dialog stays open after a commit to offer the undo.
   */
  readonly imported = output<void>();

  /**
   * Flatten the two staged-question shapes into one display model.
   *
   * Exam/mock questions carry `{optionText,isCorrect}` objects; quiz questions
   * carry plain strings plus a literal `correctAnswer`, or no options at all
   * for free text. Normalizing here keeps the template free of type guards.
   */
  protected readonly previewRows = computed<PreviewRow[]>(() => {
    const preview = this.store.preview();
    if (preview === null) return [];

    return preview.preview.map((q): PreviewRow => {
      const meta = [
        q.questionType,
        q.marks !== undefined
          ? this.lang.t('admin.questionImport.marks', { count: q.marks })
          : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' · ');

      const raw = q.options ?? [];
      const options = raw.map((opt: ImportPreviewOption | string) =>
        isOptionObject(opt)
          ? { text: opt.optionText, correct: opt.isCorrect }
          : // Quiz options are plain strings; the answer key is the text itself.
            { text: opt, correct: opt === q.correctAnswer },
      );

      return {
        sourceRow: q.sourceRow,
        text: q.questionText,
        meta,
        options,
        // A quiz question with no options is free-text: show the answer alone.
        freeTextAnswer: options.length === 0 ? (q.correctAnswer ?? null) : null,
      };
    });
  });

  protected async downloadTemplate(): Promise<void> {
    await this.store.downloadTemplate();
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset immediately so re-picking the *same* file fires `change` again.
    input.value = '';
    if (!file) return;
    await this.store.previewFile(file);
  }

  protected async commit(): Promise<void> {
    if (await this.store.commit()) this.imported.emit();
  }

  protected async undo(): Promise<void> {
    if (await this.store.undo()) this.imported.emit();
  }

  protected close(): void {
    this.closed.emit();
  }
}

export default QuestionImportDialog;
