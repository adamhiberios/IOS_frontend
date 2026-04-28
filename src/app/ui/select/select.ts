import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectState = 'default' | 'error' | 'success';

const BASE_CLASSES =
  'w-full h-10 px-3 rounded-lg bg-gray-50 text-sm text-ios-brand-dark ' +
  'border transition-colors focus:outline-none focus:ring-2';

const STATE_CLASSES: Record<SelectState, string> = {
  default: 'border-gray-200 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary',
  error: 'border-ios-brand-primary focus:ring-ios-brand-primary/40',
  success: 'border-emerald-500 focus:ring-emerald-500/40',
};

@Component({
  selector: 'ios-select',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="id()" class="mt-1 block text-sm font-medium text-ios-brand-dark">
      {{ label() }}
      @if (required()) {
        <span aria-hidden="true" class="text-ios-brand-primary">*</span>
      }
    </label>

    <select
      [id]="id()"
      [formControl]="resolvedControl"
      [attr.aria-invalid]="resolvedState() === 'error' ? 'true' : null"
      [attr.aria-describedby]="describedById()"
      [attr.aria-required]="required() ? 'true' : null"
      [class]="selectClasses()"
    >
      @if (placeholder()) {
        <option value="" disabled [selected]="!resolvedControl.value">{{ placeholder() }}</option>
      }
      @for (option of options(); track option.value) {
        <option [value]="option.value" [disabled]="option.disabled">{{ option.label }}</option>
      }
    </select>

    @if (resolvedState() === 'error' && errorText()) {
      <p [id]="id() + '-error'" role="alert" class="mt-1 text-xs text-ios-brand-primary">
        {{ errorText() }}
      </p>
    }
  `,
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

  protected readonly resolvedState = computed<SelectState>(() => {
    const explicit = this.state();
    if (explicit) return explicit;
    const c = this.control();
    if (!c) return 'default';
    if ((c.touched || c.dirty) && c.invalid) return 'error';
    return 'default';
  });

  protected readonly selectClasses = computed(
    () => `${BASE_CLASSES} ${STATE_CLASSES[this.resolvedState()]}`,
  );

  protected readonly describedById = computed(() =>
    this.resolvedState() === 'error' && this.errorText() ? `${this.id()}-error` : null,
  );
}
