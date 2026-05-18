import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';

/**
 * Visual states the input renders. Resolved automatically from the bound
 * FormControl, but `state` can also be passed in directly for previews.
 */
export type InputState = 'default' | 'error' | 'success';

const BASE_CLASSES =
  'mt-1 w-full h-11 px-3 rounded-lg bg-gray-50 text-sm text-ios-brand-dark ' +
  'placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2';

const STATE_CLASSES: Record<InputState, string> = {
  default: 'border border-gray-200 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary',
  error: 'border border-ios-brand-primary focus:ring-ios-brand-primary/40',
  success: 'border border-emerald-500 focus:ring-emerald-500/40',
};

/**
 * `ios-input` — a label + input pair with validation states.
 *
 * Usage:
 *   <ios-input
 *     label="First name"
 *     id="firstName"
 *     [control]="form.controls.firstName"
 *     errorText="First name is required." />
 *
 * Design rules baked in (CLAUDE.md §3, §6, §9):
 *  - `for` ↔ `id` is enforced, never relies on label-wraps-input.
 *  - Error message is wired via `aria-describedby` + `aria-invalid` only when the
 *    control is in an error state, so screen readers don't yell on first paint.
 *  - The label sits at `mt-1` per the user's design rule.
 *  - All visuals use semantic brand tokens — no hex codes in this template.
 */
@Component({
  selector: 'ios-input',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="id()" class="mt-1 block text-sm font-medium text-ios-brand-dark">
      {{ label() }}
      @if (required()) {
        <span aria-hidden="true" class="text-ios-brand-primary">*</span>
      }
    </label>

    <input
      [id]="id()"
      [type]="type()"
      [placeholder]="placeholder()"
      [autocomplete]="autocomplete()"
      [formControl]="resolvedControl"
      [attr.aria-invalid]="resolvedState() === 'error' ? 'true' : null"
      [attr.aria-describedby]="describedById()"
      [attr.aria-required]="required() ? 'true' : null"
      [class]="inputClasses()"
    />

    @if (resolvedState() === 'error' && errorText()) {
      <p [id]="id() + '-error'" role="alert" class="mt-1 text-xs text-ios-brand-primary">
        {{ errorText() }}
      </p>
    }
  `,
})
export class Input {
  /** Required: must be globally unique on the page for label/input wiring. */
  readonly id = input.required<string>();
  readonly label = input.required<string>();

  readonly type = input<'text' | 'email' | 'password' | 'tel' | 'url'>('text');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('off');
  readonly required = input<boolean>(false);

  /** Optional explicit override; otherwise derived from the bound control. */
  readonly state = input<InputState | null>(null);
  readonly errorText = input<string>('');

  /**
   * Bind a typed FormControl from the parent. We intentionally do not implement
   * ControlValueAccessor here — the page composes via reactive forms and gets
   * the parent's typed access for free.
   */
  readonly control = input<FormControl<string> | null>(null);

  /** Local fallback for cases where no FormControl is passed (rare). */
  private readonly fallback = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Resolves control input to a non-null FormControl for [formControl]. */
  protected get resolvedControl(): FormControl<string> {
    return this.control() ?? this.fallback;
  }

  /**
   * Bridges the bound control's lifecycle events (status / touched / dirty /
   * value / pristine) into a signal so `resolvedState` actually re-runs under
   * zoneless change detection.
   *
   * Reading `c.touched` / `c.invalid` directly inside a `computed()` would
   * memoize the first value — none of those properties are signals, so the
   * computed never sees them flip. Subscribing to `AbstractControl.events`
   * gives the computed a tracked signal dependency, and `switchMap` swaps
   * subscriptions when the consumer rebinds a different FormControl.
   */
  private readonly controlTick = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c?.events ?? EMPTY)),
    { initialValue: null },
  );

  /**
   * `state` input wins; otherwise the bound control's touched + invalid state
   * decides between error / default. Success is opt-in (explicit `state="success"`)
   * to keep the form quiet on first paint.
   */
  protected readonly resolvedState = computed<InputState>(() => {
    // Establish a tracked dep on the form control's event stream so this
    // computed re-runs on blur, value-change, etc. The value itself is
    // unused — we only care about the invalidation pulse.
    this.controlTick();

    const explicit = this.state();
    if (explicit) {
      return explicit;
    }
    const c = this.control();
    if (!c) {
      return 'default';
    }
    if ((c.touched || c.dirty) && c.invalid) {
      return 'error';
    }
    return 'default';
  });

  protected readonly inputClasses = computed(
    () => `${BASE_CLASSES} ${STATE_CLASSES[this.resolvedState()]}`,
  );

  protected readonly describedById = computed(() =>
    this.resolvedState() === 'error' && this.errorText() ? `${this.id()}-error` : null,
  );
}
