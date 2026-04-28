import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type IconButtonVariant = 'filled' | 'outline' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ios-icon-button',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-disabled]="disabled() || null"
      [routerLink]="routerLink()"
      [class]="classes()"
    >
      <ng-content />
    </button>
  `,
})
export class IconButton {
  readonly variant = input<IconButtonVariant>('outline');
  readonly size = input<IconButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly routerLink = input<string | string[] | null>(null);
  readonly ariaLabel = input.required<string>();

  readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const sizes: Record<IconButtonSize, string> = {
      sm: 'w-8 h-8',
      md: 'w-11 h-11',
      lg: 'w-14 h-14',
    };

    const variants: Record<IconButtonVariant, string> = {
      filled: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus-visible:ring-neutral-400',
      outline:
        'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100 focus-visible:ring-neutral-400',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-neutral-300',
    };

    return [base, sizes[this.size()], variants[this.variant()]].join(' ');
  });
}
