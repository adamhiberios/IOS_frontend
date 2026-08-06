/**
 * `ios-cert-details-epo-a-page` — EPO-A (Endorsed Product Owner Authority) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the EPO-A-specific config + footer + scroll-to-top.
 *
 * Pixel-faithful to Figma node-id 16792:34061.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-epo-a-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="epoAConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEpoAPage {
  protected readonly lang = inject(LanguageService);

  protected readonly epoAConfig = computed<CertDetailsConfig>(() => ({
    code: 'EPO-A',
    fullName: this.lang.t('certDetails.epoA.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_product_owner_authority.svg',
    trackName: this.lang.t('certDetails.epoA.trackName'),
    levelLabel: this.lang.t('certDetails.epoA.level'),
    price: this.lang.t('certDetails.epoA.price'),
    heroImageSrc: '/assets/images/epo-a.png',
    namespace: 'certDetails.epoA',
    track: 'green',

    audience: [
      {
        iconSrc: '/assets/icons/certifications/epo-a-1.svg',
        titleKey: 'enterpriseTitle',
        descKey: 'enterpriseDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-a-2.svg',
        titleKey: 'chiefProductTitle',
        descKey: 'chiefProductDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-a-3.svg',
        titleKey: 'portfolioTitle',
        descKey: 'portfolioDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-a-4.svg',
        titleKey: 'executiveTitle',
        descKey: 'executiveDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-a-5.svg',
        titleKey: 'innovatorTitle',
        descKey: 'innovatorDesc',
        fullWidth: true,
      },
    ],

    keyLearningCount: 7,

    related: [
      {
        code: 'EPO-P',
        fullName: this.lang.t('certDetails.epoA.related.epoP.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_product_owner_practitioner.svg',
        description: this.lang.t('certDetails.epoA.related.epoP.description'),
        price: this.lang.t('certDetails.epoA.related.epoP.price'),
        learnMoreLabel: this.lang.t('certDetails.epoA.related.epoP.learnMore'),
        learnMoreLink: '/certifications/epo-p',
        levelText: this.lang.t('certDetails.epoA.related.epoP.level'),
        track: 'green',
      },
      {
        code: 'ESF',
        fullName: this.lang.t('certDetails.epoA.related.esf.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_facilitator.svg',
        description: this.lang.t('certDetails.epoA.related.esf.description'),
        price: this.lang.t('certDetails.epoA.related.esf.price'),
        learnMoreLabel: this.lang.t('certDetails.epoA.related.esf.learnMore'),
        learnMoreLink: '/certifications/esf',
        levelText: this.lang.t('certDetails.epoA.related.esf.level'),
        track: 'brown',
      },
    ],
  }));
}
