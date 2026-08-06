/**
 * `ios-cert-details-epo-page` — EPO (Endorsed Product Owner) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the EPO-specific config + footer + scroll-to-top.
 *
 * Pixel-faithful to Figma node-id 16792:32363.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-epo-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="epoConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEpoPage {
  protected readonly lang = inject(LanguageService);

  protected readonly epoConfig = computed<CertDetailsConfig>(() => ({
    code: 'EPO',
    fullName: this.lang.t('certDetails.epo.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_product_owner.svg',
    trackName: this.lang.t('certDetails.epo.trackName'),
    levelLabel: this.lang.t('certDetails.epo.level'),
    price: this.lang.t('certDetails.epo.price'),
    heroImageSrc: '/assets/images/epo.png',
    namespace: 'certDetails.epo',
    track: 'green',

    audience: [
      {
        iconSrc: '/assets/icons/certifications/epo-1.svg',
        titleKey: 'aspiringTitle',
        descKey: 'aspiringDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-2.svg',
        titleKey: 'businessTitle',
        descKey: 'businessDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-3.svg',
        titleKey: 'startupTitle',
        descKey: 'startupDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-4.svg',
        titleKey: 'careerTitle',
        descKey: 'careerDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/epo-5.svg',
        titleKey: 'developerTitle',
        descKey: 'developerDesc',
        fullWidth: true,
      },
    ],

    keyLearningCount: 7,

    related: [
      {
        code: 'ESM',
        fullName: this.lang.t('certDetails.epo.related.esm.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_master.svg',
        description: this.lang.t('certDetails.epo.related.esm.description'),
        price: this.lang.t('certDetails.epo.related.esm.price'),
        learnMoreLabel: this.lang.t('certDetails.epo.related.esm.learnMore'),
        learnMoreLink: '/certifications/esm',
        levelText: this.lang.t('certDetails.epo.related.esm.level'),
        track: 'blue',
      },
      {
        code: 'ESF',
        fullName: this.lang.t('certDetails.epo.related.esf.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_facilitator.svg',
        description: this.lang.t('certDetails.epo.related.esf.description'),
        price: this.lang.t('certDetails.epo.related.esf.price'),
        learnMoreLabel: this.lang.t('certDetails.epo.related.esf.learnMore'),
        learnMoreLink: '/certifications/esf',
        levelText: this.lang.t('certDetails.epo.related.esf.level'),
        track: 'brown',
      },
    ],
  }));
}
