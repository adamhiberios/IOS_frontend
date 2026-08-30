import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LanguageService } from '@core/i18n';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function forSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

@Component({
  selector: 'ios-dropdown',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
  template: `
    <label [attr.for]="id()" class="mt-1 block text-sm font-medium text-ios-brand-dark">
      {{ label() }}
      @if (required()) {
        <span aria-hidden="true" class="text-ios-brand-primary">*</span>
      }
    </label>

    <div class="relative">
      <button
        type="button"
        [id]="id()"
        [disabled]="disabled()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-controls]="listboxId()"
        [class]="triggerClasses()"
        (click)="toggle()"
        (keydown)="onKeydown($event)"
      >
        <span [class]="selectedLabel() ? 'text-ios-brand-dark' : 'text-gray-400'">
          {{ selectedLabel() || placeholder() }}
        </span>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform rtl:rotate-180"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      @if (isOpen()) {
        <div
          [id]="listboxId()"
          role="listbox"
          [attr.aria-labelledby]="id()"
          [attr.aria-expanded]="isOpen()"
          class="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          @if (searchable()) {
            <div class="p-2 border-b border-gray-100">
              <input
                #searchInput
                type="text"
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                [attr.aria-label]="lang.t('ui.searchPlaceholder')"
                [placeholder]="lang.t('ui.searchPlaceholder')"
                class="w-full h-11 px-3 text-sm rounded-md border border-gray-200 bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary
                       placeholder:text-gray-400"
                (keydown)="onSearchKeydown($event)"
              />
            </div>
          }

          <ul class="max-h-60 overflow-y-auto p-1">
            @if (filteredOptions().length === 0) {
              <li class="px-3 py-2 text-sm text-gray-400">{{ lang.t('ui.noOptionsFound') }}</li>
            }
            @for (option of filteredOptions(); track option.value; let idx = $index) {
              <li
                role="option"
                [id]="'option-' + option.value"
                [attr.aria-selected]="option.value === value()"
                [attr.tabindex]="option.disabled ? -1 : 0"
                [class]="optionClasses(option, idx)"
                (click)="select(option)"
                (keydown)="onOptionKeydown($event, option)"
              >
                {{ option.label }}
                @if (option.value === value()) {
                  <svg
                    class="w-4 h-4 text-ios-brand-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class Dropdown {
  private readonly el = inject(ElementRef);
  protected readonly lang = inject(LanguageService);

  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<DropdownOption[]>();
  readonly placeholder = input<string>('Select an option');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly searchable = input<boolean>(false);

  readonly value = model<string>('');
  readonly valueChange = output<string>();

  /** Search query. A signal, not a `FormControl` — `filteredOptions` is a
   *  `computed()`, and a control's `.value` is not reactive, so a control here
   *  would leave the list unfiltered under zoneless change detection. */
  readonly searchQuery = signal('');

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly isOpen = signal(false);
  readonly focusedIndex = signal(0);

  readonly listboxId = computed(() => `${this.id()}-listbox`);

  readonly filteredOptions = computed(() => {
    const search = forSearch(this.searchQuery().trim());
    if (!search) return this.options();
    return this.options().filter((o) => forSearch(o.label).startsWith(search));
  });

  readonly selectedLabel = computed(() => {
    const selected = this.options().find((o) => o.value === this.value());
    return selected?.label ?? '';
  });

  readonly triggerClasses = computed(() => {
    const base =
      'w-full h-11 px-3 flex items-center justify-between rounded-lg bg-gray-50 text-sm ' +
      'border transition-colors focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 ' +
      'focus:border-ios-brand-primary text-start';
    const state = this.isOpen() || this.value() ? 'border-ios-brand-primary' : 'border-gray-200';
    const disabled = this.disabled() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
    return `${base} ${state} ${disabled}`;
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        // A long list is unusable if the query box has to be tabbed to first.
        this.searchInput()?.nativeElement.focus();
      } else {
        this.searchQuery.set('');
      }
    });
  }

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    // The previous highlight can sit past the end of the narrowed list.
    this.focusedIndex.set(0);
  }

  readonly optionClasses = (option: DropdownOption, _index: number): string => {
    const base =
      'flex items-center justify-between px-3 py-3 text-sm cursor-pointer rounded-md transition-colors';
    const selected =
      option.value === this.value()
        ? 'bg-ios-primary-50 text-ios-brand-primary'
        : 'text-ios-brand-dark hover:bg-gray-50';
    const focused = _index === this.focusedIndex() ? 'ring-2 ring-ios-brand-primary/40' : '';
    const disabled = option.disabled ? 'opacity-50 cursor-not-allowed' : '';
    return `${base} ${selected} ${focused} ${disabled}`.trim();
  };

  toggle(): void {
    if (this.disabled()) return;
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) {
      this.searchQuery.set('');
    }
  }

  select(option: DropdownOption): void {
    if (option.disabled) return;
    this.value.set(option.value);
    this.valueChange.emit(option.value);
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  onClickOutside(event: MouseEvent): void {
    const target = event.target as Node | null;
    const host = this.el.nativeElement as Element;
    if (target && !host.contains(target)) {
      this.isOpen.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    const items = this.filteredOptions();
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.isOpen()) {
          const focused = items[this.focusedIndex()];
          if (focused) this.select(focused);
        } else {
          this.isOpen.set(true);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.isOpen.set(true);
        } else {
          this.focusedIndex.update((i) => Math.min(i + 1, items.length - 1));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex.update((i) => Math.max(i - 1, 0));
        break;
      case 'Escape':
        this.isOpen.set(false);
        break;
      case 'Tab':
        this.isOpen.set(false);
        break;
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      this.focusedIndex.update((i) => {
        const items = this.filteredOptions();
        return Math.max(0, Math.min(i + direction, items.length - 1));
      });
    } else if (event.key === 'Enter') {
      const focused = this.filteredOptions()[this.focusedIndex()];
      if (focused) this.select(focused);
    }
  }

  onOptionKeydown(event: KeyboardEvent, option: DropdownOption): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select(option);
    }
  }
}
