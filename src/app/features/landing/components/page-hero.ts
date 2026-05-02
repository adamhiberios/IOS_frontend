/**
 * `ios-page-hero` — reusable page-hero banner for public-facing pages.
 *
 * Structure:
 *   - Full-width dark primary background with decorative circles.
 *   - Breadcrumb link (e.g. "Home") + page title.
 *   - Back-button that links to a configurable URL (defaults to `/`).
 *
 * Usage:
 *   <ios-page-hero
 *     title="Contact"
 *     [showBreadcrumb]="true"
 *     breadcrumbLabel="Home"
 *     breadcrumbLink="/"
 *     backLink="/"
 *   />
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { IosIcon, provideIcons } from '@ui';

@Component({
  selector: 'ios-page-hero',
  imports: [RouterLink, IosIcon],
  providers: [provideIcons(LucideArrowLeft)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative bg-ios-brand-primary overflow-hidden">
      <!-- Decorative circles -->
      <div
        class="absolute top-[-157px] right-[-160px] w-[320px] h-[320px] rounded-full bg-ios-brand-primary-mid opacity-50"
        aria-hidden="true"
      ></div>
      <div
        class="absolute bottom-[-127px] left-[-128px] w-[256px] h-[256px] rounded-full bg-ios-brand-primary-deep opacity-50"
        aria-hidden="true"
      ></div>

      <div class="relative px-10 md:px-32 lg:px-46 pt-14 pb-20">
        <div class="flex items-start gap-3">
          <!-- Back button -->
          <a
            [routerLink]="backLink()"
            class="flex items-center justify-center w-10 h-10 rounded-lg bg-ios-brand-primary-soft hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            [attr.aria-label]="ariaBackLabel()"
          >
            <ios-icon name="arrow-left" class="w-5 h-5 text-ios-brand-primary" />
          </a>
          <div class="flex flex-col gap-1">
            @if (showBreadcrumb()) {
              <div
                class="flex items-center gap-2 text-sm font-heading font-medium text-ios-brand-muted"
              >
                <a [routerLink]="breadcrumbLink()" class="hover:text-white transition-colors">
                  {{ breadcrumbLabel() }}
                </a>
                <span>/</span>
              </div>
            }
            <h1 class="font-heading font-semibold text-[24px] leading-[1.2] text-white">
              {{ title() }}
            </h1>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PageHero {
  readonly title = input.required<string>();
  readonly backLink = input<string>('/');
  readonly ariaBackLabel = input<string>('Go back');
  readonly showBreadcrumb = input<boolean>(true);
  readonly breadcrumbLabel = input<string>('Home');
  readonly breadcrumbLink = input<string>('/');
}
