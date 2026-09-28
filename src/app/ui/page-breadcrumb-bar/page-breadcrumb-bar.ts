import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { IosIcon } from '../icon/icon';
import { provideIcons } from '../icon/icon-registry';

/**
 * `ios-page-breadcrumb-bar` — the white bar under the dashboard navbar with a
 * back button and the page's breadcrumb trail.
 *
 * The crumbs are projected as `<li>` elements straight into the `<ol>`, so
 * each page keeps full control over its links and the `aria-current` item:
 * ```html
 * <ios-page-breadcrumb-bar backLink="/dashboard" [backLabel]="lang.t('…backToDashboard')">
 *   <li><a routerLink="/dashboard" class="…">Dashboard</a></li>
 *   <li class="font-medium text-ios-fg-8" aria-hidden="true">/</li>
 *   <li><span class="font-semibold text-ios-fg-13" aria-current="page">Settings</span></li>
 * </ios-page-breadcrumb-bar>
 * ```
 *
 * On phones the bar grows (`min-h`) and the trail wraps between crumbs —
 * never inside one — instead of overflowing the viewport.
 */
@Component({
  selector: 'ios-page-breadcrumb-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IosIcon],
  providers: [provideIcons(LucideArrowLeft)],
  host: { class: 'block w-full bg-white border-b border-ios-surface-soft' },
  template: `
    <div class="max-w-[1400px] mx-auto px-4 md:px-8 min-h-[70px] py-3 flex items-center">
      <div class="flex items-center gap-4 min-w-0">
        <a
          [routerLink]="backLink()"
          class="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/30"
          [attr.aria-label]="backLabel()"
        >
          <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
        </a>
        <nav aria-label="Breadcrumb" class="min-w-0">
          <ol
            class="flex flex-wrap items-center gap-x-1.5 md:gap-x-3 gap-y-1 text-[14px] md:text-base leading-[1.4] [&>li]:whitespace-nowrap"
            role="list"
          >
            <ng-content />
          </ol>
        </nav>
      </div>
    </div>
  `,
})
export class PageBreadcrumbBar {
  /** Where the back button goes — a path string or a router commands array. */
  readonly backLink = input.required<string | readonly (string | number)[]>();
  /** Accessible name for the icon-only back button. */
  readonly backLabel = input.required<string>();
}
