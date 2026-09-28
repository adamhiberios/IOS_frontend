import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, inject, output } from '@angular/core';

/**
 * `(iosDialogEscape)` — the Escape key closes the dialog it sits on (IDD-396).
 *
 * Put it on a dialog's root element and bind it to whatever the dialog's
 * Cancel / Close button does:
 *
 *   <div role="dialog" aria-modal="true" (iosDialogEscape)="closeDialog()">
 *
 * One convention for every window in the app:
 *
 * - **Works wherever focus is.** It listens on the window, not on the panel, so
 *   Escape closes the dialog even when focus is still on the page behind it
 *   (the usual case right after it opens).
 * - **Only the top dialog closes.** Open dialogs form a stack; Escape goes to
 *   the most recently opened one — a confirmation over an edit dialog closes
 *   alone.
 * - **Inner popups first.** A select or dropdown open inside the dialog closes
 *   itself on Escape and marks the event handled (`preventDefault`), so the
 *   same keypress does not also close the dialog. Listening on `window` runs
 *   after their document-level listeners, which is what makes that check work.
 *
 * Leave it off a dialog with no neutral way out (e.g. the mock exam's
 * time's-up dialog, whose buttons are "Exit exam" and "Add time").
 */
@Directive({
  selector: '[iosDialogEscape]',
})
export class DialogEscape {
  /** Escape was pressed while this is the top-most open dialog. */
  readonly iosDialogEscape = output<void>();

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    openDialogs.push(this);
    if (openDialogs.length === 1) win?.addEventListener('keydown', onKeydown);

    inject(DestroyRef).onDestroy(() => {
      const i = openDialogs.lastIndexOf(this);
      if (i !== -1) openDialogs.splice(i, 1);
      if (openDialogs.length === 0) win?.removeEventListener('keydown', onKeydown);
    });
  }
}

/** Open dialogs, oldest first — the last one owns Escape. */
const openDialogs: DialogEscape[] = [];

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
  const top = openDialogs.at(-1);
  if (!top) return;
  event.preventDefault();
  top.iosDialogEscape.emit();
}
