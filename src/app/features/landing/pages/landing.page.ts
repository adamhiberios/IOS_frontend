/**
 * `ios-landing-page` — public entry point of the application.
 *
 * This is a **thin orchestrator**: it injects `LandingStore`, triggers a
 * content load on init, and delegates rendering to the section components.
 *
 * ## Data flow
 *
 * ```
 * LandingStore (signal store)
 *   ← LandingApi (GET /landing → { featuredPrograms, stats }; fallback on error)
 *   → [stats]    → LandingStatsSection   (live platform counters)
 *   → [programs] → FeaturedCertsSection  (live catalog cards)
 *   → [posts] [badge] → InsightsSection  (static Scrum-Journal cards)
 * ```
 *
 * All other sections (hero, credibility, value-prop, cert-levels, how-it-works,
 * market-stats) are **fully self-contained** — they own their static content
 * via local `computed()` signals and `lang.t()`, and receive no store data.
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
import { InsightsSection } from '../components/sections/insights-section';
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
    InsightsSection,
    AllCertsCtaSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />

    <main class="min-h-screen flex flex-col">
      <!-- 1. Hero — fully static -->
      <ios-hero-section />

      <!-- 1b. Live platform stats strip (GET /landing.stats) -->
      <!-- <ios-landing-stats-section [stats]="store.stats()" /> -->

      <!-- 3. Why Scrum Certification Matters — fully static -->
      <ios-credibility-section />

      <!-- 4. Value Proposition — fully static -->
      <ios-value-prop-section />

      <!-- 2. Trusted by / marquee — fully static -->
      <ios-trusted-by-section />

      <!-- 5. Certification Levels — fully static -->
      <ios-cert-levels-section />

      <!-- 5b. Featured certifications — dynamic (GET /landing.featuredPrograms) -->
      <!-- <ios-featured-certs-section [programs]="store.featuredPrograms()" /> -->

      <!-- 6. Why Choose Us — fully static -->
      <ios-why-choose-us-section />

      <!-- 7. Certification Levels Explained (market stats) — fully static -->
      <ios-market-stats-section />

      <!-- 8. How It Works — fully static -->
      <ios-how-it-works-section />

      <!-- 9. Insights / Scrum Journal — dynamic: posts + badge label from store -->
      <ios-insights-section [posts]="store.insightPosts()" [badge]="store.insightSectionBadge()" />

      <!-- 10. All Certifications CTA — fully static -->
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
