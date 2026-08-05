/**
 * `ios-cert-details-epo-p-page` — EPO-P (Endorsed Product Owner Practitioner) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the EPO-P-specific config + footer + scroll-to-top.
 *
 * Pixel-faithful to Figma node-id 16792:33338.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-epo-p-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="epoPConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEpoPPage {
  protected readonly lang = inject(LanguageService);

  protected readonly epoPConfig = computed<CertDetailsConfig>(() => ({
    code: 'EPO-P',
    fullName: this.lang.t('certDetails.epoP.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_product_owner_practitioner.svg',
    trackName: this.lang.t('certDetails.epoP.trackName'),
    levelLabel: this.lang.t('certDetails.epoP.level'),
    price: this.lang.t('certDetails.epoP.price'),
    heroImageSrc: '/assets/images/epo-p.png',
    namespace: 'certDetails.epoP',
    track: 'green',

    audience: [
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'graduatesTitle',
        descKey: 'graduatesDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'seniorTitle',
        descKey: 'seniorDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'leadersTitle',
        descKey: 'leadersDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'strategyTitle',
        descKey: 'strategyDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'strategistTitle',
        descKey: 'strategistDesc',
        fullWidth: true,
      },
    ],

    keyLearningCount: 6,

    related: [
      {
        code: 'EPO',
        fullName: this.lang.t('certDetails.epoP.related.epo.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_product_owner.svg',
        description: this.lang.t('certDetails.epoP.related.epo.description'),
        price: this.lang.t('certDetails.epoP.related.epo.price'),
        learnMoreLabel: this.lang.t('certDetails.epoP.related.epo.learnMore'),
        learnMoreLink: '/certifications/epo',
        levelText: this.lang.t('certDetails.epoP.related.epo.level'),
        track: 'green',
      },
      {
        code: 'ESF',
        fullName: this.lang.t('certDetails.epoP.related.esf.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_facilitator.svg',
        description: this.lang.t('certDetails.epoP.related.esf.description'),
        price: this.lang.t('certDetails.epoP.related.esf.price'),
        learnMoreLabel: this.lang.t('certDetails.epoP.related.esf.learnMore'),
        learnMoreLink: '/certifications',
        levelText: this.lang.t('certDetails.epoP.related.esf.level'),
        track: 'brown',
      },
    ],
  }));
}
