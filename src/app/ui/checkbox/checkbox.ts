import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCheck } from '@lucide/angular';

/**
 * `ios-checkbox` — a 24×24 square that renders **flat-black filled** with a
 * crisp check glyph when on, and as a thin-bordered empty square when off.
 *
 * Visual contract (per design):
 *   - 24×24 px box, slight `rounded-[6px]` corner softening.
 *   - Unchecked: white surface, `border-gray-300`, empty.
 *   - Checked:   white surface (still empty), border darkens to
 *     `border-ios-brand-dark`, and a flat dark Lucide `check` glyph
 *     (`text-ios-brand-dark`) is rendered inset to the inner ~75% area — i.e.
 *     the glyph occupies the area between 12.5% and 87.5% on each axis.
 *
 * Accessibility:
 *   - The interactive control is a native `<input type="checkbox">` so screen
 *     readers, the keyboard, and form autofill all work. We `peer sr-only`
 *     it and paint a custom box as its visual peer; `:focus-visible` on the
 *     real input drives a ring on the visual box.
 *   - The box is `aria-hidden` because the input itself carries the role.
 *   - Disabled state is wired through both DOM `disabled` and the visual
 *     opacity / cursor change.
 *
 * Form integration:
 *   - Implements `ControlValueAccessor` so consumers write
 *     `<ios-checkbox formControlName="privacy" label="…" />` with no glue.
 *   - Also supports template-driven `[(ngModel)]` and naked use via the
 *     `defaultChecked` input.
 */
@Component({
  selector: 'ios-checkbox',
  imports: [LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // forwardRef because the class is defined below this metadata block.
      useExisting: forwardRef(() => Checkbox),
      multi: true,
    },
  ],
  template: `
    <label
      class="inline-flex items-start gap-2"
      [class.cursor-pointer]="!disabledState()"
      [class.cursor-not-allowed]="disabledState()"
      [class.opacity-60]="disabledState()"
    >
      <input
        type="checkbox"
        [id]="id()"
        [name]="name() || id()"
        [checked]="checked()"
        [disabled]="disabledState()"
        [attr.aria-describedby]="describedBy() || null"
        (change)="onNativeChange($event)"
        (blur)="onTouched()"
        class="peer sr-only"
      />

      <!-- Visual box. aria-hidden because the real input owns the a11y tree. -->
      <span
        aria-hidden="true"
        class="relative shrink-0 w-5 h-5 rounded-[2px] border bg-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
               peer-focus-visible:ring-2
               peer-focus-visible:ring-ios-brand-primary/40
               peer-focus-visible:ring-offset-2"
        [class.border-ios-brand-dark]="checked()"
        [class.border-gray-300]="!checked()"
      >
        @if (checked()) {
          <!-- Inset glyph: 75% of the box (left/right/top/bottom 12.5%).
               Flat dark check on the empty (white) surface. -->
          <svg
            lucideCheck
            class="absolute inset-[12.5%] w-[75%] h-[75%] text-ios-brand-dark"
            stroke-width="2"
          ></svg>
        }
      </span>

      @if (label()) {
        <span class="text-sm text-gray-600 leading-snug select-none">
          <ng-content />
          {{ label() }}
        </span>
      } @else {
        <span class="text-sm text-gray-600 leading-snug select-none">
          <ng-content />
        </span>
      }
    </label>
  `,
})
export class Checkbox implements ControlValueAccessor {
  /** DOM id for the underlying input. Pair with an external `<label for=…>`
   * if you skip the built-in label slot. */
  readonly id = input<string>('');

  /** Optional `name` attribute. Defaults to `id` when omitted. */
  readonly name = input<string>('');

  /** Inline label text. Prefer this for short copy; use content projection for
   * rich content (links, `<strong>`, etc.). */
  readonly label = input<string>('');

  /** id of an external description element (e.g. a `role="alert"` error). */
  readonly describedBy = input<string>('');

  /** Initial checked state for naked (non-form-bound) usage. */
  readonly defaultChecked = input<boolean>(false);

  /** Internal mirror of the form/native value. Private so consumers go through
   * the form control or `defaultChecked` rather than mutating directly. */
  private readonly _checked = signal(false);

  /** Public read-only view of the checked state for the template. */
  protected readonly checked = computed(() => this._checked());

  /** Disabled flag — driven either by the parent form (`setDisabledState`) or
   * a future `disabled` input if we add one. */
  private readonly _disabled = signal(false);
  protected readonly disabledState = computed(() => this._disabled());

  /* ------------------------------------------------------------------------
   * ControlValueAccessor plumbing.
   * ---------------------------------------------------------------------- */

  /** Set by Angular forms via `registerOnChange`. Defaults to a no-op so the
   * component still works without a form binding. */
  private onChange: (value: boolean) => void = () => undefined;

  /** Set by Angular forms via `registerOnTouched`. Public so the template can
   * call it on blur. */
  protected onTouched: () => void = () => undefined;

  constructor() {
    // Honour `defaultChecked` for naked usage — Angular forms will overwrite
    // via `writeValue` immediately if a control is bound, so this is safe.
    queueMicrotask(() => {
      if (this.defaultChecked()) {
        this._checked.set(true);
      }
    });
  }

  writeValue(value: boolean | null | undefined): void {
    this._checked.set(Boolean(value));
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  /** Propagate native `change` events both to the internal signal (visual
   * state) and to the form's `onChange` callback (form value + dirty flag). */
  protected onNativeChange(event: Event): void {
    const next = (event.target as HTMLInputElement).checked;
    this._checked.set(next);
    this.onChange(next);
  }
}
