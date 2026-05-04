/**
 * `ios-select` — custom dropdown select component matching the language-selector style.
 *
 * Uses a button-triggered popover instead of a native `<select>` so options can
 * be styled consistently across the app. The selected value is synced to the
 * bound FormControl.
 *
 * Usage:
 *   <ios-select
 *     id="subject"
 *     label="Subject"
 *     [options]="subjectOptions"
 *     placeholder="Select a subject"
 *     [control]="form.controls.subject"
 *   />
 */

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';
import { LucideCheck, LucideChevronDown } from '@lucide/angular';

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
  providers: [provideIcons(LucideChevronDown, LucideCheck)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <label [attr.for]="id()" class="block text-sm font-heading font-medium text-ios-brand-dark">
        {{ label() }}
        @if (required()) {
          <span aria-hidden="true" class="text-ios-brand-primary">*</span>
        }
      </label>

      <!-- Trigger button -->
      <button
        type="button"
        [id]="id()"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="true"
        [attr.aria-invalid]="resolvedState() === 'error' ? 'true' : null"
        [attr.aria-describedby]="describedById()"
        [class]="triggerClasses()"
      >
        <span class="flex-1 truncate" [class.text-gray-400]="!selectedValue()">
          {{ selectedValue() ?? placeholder() }}
        </span>
        <ios-icon name="chevron-down" class="w-5 h-5 text-ios-fg-7 flex-shrink-0" />
      </button>

      <!-- Dropdown popover -->
      @if (isOpen()) {
        <div
          class="absolute start-0 mt-2 w-full rounded-xl bg-white border border-gray-200 shadow-lg py-1 z-50"
          role="listbox"
        >
          @for (option of options(); track option.value) {
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
              [class.bg-gray-50]="option.value === resolvedControl.value"
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
      }

      <!-- Error message -->
      @if (resolvedState() === 'error' && errorText()) {
        <p [id]="id() + '-error'" role="alert" class="mt-1 text-xs text-ios-brand-primary">
          {{ errorText() }}
        </p>
      }
    </div>
  `,
  host: {
    '(document:click)': 'onOutsideClick($event)',
  },
})
export class Select {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input<string>('');
  readonly required = input<boolean>(false);

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

  readonly selected = output<string>();

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
    this.isOpen.update((v) => !v);
  }

  select(value: string): void {
    const option = this.options().find((o) => o.value === value);
    if (option?.disabled) return;
    this.resolvedControl.setValue(value);
    this.isOpen.set(false);
    this.selected.emit(value);
  }

  onOutsideClick(event: Event): void {
    if (!this.isOpen()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('ios-select')) {
      this.isOpen.set(false);
    }
  }
}
