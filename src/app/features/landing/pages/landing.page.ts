/**
 * `ios-landing-page` — public entry point of the application.
 *
 * This is a **thin orchestrator**: it injects `LandingStore`, triggers a
 * content load on init, and delegates rendering to the section components.
 * No content data is hardcoded here — all data flows through the store.
 *
 * ── Data flow ─────────────────────────────────────────────────────────────
 * LandingStore (signal store)
 *   ← LandingApi (HTTP stub, falls back to static data until backend is live)
 *   → section components via signal inputs
 * ─────────────────────────────────────────────────────────────────────────
 */

import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { HeroSection } from '../components/sections/hero-section';
import { TrustedBySection } from '../components/sections/trusted-by-section';
import { CredibilitySection } from '../components/sections/credibility-section';
import { ValuePropSection } from '../components/sections/value-prop-section';
import { CertLevelsSection } from '../components/sections/cert-levels-section';
import { WhyChooseUsSection } from '../components/sections/why-choose-us-section';
import { MarketStatsSection } from '../components/sections/market-stats-section';
import { HowItWorksSection } from '../components/sections/how-it-works-section';
import { BlogSection } from '../components/sections/blog-section';
import { AllCertsCtaSection } from '../components/sections/all-certs-cta-section';
import { LandingStore } from '../data-access/landing.store';

@Component({
  selector: 'ios-landing-page',
  imports: [
    LandingNavbar,
    LandingFooter,
    HeroSection,
    TrustedBySection,
    CredibilitySection,
    ValuePropSection,
    CertLevelsSection,
    WhyChooseUsSection,
    MarketStatsSection,
    HowItWorksSection,
    BlogSection,
    AllCertsCtaSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />

    <main class="min-h-screen flex flex-col">
      <!-- 1. Hero -->
      <ios-hero-section [data]="store.hero()" />

      <!-- 2. Trusted by / marquee -->
      <ios-trusted-by-section />

      <!-- 3. Why Scrum Certification Matters -->
      <ios-credibility-section [cards]="store.credibilityCards()" />

      <!-- 4. Value Proposition -->
      <ios-value-prop-section [cards]="store.valuePropCards()" />

      <!-- 5. Certification Levels -->
      <ios-cert-levels-section [levels]="store.certificationLevels()" />

      <!-- 6. Why Choose Us -->
      <ios-why-choose-us-section />

      <!-- 7. Certification Levels Explained (market stats) -->
      <ios-market-stats-section
        [marketLevels]="store.marketLevels()"
        [certTableRows]="store.certTableRows()"
      />

      <!-- 8. How It Works -->
      <ios-how-it-works-section [steps]="store.howItWorksSteps()" />

      <!-- 9. Blog / Scrum Journal -->
      <ios-blog-section [posts]="store.blogPosts()" />

      <!-- 10. All Certifications CTA -->
      <ios-all-certs-cta-section />
    </main>

    <ios-landing-footer />
  `,
})
export class LandingPage implements OnInit {
  protected readonly store = inject(LandingStore);

  ngOnInit(): void {
    void this.store.load();
  }
}
