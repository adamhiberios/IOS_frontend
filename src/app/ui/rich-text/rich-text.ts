import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  type OnDestroy,
  ViewEncapsulation,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { type FormControl } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';
import Quill from 'quill';

/**
 * `ios-rich-text` — a WYSIWYG editor for authoring HTML content (blog articles,
 * etc.), bound to a reactive `FormControl<string>` just like {@link Input} (we
 * intentionally do **not** implement ControlValueAccessor, so the parent keeps
 * typed access).
 *
 * Wraps **Quill 2** (the most widely-used free rich-text editor; MIT). Quill is
 * framework-agnostic vanilla JS, so it sidesteps Angular-version peer-dependency
 * churn, and it renders its own toolbar. The enabled formats (H2/H3, bold,
 * italic, ordered/bulleted lists, blockquote, link) map 1:1 onto the public
 * `.ios-blog-prose` renderer.
 *
 * Value flow:
 *  - control → editor: the control's HTML is pasted in once on init (Quill's
 *    own parser normalises it — no raw `[innerHTML]`, CLAUDE.md §4).
 *  - editor → control: Quill's `text-change` writes the semantic HTML back.
 *
 * `ViewEncapsulation.None` lets the small sizing/brand rules below reach Quill's
 * dynamically-created `.ql-*` DOM; the base theme ships from `quill.snow.css`
 * (registered in `angular.json`). Rules are scoped under `.ios-rte` so they
 * don't leak elsewhere.
 */
@Component({
  selector: 'ios-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .ios-rte .ql-toolbar.ql-snow {
        border-color: var(--color-gray-200, #e5e7eb);
        border-start-start-radius: 0.5rem;
        border-start-end-radius: 0.5rem;
      }
      .ios-rte .ql-container.ql-snow {
        border-color: var(--color-gray-200, #e5e7eb);
        border-end-start-radius: 0.5rem;
        border-end-end-radius: 0.5rem;
        font-family: var(--font-body, sans-serif);
        font-size: 0.875rem;
      }
      .ios-rte .ql-editor {
        min-height: 12rem;
      }
      .ios-rte--error .ql-toolbar.ql-snow,
      .ios-rte--error .ql-container.ql-snow {
        border-color: var(--color-ios-brand-primary, #8b0000);
      }
    `,
  ],
  template: `
    <label [attr.for]="id()" class="mt-1 block text-sm font-medium text-ios-brand-dark">
      {{ label() }}
    </label>

    <div class="ios-rte mt-1" [class.ios-rte--error]="hasError()">
      <div #surface [id]="id()"></div>
    </div>

    @if (hasError() && errorText()) {
      <p [id]="id() + '-error'" role="alert" class="mt-1 text-xs text-ios-brand-primary">
        {{ errorText() }}
      </p>
    }
  `,
})
export class RichText implements AfterViewInit, OnDestroy {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');
  readonly control = input<FormControl<string> | null>(null);
  readonly errorText = input<string>('');

  private readonly surface = viewChild.required<ElementRef<HTMLDivElement>>('surface');

  private quill: Quill | null = null;

  /** Re-runs on the bound control's status events so `hasError` tracks touched/invalid. */
  private readonly controlTick = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c?.events ?? EMPTY)),
    { initialValue: null },
  );

  protected readonly hasError = computed<boolean>(() => {
    this.controlTick();
    const c = this.control();
    return !!c && (c.touched || c.dirty) && c.invalid;
  });

  ngAfterViewInit(): void {
    const quill = new Quill(this.surface().nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: [
          [{ header: 2 }, { header: 3 }],
          ['bold', 'italic'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'link'],
          ['clean'],
        ],
      },
    });
    this.quill = quill;

    const control = this.control();
    const initial = control?.value ?? '';
    if (initial.trim() !== '') {
      // Quill parses the stored HTML into its own model (safer than innerHTML).
      quill.clipboard.dangerouslyPasteHTML(initial);
    }

    quill.on('text-change', () => {
      const c = this.control();
      if (!c) return;
      const html = quill.getText().trim() === '' ? '' : quill.getSemanticHTML();
      c.setValue(html);
      c.markAsDirty();
    });

    quill.on('selection-change', (range) => {
      if (range === null) this.control()?.markAsTouched();
    });
  }

  ngOnDestroy(): void {
    this.quill = null;
  }
}
