import { Directive, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { FinalExamAccessStore } from '../data-access/final-exam.store';

/**
 * `[iosFinalExamCta]` — turns a button into the "Start final exam" action:
 * asks the backend to email the one-time access code (`POST /exam/request-access`),
 * then routes to the code-entry page with a "code sent" notice.
 *
 * A directive (not a component) so every CTA keeps its own Figma styling. The
 * host page renders the failure itself via the exported reference:
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
  private readonly router = inject(Router);

  /** Backend certificate UUID; `null`/`undefined` while it is still loading. */
  readonly certId = input.required<string | null | undefined>({ alias: 'iosFinalExamCta' });

  readonly requesting = this.store.requesting;
  readonly error = this.store.error;
  protected readonly disabled = computed(() => !this.certId() || this.requesting());

  protected async onClick(): Promise<void> {
    const certId = this.certId();
    if (!certId) return;
    if (await this.store.request(certId)) {
      void this.router.navigate(['/assessments/verify'], { queryParams: { codeSent: 1 } });
    }
  }
}
