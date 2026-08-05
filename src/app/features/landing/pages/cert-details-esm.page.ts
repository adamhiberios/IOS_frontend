/**
 * `ios-cert-details-esm-page` — ESM (Endorsed Scrum Master) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the ESM-specific config + footer + scroll-to-top.
 *
 * To add a sibling cert (ESM-P, EPO, ESF, …) duplicate this file, swap the
 * config object, add the new route entry in `landing.routes.ts`, and supply
 * the matching `certDetails.<code>.*` translation keys.
 *
 * Pixel-faithful to Figma node-id 16695:33680.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-esm-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="esmConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEsmPage {
  protected readonly lang = inject(LanguageService);

  /** ESM cert configuration — values that come from i18n are pulled via `lang.t()`. */
  protected readonly esmConfig = computed<CertDetailsConfig>(() => ({
    code: 'ESM',
    fullName: this.lang.t('certDetails.esm.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_scrum_master.svg',
    trackName: this.lang.t('certDetails.esm.trackName'),
    levelLabel: this.lang.t('certDetails.esm.level'),
    price: this.lang.t('certDetails.esm.price'),
    heroImageSrc: '/assets/images/esm.png',
    namespace: 'certDetails.esm',
    track: 'blue',

    audience: [
      {
        iconName: 'graduation-cap',
        titleKey: 'seekingTitle',
        descKey: 'seekingDesc',
        iconSrc: '/assets/icons/certifications/esm-1.svg',
      },
      {
        iconName: 'users',
        titleKey: 'leadersTitle',
        descKey: 'leadersDesc',
        iconSrc: '/assets/icons/certifications/esm-2.svg',
      },
      {
        iconName: 'code',
        titleKey: 'technicalsTitle',
        descKey: 'technicalsDesc',
        iconSrc: '/assets/icons/certifications/esm-3.svg',
      },
      {
        iconName: 'briefcase',
        titleKey: 'businessTitle',
        descKey: 'businessDesc',
        iconSrc: '/assets/icons/certifications/esm-4.svg',
      },
      {
        iconName: 'rocket',
        titleKey: 'careerChangerTitle',
        descKey: 'careerChangerDesc',
        iconSrc: '/assets/icons/certifications/esm-5.svg',
        fullWidth: true,
      },
    ],

    keyLearningCount: 7,

    related: [
      {
        code: 'EPO',
        fullName: this.lang.t('certDetails.esm.related.epo.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_product_owner.svg',
        description: this.lang.t('certDetails.esm.related.epo.description'),
        price: this.lang.t('certDetails.esm.related.epo.price'),
        learnMoreLabel: this.lang.t('certDetails.esm.related.epo.learnMore'),
        learnMoreLink: '/certifications',
        levelText: this.lang.t('certDetails.esm.related.epo.level'),
        track: 'olive',
      },
      {
        code: 'ESF',
        fullName: this.lang.t('certDetails.esm.related.esf.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_facilitator.svg',
        description: this.lang.t('certDetails.esm.related.esf.description'),
        price: this.lang.t('certDetails.esm.related.esf.price'),
        learnMoreLabel: this.lang.t('certDetails.esm.related.esf.learnMore'),
        learnMoreLink: '/certifications',
        levelText: this.lang.t('certDetails.esm.related.esf.level'),
        track: 'brown',
      },
    ],
  }));
}
