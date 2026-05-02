/**
 * LandingStore — signal store for the landing page.
 *
 * Exposes read-only signals that section components consume.
 * Currently backed by static fallback data; call `load()` to replace with
 * live API data once the backend endpoint is available.
 *
 * Usage (in landing.page.ts):
 *   protected readonly store = inject(LandingStore);
 *   // template: [data]="store.hero()"
 */

import { Injectable, computed, inject, signal } from '@angular/core';

import { LandingApi } from './landing.api';
import type {
  BlogPost,
  CertTableRow,
  CertificationLevel,
  CredibilityCard,
  HeroData,
  HowItWorksStep,
  LandingPageData,
  MarketLevel,
  ValuePropCard,
} from './landing.model';

// ---------------------------------------------------------------------------
// Static fallback data
// Mirrors the en.json content. Swap for API call when backend is ready.
// ---------------------------------------------------------------------------

const FALLBACK_DATA: LandingPageData = {
  hero: {
    badge: 'Certifications support your career path.',
    headline: 'The Scrum Credential',
    headlineHighlight: 'That Proves Your Expertise',
    subtext:
      'Backed by the Institute of Scrum, our endorsed credentials set a higher standard — recognizing professionals who deliver results in the real world and stand apart through demonstrated skill, judgment, and impact.',
    source:
      'Endorsed certifications require 20+ hours of structured learning and a rigorous 45-question examination — because your credential should prove what you can do.',
    cohortLabel: 'Next cohort starts',
    cohortDate: 'June 2, 2026',
    graduatesCount: '12,000+',
    graduatesLabel: 'Certified graduates',
  },

  credibilityCards: [
    { icon: 'files', title: 'Unlimited access to the learning materials' },
    { icon: 'laptop', title: '100% self-paced online training' },
    { icon: 'badge-dollar-sign', title: 'Affordable Fees' },
    { icon: 'badge-check', title: 'Lifetime certification' },
  ],

  valuePropCards: [
    {
      icon: 'star',
      title: 'Role-Specialized Depth',
      description:
        'Dedicated tracks for Scrum Master, Product Owner, and Scrum Facilitator. Each certification addresses the specific competencies, challenges, and career outcomes of your chosen role — not a one-size-fits-all overview.',
    },
    {
      icon: 'star',
      title: 'Three-Level Mastery Path',
      description:
        'Progress from Foundation through Practitioner to Authority as your experience grows. Each level builds on the last, creating a clear career trajectory that employers recognize and reward.',
    },
    {
      icon: 'star',
      title: 'Practical Application Focus',
      description:
        'Every certification requires 20+ hours of structured self-paced learning and a rigorous 45-question examination. You earn your Endorsed credential by demonstrating what you know and can apply.',
    },
  ],

  certificationLevels: [
    {
      id: 'FOUNDATION',
      icon: 'book-open',
      tabLabel: 'Foundation',
      description:
        'Perfect for those new to Scrum or transitioning into Agile roles. Validates your understanding of core Scrum principles, roles, events, and artifacts.',
      explorePath: 'Explore Foundation Path',
      exploreLink: '/certifications',
      audienceDesc:
        'Ideal for professionals entering Agile environments who want to build a solid Scrum foundation with a recognized, role-specific credential.',
      certCards: [
        {
          id: 'esm',
          abbreviation: 'ESM',
          fullName: 'Endorsed Scrum Master',
          levelBadge: 'Foundation',
          badgeColor: '#426981',
          price: 'CAD $180',
          detailLink: '/certifications/esm',
        },
        {
          id: 'epo',
          abbreviation: 'EPO',
          fullName: 'Endorsed Product Owner',
          levelBadge: 'Foundation',
          badgeColor: '#426981',
          price: 'CAD $180',
          detailLink: '/certifications/epo',
        },
        {
          id: 'esf',
          abbreviation: 'ESF',
          fullName: 'Endorsed Scrum Facilitator',
          levelBadge: 'Foundation',
          badgeColor: '#426981',
          price: 'CAD $180',
          detailLink: '/certifications/esf',
        },
      ],
    },
    {
      id: 'PRACTITIONER',
      icon: 'zap',
      tabLabel: 'Intermediate',
      description:
        'For experienced professionals who facilitate Scrum events and coach teams. Demonstrates ability to apply Scrum in complex, real-world environments.',
      explorePath: 'Explore Practitioner Path',
      exploreLink: '/certifications',
      audienceDesc:
        'Designed for experienced Scrum practitioners who actively facilitate events, coach teams, and apply the framework in complex real-world environments.',
      certCards: [
        {
          id: 'psm',
          abbreviation: 'PSM',
          fullName: 'Professional Scrum Master',
          levelBadge: 'Intermediate',
          badgeColor: '#2d5f7a',
          price: 'CAD $220',
          detailLink: '/certifications/psm',
        },
        {
          id: 'ppo',
          abbreviation: 'PPO',
          fullName: 'Professional Product Owner',
          levelBadge: 'Intermediate',
          badgeColor: '#2d5f7a',
          price: 'CAD $220',
          detailLink: '/certifications/ppo',
        },
        {
          id: 'psf',
          abbreviation: 'PSF',
          fullName: 'Professional Scrum Facilitator',
          levelBadge: 'Intermediate',
          badgeColor: '#2d5f7a',
          price: 'CAD $220',
          detailLink: '/certifications/psf',
        },
      ],
    },
    {
      id: 'AUTHORITY',
      icon: 'shield-check',
      tabLabel: 'Advanced',
      description:
        'The highest tier — for senior practitioners shaping Agile strategy at the organizational level. Validates deep expertise and thought leadership.',
      explorePath: 'Explore Authority Path',
      exploreLink: '/certifications',
      audienceDesc:
        'For senior Agile leaders shaping organizational strategy, mentoring Scrum teams, and driving enterprise-level transformation.',
      certCards: [
        {
          id: 'asm',
          abbreviation: 'ASM',
          fullName: 'Authority Scrum Master',
          levelBadge: 'Advanced',
          badgeColor: '#1a3a4a',
          price: 'CAD $260',
          detailLink: '/certifications/asm',
        },
        {
          id: 'apo',
          abbreviation: 'APO',
          fullName: 'Authority Product Owner',
          levelBadge: 'Advanced',
          badgeColor: '#1a3a4a',
          price: 'CAD $260',
          detailLink: '/certifications/apo',
        },
        {
          id: 'asf',
          abbreviation: 'ASF',
          fullName: 'Authority Scrum Facilitator',
          levelBadge: 'Advanced',
          badgeColor: '#1a3a4a',
          price: 'CAD $260',
          detailLink: '/certifications/asf',
        },
      ],
    },
  ],

  howItWorksSteps: [
    {
      number: '01',
      icon: 'target',
      title: 'Choose Your Certification',
      description:
        'Select the Scrum track and level that best aligns with your experience and career goals.',
    },
    {
      number: '02',
      icon: 'book-open-text',
      title: 'Review the Learning Materials',
      description:
        'Study the provided learning materials to build your knowledge and prepare for the exam.',
    },
    {
      number: '03',
      icon: 'list-checks',
      title: 'Practice with Mock Tests',
      description:
        'Complete practice exams to assess your readiness and strengthen your understanding.',
    },
    {
      number: '04',
      icon: 'key',
      title: 'Receive Access to the Final Exam',
      description: 'Obtain access to the official proctored certification exam when you are ready.',
    },
    {
      number: '05',
      icon: 'square-check',
      title: 'Complete the Online Exam',
      description: 'Take and complete the certification exam online at your own pace.',
    },
    {
      number: '06',
      icon: 'badge-check',
      title: 'Earn Your Credential',
      description: 'Successfully pass the exam and receive your digital Scrum certification.',
    },
  ],

  marketLevels: [
    {
      tag: 'CORE KNOWLEDGE',
      name: 'FOUNDATION',
      audience: [
        'Career changers entering Agile',
        'New Scrum practitioners',
        'Team members seeking structure',
      ],
      description:
        'The Foundation level establishes essential Scrum knowledge and core principles for those entering the field. Candidates demonstrate understanding of foundational frameworks, terminology, and practices required to participate effectively in agile teams and begin their professional journey.',
    },
    {
      tag: 'APPLIED PRACTICE',
      name: 'PRACTITIONER',
      audience: [
        'Active Scrum Masters.',
        'Team coaches & facilitators.',
        'Experienced Agile practitioners.',
      ],
      description:
        'The Practitioner level validates the ability to facilitate Scrum events, coach teams, and apply the framework in complex environments. Candidates demonstrate active mastery through scenario-based assessment grounded in real-world practice.',
    },
    {
      tag: 'STRATEGIC MASTERY',
      name: 'AUTHORITY',
      audience: [
        'Senior Agile leaders.',
        'Organizational coaches.',
        'Enterprise transformation leads.',
      ],
      description:
        'The Authority level confirms senior-level expertise and thought leadership in Scrum. Candidates demonstrate the capacity to shape Agile strategy at an organizational level, mentor practitioners, and drive sustainable transformation across enterprise contexts.',
    },
  ],

  certTableRows: [
    {
      role: 'Scrum Master',
      cells: [
        { name: 'Endorsed Scrum Master', link: '/certifications/esm' },
        { name: 'Professional Scrum Master', link: '/certifications/psm' },
        { name: 'Authority Scrum Master', link: '/certifications/asm' },
      ],
    },
    {
      role: 'Product Owner',
      cells: [
        { name: 'Endorsed Product Owner', link: '/certifications/epo' },
        { name: 'Professional Product Owner', link: '/certifications/ppo' },
        { name: 'Authority Product Owner', link: '/certifications/apo' },
      ],
    },
    {
      role: 'Scrum Facilitator',
      cells: [
        { name: 'Endorsed Scrum Facilitator', link: '/certifications/esf' },
        { name: 'Professional Scrum Facilitator', link: '/certifications/psf' },
        { name: 'Authority Scrum Facilitator', link: '/certifications/asf' },
      ],
    },
  ],

  blogPosts: [
    {
      id: 'post-1',
      date: 'Apr 15, 2026',
      title: 'Why Employers Now Require Scrum Certification',
      excerpt:
        'The shift from "nice to have" to "must have" — how Canadian employers are using Scrum credentials to filter candidates.',
      readTime: '5 min read',
      imageUrl: '/assets/images/blog_1.png',
      link: '/blog/why-employers-require-scrum-certification',
    },
    {
      id: 'post-2',
      date: 'Mar 28, 2026',
      title: 'Foundation vs. Practitioner: Which Is Right for You?',
      excerpt:
        'A practical comparison of our two most popular certification levels, with guidance on choosing the right starting point.',
      readTime: '5 min read',
      imageUrl: '/assets/images/blog_2.png',
      link: '/blog/foundation-vs-practitioner',
    },
    {
      id: 'post-3',
      date: 'Mar 10, 2026',
      title: '5 Scenario-Based Questions to Expect on Exam Day',
      excerpt:
        'We break down the most commonly tested scenarios and show you how to approach them with the Scrum framework.',
      readTime: '5 min read',
      imageUrl: '/assets/images/blog_3.png',
      link: '/blog/5-scenario-based-exam-questions',
    },
  ],
};

// ---------------------------------------------------------------------------
// Status type
// ---------------------------------------------------------------------------

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class LandingStore {
  private readonly api = inject(LandingApi);

  // ── Private mutable state ────────────────────────────────────────────────
  private readonly _data = signal<LandingPageData>(FALLBACK_DATA);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);

  // ── Public read-only views ───────────────────────────────────────────────
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');

  // Individual section signals — components bind to these directly
  readonly hero = computed<HeroData>(() => this._data().hero);
  readonly credibilityCards = computed<CredibilityCard[]>(() => this._data().credibilityCards);
  readonly valuePropCards = computed<ValuePropCard[]>(() => this._data().valuePropCards);
  readonly certificationLevels = computed<CertificationLevel[]>(
    () => this._data().certificationLevels,
  );
  readonly howItWorksSteps = computed<HowItWorksStep[]>(() => this._data().howItWorksSteps);
  readonly marketLevels = computed<MarketLevel[]>(() => this._data().marketLevels);
  readonly certTableRows = computed<CertTableRow[]>(() => this._data().certTableRows);
  readonly blogPosts = computed<BlogPost[]>(() => this._data().blogPosts);

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Attempts to load live data from the backend API.
   * Falls back to the static data already in `_data` on failure or when the
   * API returns null (i.e. the endpoint is not yet available).
   *
   * Called once from `LandingPage.ngOnInit()`.
   */
  async load(): Promise<void> {
    if (this._status() === 'loading') return;

    this._status.set('loading');
    this._error.set(null);

    try {
      const data = await this.api.getPageData();
      if (data) {
        this._data.set(data);
      }
      // null return = endpoint not yet live → keep fallback data silently
      this._status.set('success');
    } catch (err) {
      this._status.set('error');
      this._error.set(err instanceof Error ? err.message : 'Failed to load landing content');
      // Static fallback remains intact — the page still renders correctly
    }
  }
}
