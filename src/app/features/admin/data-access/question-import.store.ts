import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminQuestionImportApi } from './question-import.api';
import {
  IMPORT_MAX_FILE_BYTES,
  type ImportCommitResult,
  type ImportPreview,
  type ImportTarget,
} from './question-import.model';

/**
 * Where the import wizard currently is.
 *
 *   idle       — nothing picked yet
 *   previewing — upload in flight
 *   reviewing  — a report is on screen (may or may not be committable)
 *   committing — apply in flight
 *   committed  — applied; undo still available
 *   undoing    — undo in flight
 *   undone     — rolled back
 */
export type ImportPhase =
  | 'idle'
  | 'previewing'
  | 'reviewing'
  | 'committing'
  | 'committed'
  | 'undoing'
  | 'undone';

/**
 * Signal store for the bulk question-import wizard.
 *
 * Owns the two-phase flow: `preview` validates and stages a file (writing
 * nothing), `commit` applies the staged batch, `undo` rolls it back. Business
 * rules live here; the dialog only binds signals.
 *
 * Root-provided like every other admin store, so {@link reset} is called each
 * time the dialog opens — one wizard is on screen at a time, and carrying a
 * previous file's report into a fresh run would be misleading.
 */
@Injectable({ providedIn: 'root' })
export class AdminQuestionImportStore {
  private readonly api = inject(AdminQuestionImportApi);
  private readonly lang = inject(LanguageService);

  private readonly _target = signal<ImportTarget>('exam');
  private readonly _targetId = signal('');
  private readonly _phase = signal<ImportPhase>('idle');
  private readonly _fileName = signal('');
  private readonly _preview = signal<ImportPreview | null>(null);
  private readonly _commit = signal<ImportCommitResult | null>(null);
  private readonly _deleted = signal<number | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _templateBusy = signal(false);

  readonly phase = this._phase.asReadonly();
  readonly fileName = this._fileName.asReadonly();
  readonly preview = this._preview.asReadonly();
  readonly commitResult = this._commit.asReadonly();
  readonly deletedCount = this._deleted.asReadonly();
  readonly error = this._error.asReadonly();
  readonly templateBusy = this._templateBusy.asReadonly();
  readonly target = this._target.asReadonly();

  readonly report = computed(() => this._preview()?.report ?? null);
  readonly busy = computed(() => ['previewing', 'committing', 'undoing'].includes(this._phase()));

  /** A clean file that produced a staging token — the only committable state. */
  readonly canCommit = computed(() => {
    const preview = this._preview();
    return this._phase() === 'reviewing' && preview !== null && preview.importId !== null;
  });

  /** A report exists but the file has blocking problems. */
  readonly hasErrors = computed(() => (this.report()?.errorCount ?? 0) > 0);

  /** Point the wizard at a destination and clear any previous run. */
  open(target: ImportTarget, targetId: string): void {
    this._target.set(target);
    this._targetId.set(targetId);
    this.reset();
  }

  /** Drop all per-run state, keeping the destination. */
  reset(): void {
    this._phase.set('idle');
    this._fileName.set('');
    this._preview.set(null);
    this._commit.set(null);
    this._deleted.set(null);
    this._error.set(null);
  }

  /**
   * Download the .xlsx template for the current target and hand it to the
   * browser as a file save.
   *
   * The object URL is revoked immediately after the synthetic click: the
   * browser has already taken its own reference to the blob by then, and
   * leaving it alive would pin the buffer in memory for the page's lifetime.
   */
  async downloadTemplate(): Promise<void> {
    if (this._templateBusy()) return;
    this._templateBusy.set(true);
    this._error.set(null);
    try {
      const target = this._target();
      const blob = await firstValueFrom(this.api.downloadTemplate(target));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `question-import-template-${target}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this._error.set(
        problemDetailMessage(err) ?? this.lang.t('admin.questionImport.templateError'),
      );
    } finally {
      this._templateBusy.set(false);
    }
  }

  /**
   * Validate and stage a file. Writes nothing to the database.
   *
   * A report with errors is a normal outcome, not a failure: it lands in
   * `reviewing` with {@link hasErrors} true and no `importId`. Only an
   * unreadable file or an unwritable destination sets {@link error}.
   */
  async previewFile(file: File): Promise<void> {
    if (this.busy()) return;

    // The backend rejects oversized uploads anyway; checking here turns a
    // wasted round trip into an instant, specific message.
    if (file.size > IMPORT_MAX_FILE_BYTES) {
      this._error.set(
        this.lang.t('admin.questionImport.fileTooLarge', {
          limit: Math.floor(IMPORT_MAX_FILE_BYTES / 1024 / 1024),
        }),
      );
      return;
    }

    this._fileName.set(file.name);
    this._error.set(null);
    this._preview.set(null);
    this._commit.set(null);
    this._deleted.set(null);
    this._phase.set('previewing');

    try {
      const preview = await firstValueFrom(
        this.api.preview(this._target(), this._targetId(), file),
      );
      this._preview.set(preview);
      this._phase.set('reviewing');
    } catch (err) {
      this._error.set(
        problemDetailMessage(err) ?? this.lang.t('admin.questionImport.previewError'),
      );
      this._phase.set('idle');
    }
  }

  /** Apply the staged import. No-op unless {@link canCommit}. */
  async commit(): Promise<boolean> {
    const importId = this._preview()?.importId;
    if (!this.canCommit() || !importId) return false;

    this._error.set(null);
    this._phase.set('committing');
    try {
      this._commit.set(
        await firstValueFrom(this.api.commit(this._target(), this._targetId(), importId)),
      );
      this._phase.set('committed');
      return true;
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.questionImport.commitError'));
      // Back to the report so the admin can read the reason and retry or close.
      this._phase.set('reviewing');
      return false;
    }
  }

  /** Roll back the committed batch. No-op outside the `committed` phase. */
  async undo(): Promise<boolean> {
    const committed = this._commit();
    if (this._phase() !== 'committed' || committed === null) return false;

    this._error.set(null);
    this._phase.set('undoing');
    try {
      const result = await firstValueFrom(
        this.api.undo(this._target(), this._targetId(), committed.importId),
      );
      this._deleted.set(result.deleted);
      this._phase.set('undone');
      return true;
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.questionImport.undoError'));
      this._phase.set('committed');
      return false;
    }
  }
}
