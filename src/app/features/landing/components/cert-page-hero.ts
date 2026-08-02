/**
 * `ios-cert-page-hero` — themed hero banner for certification landing pages.
 *
 * Each certification page (Scrum Master, Product Owner, Scrum Facilitator)
 * has a dark coloured hero containing:
 *   - A back button (arrow icon mirrors direction in RTL via `rtl:rotate-180`)
 *   - A "Home /" breadcrumb
 *   - The page title (h1)
 *   - Two decorative corner circles (positioned with logical `start-`/`end-`)
 *
 * The background and circle colours are configurable so each certification
 * track can use its own brand colour without duplicating markup.
 *
 * Usage:
 * ```html
 * <ios-cert-page-hero
 *   bgColor="#184865"
 *   circle1Color="#426981"
 *   circle2Color="#143D56"
 *   [title]="lang.t('scrumMaster.hero.title')"
 *   [backLabel]="lang.t('scrumMaster.hero.back')"
 *   [breadcrumbHome]="lang.t('scrumMaster.hero.breadcrumb.home')"
 *   headingId="sm-hero-title"
 * />
 * ```
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

@Component({
  selector: 'ios-cert-page-hero',
  imports: [IosIcon],
  providers: [provideIcons(LucideArrowLeft)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative overflow-hidden"
      [style.background-color]="bgColor()"
      [attr.aria-labelledby]="headingId()"
    >
      <!-- Decorative circle — top end corner (mirrors to top-start in RTL) -->
      <div
        class="absolute top-[-157px] end-[-160px] w-[320px] h-[320px] rounded-full opacity-50"
        [style.background-color]="circle1Color()"
        aria-hidden="true"
      ></div>
      <!-- Decorative circle — bottom start corner (mirrors to bottom-end in RTL) -->
      <div
        class="absolute bottom-[-127px] start-[-128px] w-[256px] h-[256px] rounded-full opacity-50"
        [style.background-color]="circle2Color()"
        aria-hidden="true"
      ></div>

      <div class="relative px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]">
        <div class="flex items-start gap-3">
          <!-- Back button — arrow flips in RTL to point toward the reading start -->
          <a
            href="/"
            class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft
                   hover:opacity-90 transition-opacity shrink-0
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            [attr.aria-label]="backLabel()"
          >
            <ios-icon
              name="arrow-left"
              class="w-5 h-5 rtl:rotate-180"
              [style.color]="bgColor()"
              aria-hidden="true"
            />
          </a>

          <!-- Breadcrumb + title -->
          <div class="flex flex-col gap-1">
            <nav [attr.aria-label]="lang.t('common.breadcrumbAriaLabel')">
              <ol
                class="flex items-center gap-2 text-[14px] font-heading font-medium text-ios-border-light"
              >
                <li>
                  <a href="/" class="hover:text-white transition-colors">
                    {{ breadcrumbHome() }}
                  </a>
                </li>
                <li aria-hidden="true">/</li>
              </ol>
            </nav>
            <h1
              [id]="headingId()"
              class="font-heading font-semibold text-[24px] leading-[1.2] text-ios-surface-mid"
            >
              {{ title() }}
            </h1>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CertPageHero {
  protected readonly lang = inject(LanguageService);

  /** CSS colour for the section background, e.g. `#184865`. */
  readonly bgColor = input<string>('#184865');

  /**
   * CSS colour for the top-end decorative circle.
   * Should be a lighter tint of `bgColor`.
   */
  readonly circle1Color = input<string>('#426981');

  /**
   * CSS colour for the bottom-start decorative circle.
   * Should be a darker shade of `bgColor`.
   */
  readonly circle2Color = input<string>('#143D56');

  /** Already-translated page title, rendered as the `<h1>`. */
  readonly title = input.required<string>();

  /** Already-translated aria-label for the back button. */
  readonly backLabel = input<string>('');

  /** Already-translated "Home" label for the breadcrumb link. */
  readonly breadcrumbHome = input<string>('');

  /**
   * `id` applied to the `<h1>` so the `<section>` can reference it via
   * `aria-labelledby`. Must be unique within the page.
   */
  readonly headingId = input<string>('cert-hero-title');
}
