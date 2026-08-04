/**
 * `ios-about-institute-page` — public "About Institute of Scrum" page.
 *
 * STUB: skeleton only (navbar + hero + placeholder + footer). Content to be
 * built out in a follow-up session — see `landing.nav.aboutItems` in
 * `landing-navbar.ts` for how this page is reached from the "About" menu.
 *
 * All text is routed through `LanguageService.t()` for EN / AR / FR i18n.
 * Keys live under the `aboutInstitute.*` namespace in assets/i18n/*.json.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

@Component({
  selector: 'ios-about-institute-page',
  imports: [LandingNavbar, LandingFooter, PageHero, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />

    <ios-page-hero
      [title]="lang.t('aboutInstitute.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('aboutInstitute.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('aboutInstitute.hero.back')"
    />

    <!-- TODO: build out this page's content. -->
    <section class="bg-white px-6 md:px-16 lg:px-[120px] py-20">
      <p class="font-body text-[16px] text-ios-fg-8 text-center">
        {{ lang.t('aboutInstitute.placeholder') }}
      </p>
    </section>

    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class AboutInstitutePage {
  protected readonly lang = inject(LanguageService);
}
