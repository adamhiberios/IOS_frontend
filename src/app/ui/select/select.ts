/**
 * `ios-select` — custom dropdown select component matching the language-selector style.
 *
 * Uses a button-triggered popover instead of a native `<select>` so options can
 * be styled consistently across the app. The selected value is synced to the
 * bound FormControl.
 *
 * Improvements (v2):
 *   - `label` is now optional; pass an empty string (or omit) to suppress the
 *     label element — useful when the parent supplies its own `<label>` or
 *     `<legend>` (e.g. the birthday field group in complete-account).
 *   - The dropdown list is capped at `max-h-56` with `overflow-y-auto` so a
 *     long option list never pushes page content down.
 *   - A filter/search `<input>` is rendered at the top of the popover and
 *     automatically cleared when the popover closes. Options are filtered
 *     case-insensitively against the query.
 *
 * Usage:
 *   <ios-select
 *     id="subject"
 *     label="Subject"
 *     [options]="subjectOptions"
 *     placeholder="Select a subject"
 *     [control]="form.controls.subject"
 *   />
 *
 *   <!-- no visible label (birthday day inside a <fieldset>) -->
 *   <ios-select
 *     id="birthDay"
 *     label=""
 *     placeholder="Day"
 *     [options]="days"
 *     [control]="form.controls.birthDay"
 *   />
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';
import { LucideCheck, LucideChevronDown, LucideSearch } from '@lucide/angular';

import { IosIcon } from '../icon/icon';
import { provideIcons } from '../icon/icon-registry';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectState = 'default' | 'error' | 'success';

const BASE_CLASSES =
  'w-full h-12 px-4 rounded-lg bg-gray-50 text-sm text-ios-brand-dark ' +
  'border transition-colors focus:outline-none focus:ring-2 text-start';

const STATE_CLASSES: Record<SelectState, string> = {
  default: 'border-gray-200 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary',
  error: 'border-ios-brand-primary focus:ring-ios-brand-primary/40',
  success: 'border-emerald-500 focus:ring-emerald-500/40',
};

@Component({
  selector: 'ios-select',
  imports: [IosIcon, ReactiveFormsModule],
  providers: [provideIcons(LucideChevronDown, LucideCheck, LucideSearch)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <!-- Label — only rendered when a non-empty label is provided -->
      @if (label()) {
        <label
          [attr.for]="id()"
          class="block text-sm font-heading font-medium text-ios-brand-dark text-start mb-1"
        >
          {{ label() }}
          @if (required()) {
            <span aria-hidden="true" class="text-ios-brand-primary">*</span>
          }
        </label>
      }

      <!-- Trigger button -->
      <button
        type="button"
        [id]="id()"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-label]="label() || placeholder()"
        [attr.aria-invalid]="resolvedState() === 'error' ? 'true' : null"
        [attr.aria-describedby]="describedById()"
        [class]="triggerClasses()"
      >
        <span class="flex-1 truncate" [class.text-gray-400]="!selectedValue()">
          {{ selectedValue() ?? placeholder() }}
        </span>
        <ios-icon
          name="chevron-down"
          class="w-5 h-5 text-ios-fg-7 flex-shrink-0 transition-transform duration-200"
          [class.rotate-180]="isOpen()"
        />
      </button>

      <!-- Dropdown popover -->
      @if (isOpen()) {
        <div
          class="absolute start-0 top-full mt-1 w-full rounded-xl bg-white
                 border border-gray-200 shadow-xl z-[200] flex flex-col"
          role="listbox"
          [attr.aria-label]="label() || placeholder()"
        >
          <!-- Search / filter input -->
          <div class="p-2 border-b border-gray-100">
            <div class="flex items-center gap-2 px-3 h-9 rounded-lg bg-gray-50 border border-gray-200">
              <ios-icon name="search" class="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                [placeholder]="searchPlaceholder()"
                [value]="filterQuery()"
                (input)="filterQuery.set($any($event.target).value)"
                class="flex-1 min-w-0 bg-transparent text-sm text-ios-brand-dark
                       placeholder:text-gray-400
                       outline-none ring-0 border-0
                       focus:outline-none focus:ring-0 focus:border-0"
                style="box-shadow: none; outline: none"
                aria-label="Filter options"
                autocomplete="off"
              />
              @if (filterQuery()) {
                <button
                  type="button"
                  (click)="clearFilter()"
                  class="text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label="Clear filter"
                >
                  ×
                </button>
              }
            </div>
          </div>

          <!-- Options list — scrollable, capped at ~7 items -->
          <div class="overflow-y-auto max-h-52 py-1" role="group">
            @if (filteredOptions().length === 0) {
              <p class="px-4 py-3 text-sm text-gray-400 text-center">No results</p>
            }
            @for (option of filteredOptions(); track option.value) {
              <button
                type="button"
                role="option"
                [attr.aria-selected]="option.value === resolvedControl.value"
                [attr.aria-disabled]="option.disabled || null"
                (click)="select(option.value)"
                class="w-full px-4 py-2 text-start text-sm font-medium
                       hover:bg-gray-50 transition-colors
                       flex items-center justify-between gap-2"
                [class.text-ios-brand-primary]="option.value === resolvedControl.value"
                [class.bg-ios-brand-primary-soft]="option.value === resolvedControl.value"
                [class.pointer-events-none]="option.disabled"
                [class.opacity-50]="option.disabled"
              >
                <span>{{ option.label }}</span>
                @if (option.value === resolvedControl.value) {
                  <ios-icon name="check" class="w-4 h-4 flex-shrink-0 text-ios-brand-primary" />
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- Error message -->
      @if (resolvedState() === 'error' && errorText()) {
        <p [id]="id() + '-error'" role="alert" class="mt-1 text-xs text-ios-brand-primary text-start">
          {{ errorText() }}
        </p>
      }
    </div>
  `,
  host: {
    '(document:click)': 'onOutsideClick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class Select {
  /** Used by `onOutsideClick` to test containment against THIS instance only. */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);

  readonly id = input.required<string>();
  /** Pass an empty string to suppress the label element. */
  readonly label = input<string>('');
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input<string>('');
  readonly required = input<boolean>(false);
  /** Translated placeholder for the search/filter input inside the dropdown. */
  readonly searchPlaceholder = input<string>('Search…');

  readonly state = input<SelectState | null>(null);
  readonly errorText = input<string>('');

  readonly control = input<FormControl<string> | null>(null);

  private readonly fallback = new FormControl<string>('', { nonNullable: true });

  protected get resolvedControl(): FormControl<string> {
    return this.control() ?? this.fallback;
  }

  private readonly controlTick = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c?.events ?? EMPTY)),
    { initialValue: null },
  );

  protected readonly isOpen = signal(false);
  protected readonly filterQuery = signal('');

  readonly selected = output<string>();

  /** Options filtered by the current search query (case-insensitive). */
  protected readonly filteredOptions = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const all = this.options();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  });

  protected readonly resolvedState = computed<SelectState>(() => {
    this.controlTick();
    const explicit = this.state();
    if (explicit) return explicit;
    const c = this.control();
    if (!c) return 'default';
    if ((c.touched || c.dirty) && c.invalid) return 'error';
    return 'default';
  });

  protected readonly triggerClasses = computed(
    () =>
      `flex items-center justify-between gap-2 ${BASE_CLASSES} ${STATE_CLASSES[this.resolvedState()]}`,
  );

  protected readonly selectedValue = computed(() => {
    this.controlTick();
    const val = this.resolvedControl.value;
    if (!val) return null;
    const found = this.options().find((o) => o.value === val);
    return found?.label ?? val;
  });

  protected readonly describedById = computed(() => {
    this.controlTick();
    return this.resolvedState() === 'error' && this.errorText() ? `${this.id()}-error` : null;
  });

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.isOpen.set(true);
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.filterQuery.set('');
  }

  clearFilter(): void {
    this.filterQuery.set('');
  }

  select(value: string): void {
    const option = this.options().find((o) => o.value === value);
    if (option?.disabled) return;
    this.resolvedControl.setValue(value);
    this.resolvedControl.markAsTouched();
    this.close();
    this.selected.emit(value);
  }

  onOutsideClick(event: Event): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    // Close if the click originated outside THIS component's host element.
    // Checking `.contains()` on the concrete host rather than `closest('ios-select')`
    // ensures that clicking a *sibling* ios-select also closes this one.
    if (!this.hostEl.nativeElement.contains(target)) {
      this.close();
    }
  }
}
