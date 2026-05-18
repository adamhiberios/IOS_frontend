import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'ios-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() || null"
      [attr.aria-disabled]="disabled() || null"
      [class]="classes()"
      (click)="clicked.emit($event)"
    >
      @if (loading()) {
        <span
          class="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        ></span>
      }
      <ng-content />
    </button>
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);

  readonly clicked = output<MouseEvent>();

  readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-ios-brand-primary text-white hover:bg-ios-brand-primary-hover focus-visible:ring-ios-brand-primary/50',
      secondary:
        'bg-neutral-100 text-ios-brand-dark hover:bg-neutral-200 focus-visible:ring-neutral-400',
      tertiary:
        'bg-transparent text-ios-brand-primary hover:bg-ios-primary-50 focus-visible:ring-ios-brand-primary/40',
      ghost: 'bg-transparent text-ios-fg hover:bg-neutral-100 focus-visible:ring-neutral-300',
      danger: 'bg-ios-danger text-white hover:bg-ios-danger/90 focus-visible:ring-ios-danger/50',
    };

    return [
      base,
      sizes[this.size()],
      variants[this.variant()],
      this.fullWidth() ? 'w-full' : '',
    ].join(' ');
  });
}
