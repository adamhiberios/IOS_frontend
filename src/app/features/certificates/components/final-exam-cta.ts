import {
  type ComponentRef,
  DestroyRef,
  Directive,
  ViewContainerRef,
  computed,
  inject,
  input,
} from '@angular/core';

import { FinalExamAccessStore } from '../data-access/final-exam.store';
import { FinalExamLinkDialog, type FinalExamLinkDialogMode } from './final-exam-link-dialog';

/**
 * `[iosFinalExamCta]` — turns a button into the "Start final exam" action
 * (IDD-343):
 *
 * 1. Opens a confirmation: the Final Exam link will be emailed to the
 *    student's registered address. Cancel closes it and sends nothing.
 * 2. Confirm asks the backend to email it (`POST /exam/request-access`).
 * 3. The dialog then says the link was sent — or, when a still-valid link was
 *    emailed earlier, that it already was (the backend never issues a second
 *    one) — and to start the exam from the email. The student stays on the page.
 *
 * The emailed link opens `/assessments/start?t=…` directly; there is no
 * code-entry step any more.
 *
 * A directive (not a component) so every CTA keeps its own Figma styling. A
 * failed request closes the dialog and is rendered by the host page via the
 * exported reference:
 *
 * ```html
 * <button type="button" [iosFinalExamCta]="certId" #cta="iosFinalExamCta">…</button>
 * @if (cta.error(); as message) { <p role="alert">{{ message }}</p> }
 * ```
 *
 * Disabled until the certId is known (progress/curriculum still loading) and
 * while a request is in flight, so a double click cannot send two emails.
 */
@Directive({
  selector: 'button[iosFinalExamCta]',
  exportAs: 'iosFinalExamCta',
  providers: [FinalExamAccessStore],
  host: {
    '(click)': 'onClick()',
    '[disabled]': 'disabled()',
    '[attr.aria-busy]': 'requesting()',
  },
})
export class FinalExamCta {
  private readonly store = inject(FinalExamAccessStore);
  private readonly viewContainer = inject(ViewContainerRef);

  /** Backend certificate UUID; `null`/`undefined` while it is still loading. */
  readonly certId = input.required<string | null | undefined>({ alias: 'iosFinalExamCta' });

  readonly requesting = this.store.requesting;
  readonly error = this.store.error;

  protected readonly disabled = computed(() => !this.certId() || this.requesting());

  private dialog: ComponentRef<FinalExamLinkDialog> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.closeDialog());
  }

  protected onClick(): void {
    if (!this.certId()) return;
    this.openDialog('confirm');
  }

  private openDialog(mode: FinalExamLinkDialogMode): void {
    this.closeDialog();
    const ref = this.viewContainer.createComponent(FinalExamLinkDialog);
    ref.setInput('mode', mode);
    ref.instance.confirmed.subscribe(() => void this.sendLink());
    ref.instance.closed.subscribe(() => this.closeDialog());
    this.dialog = ref;
  }

  private async sendLink(): Promise<void> {
    const certId = this.certId();
    if (!certId || this.requesting()) return;
    this.dialog?.setInput('mode', 'sending');

    const result = await this.store.request(certId);
    if (!result) {
      // The reason renders under the button (see `error`).
      this.closeDialog();
      return;
    }
    this.dialog?.setInput('mode', result.alreadySent ? 'alreadySent' : 'sent');
  }

  private closeDialog(): void {
    this.dialog?.destroy();
    this.dialog = null;
  }
}
