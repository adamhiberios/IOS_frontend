/**
 * `ios-cert-details-esf-page` — ESF (Endorsed Scrum Facilitator) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the ESF-specific config + footer + scroll-to-top.
 *
 * Pixel-faithful to Figma node-id 16801:34712.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-esf-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="esfConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEsmFPage {
  protected readonly lang = inject(LanguageService);

  protected readonly esfConfig = computed<CertDetailsConfig>(() => ({
    code: 'ESF',
    fullName: this.lang.t('certDetails.esf.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_scrum_facilitator.svg',
    trackName: this.lang.t('certDetails.esf.trackName'),
    levelLabel: this.lang.t('certDetails.esf.level'),
    price: this.lang.t('certDetails.esf.price'),
    heroImageSrc: '/assets/images/esf.png',
    namespace: 'certDetails.esf',
    track: 'brown',

    audience: [
      {
        iconSrc: '/assets/icons/certifications/esf-1.svg',
        titleKey: 'consultantTitle',
        descKey: 'consultantDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esf-2.svg',
        titleKey: 'leaderTitle',
        descKey: 'leaderDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esf-3.svg',
        titleKey: 'coachTitle',
        descKey: 'coachDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esf-4.svg',
        titleKey: 'productTitle',
        descKey: 'productDesc',
      },
      {
        iconSrc: '/assets/icons/certifications/esf-5.svg',
        titleKey: 'expertTitle',
        descKey: 'expertDesc',
        fullWidth: true,
      },
    ],

    keyLearningCount: 7,

    related: [
      {
        code: 'ESM',
        fullName: this.lang.t('certDetails.esf.related.esm.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_master.svg',
        description: this.lang.t('certDetails.esf.related.esm.description'),
        price: this.lang.t('certDetails.esf.related.esm.price'),
        learnMoreLabel: this.lang.t('certDetails.esf.related.esm.learnMore'),
        learnMoreLink: '/certifications/esm',
        levelText: this.lang.t('certDetails.esf.related.esm.level'),
        track: 'blue',
      },
      {
        code: 'EPO',
        fullName: this.lang.t('certDetails.esf.related.epo.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_product_owner.svg',
        description: this.lang.t('certDetails.esf.related.epo.description'),
        price: this.lang.t('certDetails.esf.related.epo.price'),
        learnMoreLabel: this.lang.t('certDetails.esf.related.epo.learnMore'),
        learnMoreLink: '/certifications/epo',
        levelText: this.lang.t('certDetails.esf.related.epo.level'),
        track: 'green',
      },
    ],
  }));
}
