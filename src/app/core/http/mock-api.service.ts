import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly handlers = new Map<string, () => Response>();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set('GET /api/landing', () =>
      ok({
        hero: {
          badge: 'Certifications support your career path.',
          headline: 'The Scrum Credential',
          headline_highlight: 'That Proves Your Expertise',
          subtext:
            'Backed by the Institute of Scrum, our endorsed credentials set a higher standard.',
          source:
            'Endorsed certifications require 20+ hours of structured learning and a rigorous 45-question examination.',
          cohort_label: 'Next cohort starts',
          cohort_date: 'June 2, 2026',
          graduates_count: '12,000+',
          graduates_label: 'Certified graduates',
        },
        credibility_cards: [
          { icon: 'book-open', title: 'Unlimited access to the learning materials' },
          { icon: 'clock', title: '100% self-paced online training' },
          { icon: 'wallet', title: 'Affordable Fees' },
          { icon: 'infinity', title: 'Lifetime certification' },
        ],
        value_prop_cards: [
          {
            icon: 'target',
            title: 'Role-Specialized Depth',
            description: 'Dedicated tracks for Scrum Master, Product Owner, and Scrum Facilitator.',
          },
          {
            icon: 'layers',
            title: 'Three-Level Mastery Path',
            description:
              'Progress from Foundation through Practitioner to Authority as your experience grows.',
          },
          {
            icon: 'zap',
            title: 'Practical Application Focus',
            description:
              'Every certification requires 20+ hours of structured self-paced learning.',
          },
        ],
        certification_levels: [
          {
            id: 'foundation',
            icon: 'book-open',
            tab_label: 'Foundation',
            description: 'Perfect for those new to Scrum.',
            explore_path: 'Explore Foundation Path',
            explore_link: '/certifications/esm',
            audience_desc: 'Ideal for professionals entering Agile environments.',
            cert_cards: [
              {
                id: 'esm',
                abbreviation: 'ESM',
                full_name: 'Endorsed Scrum Master',
                level_badge: 'Foundation',
                badge_color: '#143d56',
                price: 'CAD $130',
                detail_link: '/certifications/esm',
              },
            ],
          },
          {
            id: 'practitioner',
            icon: 'briefcase',
            tab_label: 'Practitioner',
            description: 'For experienced professionals.',
            explore_path: 'Explore Practitioner Path',
            explore_link: '/certifications/esm-p',
            audience_desc: 'Designed for experienced Scrum practitioners.',
            cert_cards: [
              {
                id: 'esm-p',
                abbreviation: 'ESM-P',
                full_name: 'Endorsed Scrum Master Practitioner',
                level_badge: 'Practitioner',
                badge_color: '#455041',
                price: 'CAD $150',
                detail_link: '/certifications/esm-p',
              },
            ],
          },
          {
            id: 'authority',
            icon: 'award',
            tab_label: 'Authority',
            description: 'The highest tier — for senior practitioners.',
            explore_path: 'Explore Authority Path',
            explore_link: '/certifications/esm-a',
            audience_desc: 'For senior Agile leaders.',
            cert_cards: [
              {
                id: 'esm-a',
                abbreviation: 'ESM-A',
                full_name: 'Endorsed Scrum Master Authority',
                level_badge: 'Authority',
                badge_color: '#a69075',
                price: 'CAD $180',
                detail_link: '/certifications/esm-a',
              },
            ],
          },
        ],
        how_it_works_steps: [
          {
            number: '01',
            icon: 'search',
            title: 'Choose Your Certification',
            description: 'Select the Scrum track that best aligns with your goals.',
          },
          {
            number: '02',
            icon: 'book',
            title: 'Review the Learning Materials',
            description: 'Study the learning materials to prepare for the exam.',
          },
          {
            number: '03',
            icon: 'edit-3',
            title: 'Practice with Mock Tests',
            description: 'Complete practice exams to assess your readiness.',
          },
          {
            number: '04',
            icon: 'key',
            title: 'Receive Access to the Final Exam',
            description: 'Obtain access to the official proctored exam.',
          },
          {
            number: '05',
            icon: 'check-circle',
            title: 'Complete the Online Exam',
            description: 'Take the certification exam online at your own pace.',
          },
          {
            number: '06',
            icon: 'award',
            title: 'Earn Your Credential',
            description: 'Pass the exam and receive your digital Scrum certification.',
          },
        ],
        market_levels: [
          {
            tag: 'CORE KNOWLEDGE',
            name: 'FOUNDATION',
            audience: [
              'Career changers entering Agile',
              'New Scrum practitioners',
              'Team members seeking structure',
            ],
            description: 'The Foundation level establishes essential Scrum knowledge.',
          },
          {
            tag: 'APPLIED PRACTICE',
            name: 'PRACTITIONER',
            audience: [
              'Active Scrum Masters.',
              'Team coaches & facilitators.',
              'Experienced Agile practitioners.',
            ],
            description: 'The Practitioner level validates the ability to facilitate Scrum events.',
          },
          {
            tag: 'STRATEGIC MASTERY',
            name: 'AUTHORITY',
            audience: [
              'Senior Agile leaders.',
              'Organizational coaches.',
              'Enterprise transformation leads.',
            ],
            description: 'The Authority level confirms senior-level expertise.',
          },
        ],
        cert_table_rows: [
          {
            role: 'Scrum Master',
            cells: [
              { name: 'Endorsed Scrum Master', link: '/certifications/esm' },
              { name: 'ESM Practitioner', link: '/certifications/esm-p' },
              { name: 'ESM Authority', link: '/certifications/esm-a' },
            ],
          },
          {
            role: 'Product Owner',
            cells: [
              { name: 'Endorsed Product Owner', link: '/certifications/epo' },
              { name: 'EPO Practitioner', link: '/certifications/epo-p' },
              { name: 'EPO Authority', link: '/certifications/epo-a' },
            ],
          },
          {
            role: 'Scrum Facilitator',
            cells: [
              { name: 'Endorsed Scrum Facilitator', link: '/certifications/esf' },
              { name: '—', link: '' },
              { name: '—', link: '' },
            ],
          },
        ],
        insight_posts: [
          {
            id: '1',
            date: 'Apr 15, 2026',
            title: 'Why Employers Now Require Scrum Certification',
            excerpt: 'The shift from nice-to-have to must-have.',
            read_time: '5 min read',
            image_url: '/assets/images/blog_1.png',
            link: '/insights/1',
          },
          {
            id: '2',
            date: 'Mar 28, 2026',
            title: 'Foundation vs. Practitioner: Which Is Right for You?',
            excerpt: 'A practical comparison of certification levels.',
            read_time: '5 min read',
            image_url: '/assets/images/blog_2.png',
            link: '/insights/2',
          },
          {
            id: '3',
            date: 'Mar 10, 2026',
            title: '5 Scenario-Based Questions to Expect on Exam Day',
            excerpt: 'Most commonly tested scenarios broken down.',
            read_time: '5 min read',
            image_url: '/assets/images/blog_3.png',
            link: '/insights/3',
          },
        ],
      }),
    );

    this.handlers.set('GET /api/contact/subjects', () =>
      ok([
        { id: 'general', label: 'General inquiry' },
        { id: 'certifications', label: 'Certifications' },
        { id: 'support', label: 'Technical support' },
        { id: 'partnership', label: 'Partnership' },
        { id: 'other', label: 'Other' },
      ]),
    );

    this.handlers.set('POST /api/contact', () => ok({ status: 'received' }));

    this.handlers.set('GET /api/insights', () =>
      ok({
        posts: [
          {
            id: '1',
            date: 'Apr 15, 2026',
            title: 'Why Employers Now Require Scrum Certification',
            excerpt: 'The shift from nice-to-have to must-have.',
            read_time: '5 min read',
            image_url: '/assets/images/blog_1.png',
            link: '/insights/1',
          },
          {
            id: '2',
            date: 'Mar 28, 2026',
            title: 'Foundation vs. Practitioner: Which Is Right for You?',
            excerpt: 'A practical comparison.',
            read_time: '5 min read',
            image_url: '/assets/images/blog_2.png',
            link: '/insights/2',
          },
          {
            id: '3',
            date: 'Mar 10, 2026',
            title: '5 Scenario-Based Questions to Expect on Exam Day',
            excerpt: 'Commonly tested scenarios.',
            read_time: '5 min read',
            image_url: '/assets/images/blog_3.png',
            link: '/insights/3',
          },
        ],
        total: 3,
      }),
    );

    this.handlers.set('GET /api/dashboard/stats', () =>
      ok({
        programs_enrolled: 12,
        average_score_percent: 43,
        total_time_minutes: 763,
        monthly_scores: [
          { month: 'Jan', score: null },
          { month: 'Feb', score: 65 },
          { month: 'Mar', score: 45 },
          { month: 'Apr', score: 50 },
          { month: 'May', score: 28 },
          { month: 'Jun', score: null },
          { month: 'Jul', score: null },
          { month: 'Aug', score: null },
          { month: 'Sep', score: null },
          { month: 'Oct', score: null },
          { month: 'Nov', score: null },
          { month: 'Dec', score: null },
        ],
        exam_summary: { passed: 24, failed: 20 },
        valid_certifications: [
          {
            code: 'ESM-P',
            name: 'Endorsed Scrum Master Practitioner',
            badge_asset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
            progress_percent: 53,
            family: 'esm',
          },
          {
            code: 'EPO-A',
            name: 'Endorsed Product Owner Authority',
            badge_asset: 'assets/badge/endorsed_product_owner_authority.svg',
            progress_percent: 53,
            family: 'epo',
          },
        ],
        learning_card: {
          illustration: 'assets/illustrations/ready-to-test.svg',
          heading: 'We think you are ready to pass Test! (ESM-P)',
          body: 'You achieved amazing results in the mock exam.',
          meta: '15 pages',
          cta_label: 'Start Final Test',
          cta_style: 'dark',
          cta_route: '/dashboard',
        },
      }),
    );

    this.handlers.set('GET /api/dashboard/certificates', () =>
      ok([
        {
          id: 'cert_1',
          code: 'ESM',
          name: 'Endorsed Scrum Master',
          badge_asset: 'assets/badge/endorsed_scrum_master.svg',
          status: 'active',
          progress_percent: 100,
          family: 'esm',
          earned_date: '2026-01-15',
        },
        {
          id: 'cert_2',
          code: 'ESM-P',
          name: 'Endorsed Scrum Master Practitioner',
          badge_asset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
          status: 'active',
          progress_percent: 53,
          family: 'esm',
          earned_date: '2026-03-20',
        },
      ]),
    );

    this.handlers.set('GET /api/exams/mock/config', () =>
      ok({
        time_options: [
          { value: 0, label: 'No time limit' },
          { value: 15, label: '15 min' },
          { value: 20, label: '20 min' },
          { value: 25, label: '25 min' },
          { value: 30, label: '30 min' },
        ],
        question_options: [
          { value: 15, label: '15 questions' },
          { value: 30, label: '30 questions' },
          { value: 50, label: '50 questions' },
        ],
        default_time: 30,
        default_questions: 50,
      }),
    );

    this.handlers.set('GET /api/exams/mock/history', () =>
      ok([
        {
          id: 'exam_1',
          date: '2026-05-01',
          score: 72,
          passed: true,
          total_questions: 50,
          correct: 36,
          time_spent_minutes: 28,
        },
        {
          id: 'exam_2',
          date: '2026-04-15',
          score: 64,
          passed: true,
          total_questions: 50,
          correct: 32,
          time_spent_minutes: 30,
        },
        {
          id: 'exam_3',
          date: '2026-03-20',
          score: 48,
          passed: false,
          total_questions: 50,
          correct: 24,
          time_spent_minutes: 25,
        },
      ]),
    );

    this.handlers.set('POST /api/exams/mock/submit', () =>
      ok({
        score: 76,
        passed: true,
        total_questions: 50,
        correct: 38,
        incorrect: 12,
        time_spent_minutes: 28,
        answers: [],
      }),
    );

    this.handlers.set('GET /api/user/profile', () =>
      ok({
        id: 'usr_learner_001',
        email: 'learner@ios.test',
        username: 'learner',
        first_name: 'Layla',
        last_name: 'Learner',
        country: 'SA',
        roles: ['learner'],
        preferred_locale: 'en',
      }),
    );
  }

  async handle(method: string, url: string, _body: unknown): Promise<Response | null> {
    const key = `${method} ${url.split('?')[0]}`;
    const handler = this.handlers.get(key);
    if (handler) {
      await delay(200);
      return handler();
    }
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
