/**
 * `ios-cert-details-esm-p-page` — ESM-P (Endorsed Scrum Master Practitioner) details page.
 *
 * Thin wrapper page: composes navbar + reusable `<ios-cert-details-template>`
 * with the ESM-P-specific config + footer + scroll-to-top.
 *
 * Pixel-faithful to Figma node-id 16697:30511.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { CertDetailsTemplate, type CertDetailsConfig } from '../components/cert-details-template';

@Component({
  selector: 'ios-cert-details-esm-p-page',
  imports: [LandingNavbar, LandingFooter, CertDetailsTemplate, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />
    <ios-cert-details-template [config]="esmPConfig()" />
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class CertDetailsEsmPPage {
  protected readonly lang = inject(LanguageService);

  protected readonly esmPConfig = computed<CertDetailsConfig>(() => ({
    code: 'ESM-P',
    fullName: this.lang.t('certDetails.esmP.fullName'),
    badgeSvgPath: '/assets/badge/endorsed_scrum_master_practitioner.svg',
    trackName: this.lang.t('certDetails.esmP.trackName'),
    levelLabel: this.lang.t('certDetails.esmP.level'),
    price: this.lang.t('certDetails.esmP.price'),
    heroImageSrc: '/assets/images/esm-p.png',
    namespace: 'certDetails.esmP',
    track: 'blue',

    audience: [
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'practitionerTitle',
        descKey: 'practitionerDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'teamCoachTitle',
        descKey: 'teamCoachDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'optimizationTitle',
        descKey: 'optimizationDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'leaderTitle',
        descKey: 'leaderDesc',
      },
      {
        iconSrc: '/assets/icons/certificate_exam.svg',
        titleKey: 'strategistTitle',
        descKey: 'strategistDesc',
        fullWidth: true,
      },
    ],

    keyLearningCount: 7,

    related: [
      {
        code: 'ESM',
        fullName: this.lang.t('certDetails.esmP.related.esm.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_master.svg',
        description: this.lang.t('certDetails.esmP.related.esm.description'),
        price: this.lang.t('certDetails.esmP.related.esm.price'),
        learnMoreLabel: this.lang.t('certDetails.esmP.related.esm.learnMore'),
        learnMoreLink: '/certifications',
        levelText: this.lang.t('certDetails.esmP.related.esm.level'),
        track: 'blue',
      },
      {
        code: 'ESM-A',
        fullName: this.lang.t('certDetails.esmP.related.esmA.fullName'),
        badgeSvgPath: '/assets/badge/endorsed_scrum_master_authority.svg',
        description: this.lang.t('certDetails.esmP.related.esmA.description'),
        price: this.lang.t('certDetails.esmP.related.esmA.price'),
        learnMoreLabel: this.lang.t('certDetails.esmP.related.esmA.learnMore'),
        learnMoreLink: '/certifications',
        levelText: this.lang.t('certDetails.esmP.related.esmA.level'),
        track: 'primary',
      },
    ],
  }));
}
