/**
 * `ios-cert-details-esm-a-page` — ESM-A (Endorsed Scrum Master Authority) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the ESM-A-specific config + footer + scroll-to-top.
 *
 * Pixel-faithful to Figma node-id 16792:31483.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-esm-a-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="esmAConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEsmAPage {
  protected readonly lang = inject(LanguageService);

  protected readonly esmAConfig = computed<CertDetailsConfig>(() => ({
    code: 'ESM-A',
    fullName: this.lang.t('certDetails.esmA.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_scrum_master_authority.svg',
    trackName: this.lang.t('certDetails.esmA.trackName'),
    levelLabel: this.lang.t('certDetails.esmA.level'),
    price: this.lang.t('certDetails.esmA.price'),
    heroImageSrc: '/assets/images/esm-a.png',
    namespace: 'certDetails.esmA',
    track: 'blue',

    audience: [
      {
        iconSrc: '/assets/icons/certifications/esm-a-1.svg',
        titleKey: 'enterpriseTitle',
        descKey: 'enterpriseDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esm-a-2.svg',
        titleKey: 'mentorTitle',
        descKey: 'mentorDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esm-a-3.svg',
        titleKey: 'scalingTitle',
        descKey: 'scalingDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esm-a-4.svg',
        titleKey: 'executiveTitle',
        descKey: 'executiveDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esm-a-5.svg',
        titleKey: 'authorityTitle',
        descKey: 'authorityDesc',
        fullWidth: true,
      },
    ],

    keyLearningCount: 7,

    related: [
      {
        code: 'ESM-P',
        fullName: this.lang.t('certDetails.esmA.related.esmP.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_master_practitioner.svg',
        description: this.lang.t('certDetails.esmA.related.esmP.description'),
        price: this.lang.t('certDetails.esmA.related.esmP.price'),
        learnMoreLabel: this.lang.t('certDetails.esmA.related.esmP.learnMore'),
        learnMoreLink: '/certifications/esm-p',
        levelText: this.lang.t('certDetails.esmA.related.esmP.level'),
        track: 'blue',
      },
      {
        code: 'ESF',
        fullName: this.lang.t('certDetails.esmA.related.esf.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_facilitator.svg',
        description: this.lang.t('certDetails.esmA.related.esf.description'),
        price: this.lang.t('certDetails.esmA.related.esf.price'),
        learnMoreLabel: this.lang.t('certDetails.esmA.related.esf.learnMore'),
        learnMoreLink: '/certifications/esf',
        levelText: this.lang.t('certDetails.esmA.related.esf.level'),
        track: 'brown',
      },
    ],
  }));
}
