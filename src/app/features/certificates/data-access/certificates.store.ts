import { Injectable, computed, inject, signal } from '@angular/core';

import { LanguageService } from '@core/i18n';

import type {
  CertDetail,
  CertDetailSection,
  CertListCard,
  CertSessionData,
  CertificatesState,
  EnrolledCertHeader,
  LearningMaterial,
  MockTestAttempt,
  MockTestQuestion,
  MockTestStats,
  ScoreFilterWeek,
  SessionChapter,
  WeeklyScore,
} from './certificates.model';

/* --------------------------------------------------------------------------
 * Learning materials mock data — shared across all demo states for ESM-P
 * -------------------------------------------------------------------------- */

const ESM_P_MATERIALS: readonly LearningMaterial[] = [
  {
    id: 'session-1-a',
    title: 'Session 1',
    currentPage: 5,
    totalPages: 15,
    completionPercent: 0,
    status: 'not_started',
    actionLabel: 'Open',
  },
  {
    id: 'session-1-b',
    title: 'Session 1',
    currentPage: 5,
    totalPages: 15,
    completionPercent: 53,
    status: 'in_progress',
    actionLabel: 'Continue',
  },
  {
    id: 'session-1-c',
    title: 'Session 1',
    currentPage: 5,
    totalPages: 15,
    completionPercent: 100,
    status: 'completed',
    actionLabel: 'Open',
  },
  {
    id: 'session-2',
    title: 'Session 2',
    currentPage: 3,
    totalPages: 12,
    completionPercent: 75,
    status: 'in_progress',
    actionLabel: 'In Progress',
  },
  {
    id: 'session-3',
    title: 'Session 3',
    currentPage: 2,
    totalPages: 10,
    completionPercent: 20,
    status: 'not_started',
    actionLabel: 'Not Started',
  },
  {
    id: 'session-4',
    title: 'Session 4',
    currentPage: 4,
    totalPages: 14,
    completionPercent: 50,
    status: 'in_progress',
    actionLabel: 'Open',
  },
  {
    id: 'session-5',
    title: 'Session 5',
    currentPage: 6,
    totalPages: 18,
    completionPercent: 90,
    status: 'completed',
    actionLabel: 'Completed',
  },
];

/* --------------------------------------------------------------------------
 * Session viewer mock data — ESM-P, Session 1
 * Figma: node 13110-52150
 * -------------------------------------------------------------------------- */

const INTRO_PARAGRAPHS: readonly string[] = [
  "The Project Management Core Certificate is designed to establish a strong, practical foundation in project management for professionals who are involved in planning, coordinating, or delivering projects within their organizations. In today's dynamic business environment, organizations rely on projects to drive change, implement strategy, and deliver value. As a result, project management is no longer a specialized skill reserved for a single role—it is a core competency required across functions, industries, and levels of responsibility.",
  'This program focuses on the core principles, practices, and responsibilities that underpin successful project delivery. Rather than emphasizing theory alone, the Project Management Core Certificate bridges the gap between conceptual knowledge and real-world application. Participants will gain a clear understanding of how projects are structured, how decisions are made, and how constraints are balanced to achieve defined objectives within agreed timelines and budgets.',
  'The first session serves as the foundation for the entire certificate. It introduces the fundamental language of project management and establishes a shared understanding of what constitutes a project, how projects differ from operational work, and why structured project management is essential for organizational success. This session ensures that all participants—regardless of background or industry—start with a consistent framework that will be expanded and applied throughout the program.',
  'A key focus of this introduction is the role of the project manager at the core level. Participants will explore the responsibilities associated with managing scope, time, cost, quality, resources, and stakeholders, while understanding that effective project management is as much about leadership and communication as it is about tools and processes. Emphasis is placed on accountability, decision-making, and alignment with business objectives, helping learners recognize how project outcomes directly impact organizational performance.',
  'The session also provides an overview of the project lifecycle, highlighting how projects progress from initiation through planning, execution, monitoring, and closure. Understanding this lifecycle enables participants to see how different activities, deliverables, and decisions fit together, and how early choices influence project success later on. This structured view helps reduce uncertainty, improve predictability, and support better control throughout the project.',
  'In addition, participants will be introduced to the concepts of programs and portfolios, clarifying how individual projects contribute to broader strategic goals. This perspective reinforces the idea that projects are not isolated efforts but part of a larger system designed to deliver value and competitive advantage.',
  'Throughout this introductory session, attention is given to common challenges and causes of project failure, such as unclear objectives, poor communication, unmanaged risks, and lack of stakeholder engagement. By understanding these pitfalls early, learners are better prepared to recognize warning signs and apply corrective actions in their own project environments.',
  'By the end of this session, participants will have a clear understanding of the purpose of project management, the expectations of a project manager at the core level, and the structure of the learning journey ahead. This foundation enables learners to engage confidently with subsequent sessions, apply concepts consistently, and begin developing the professional mindset required for successful project delivery.',
  'The Project Management Core Certificate is not only about acquiring knowledge—it is about building capability. This first session sets the tone for a practical, disciplined, and value-driven approach to managing projects, empowering participants to contribute more effectively to their teams, organizations, and careers.',
];

const SHORT_PLACEHOLDER: readonly string[] = [
  'This chapter covers the key concepts and frameworks that underpin this topic. Participants will develop a solid understanding of the terminology, principles, and practical applications relevant to this section of the program.',
  'Through structured examples and real-world scenarios, learners will be able to apply the concepts discussed here to their professional contexts and contribute more effectively to project outcomes.',
];

const ESM_P_SESSION_1_CHAPTERS: readonly SessionChapter[] = [
  { id: 'ch-what-is-project', title: 'What Is a Project?', paragraphs: SHORT_PLACEHOLDER },
  { id: 'ch-introduction', title: 'Introduction', paragraphs: INTRO_PARAGRAPHS },
  { id: 'ch-pm-vs-ops', title: 'Project Management vs. Operations', paragraphs: SHORT_PLACEHOLDER },
  { id: 'ch-role-pm', title: 'The Role of the Project Manager', paragraphs: SHORT_PLACEHOLDER },
  {
    id: 'ch-programs-portfolios',
    title: 'Projects, Programs, and Portfolios Overview',
    paragraphs: SHORT_PLACEHOLDER,
  },
  {
    id: 'ch-best-practices',
    title: 'Project Management Best Practices',
    paragraphs: SHORT_PLACEHOLDER,
  },
  {
    id: 'ch-agile-waterfall',
    title: 'Agile vs Waterfall Methodologies',
    paragraphs: SHORT_PLACEHOLDER,
  },
  {
    id: 'ch-kpis',
    title: 'Key Performance Indicators (KPIs) in Project Management',
    paragraphs: SHORT_PLACEHOLDER,
  },
  {
    id: 'ch-risk-management',
    title: 'Risk Management Strategies for Successful Projects',
    paragraphs: SHORT_PLACEHOLDER,
  },
];

const ESM_P_SESSIONS: readonly CertSessionData[] = [
  {
    materialId: 'session-1-a',
    sessionTitle: 'Session 1',
    certCode: 'ESM-P',
    chapters: ESM_P_SESSION_1_CHAPTERS,
  },
  {
    materialId: 'session-1-b',
    sessionTitle: 'Session 1',
    certCode: 'ESM-P',
    chapters: ESM_P_SESSION_1_CHAPTERS,
  },
  {
    materialId: 'session-1-c',
    sessionTitle: 'Session 1',
    certCode: 'ESM-P',
    chapters: ESM_P_SESSION_1_CHAPTERS,
  },
  {
    materialId: 'session-2',
    sessionTitle: 'Session 2',
    certCode: 'ESM-P',
    chapters: [
      { id: 'ch-s2-intro', title: 'Introduction to Session 2', paragraphs: SHORT_PLACEHOLDER },
      { id: 'ch-s2-scope', title: 'Defining Project Scope', paragraphs: SHORT_PLACEHOLDER },
      { id: 'ch-s2-wbs', title: 'Work Breakdown Structure', paragraphs: SHORT_PLACEHOLDER },
    ],
  },
  {
    materialId: 'session-3',
    sessionTitle: 'Session 3',
    certCode: 'ESM-P',
    chapters: [
      { id: 'ch-s3-intro', title: 'Introduction to Session 3', paragraphs: SHORT_PLACEHOLDER },
      { id: 'ch-s3-schedule', title: 'Project Scheduling', paragraphs: SHORT_PLACEHOLDER },
    ],
  },
  {
    materialId: 'session-4',
    sessionTitle: 'Session 4',
    certCode: 'ESM-P',
    chapters: [
      { id: 'ch-s4-intro', title: 'Introduction to Session 4', paragraphs: SHORT_PLACEHOLDER },
      { id: 'ch-s4-budget', title: 'Budget Management', paragraphs: SHORT_PLACEHOLDER },
    ],
  },
  {
    materialId: 'session-5',
    sessionTitle: 'Session 5',
    certCode: 'ESM-P',
    chapters: [
      { id: 'ch-s5-intro', title: 'Introduction to Session 5', paragraphs: SHORT_PLACEHOLDER },
      { id: 'ch-s5-closing', title: 'Project Closure', paragraphs: SHORT_PLACEHOLDER },
    ],
  },
];

/* --------------------------------------------------------------------------
 * Static helpers
 * -------------------------------------------------------------------------- */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function monthScores(scoreMap: Partial<Record<string, number>>) {
  return MONTHS.map((month) => ({
    month,
    score: scoreMap[month] ?? null,
  }));
}

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

function weekScores(scoreMap: Partial<Record<string, number>>): readonly WeeklyScore[] {
  return DAYS.map((day) => ({
    day,
    score: scoreMap[day] ?? null,
  }));
}

/* --------------------------------------------------------------------------
 * Mock data — "All certifications" grid (bottom section, same in both states)
 * -------------------------------------------------------------------------- */

const ALL_CERTS: readonly CertListCard[] = [
  {
    code: 'ESM',
    name: 'Endorsed Scrum Master',
    description: 'Foundation level — core Scrum principles and practices.',
    badgeAsset: 'assets/badge/endorsed_scrum_master.svg',
    family: 'esm',
    level: 'Foundation',
    isEnrolled: true,
    progressPercent: 53,
    examResult: {
      score: 74,
      passed: true,
      status: 'earned',
      duration: '40 min',
      date: '03/06/2026 - 2:00pm',
      correct: 31,
      incorrect: 43,
    },
  },
  {
    code: 'ESM-P',
    name: 'Endorsed Scrum Master Practitioner',
    description: 'Practitioner level — advanced facilitation and coaching.',
    badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
    family: 'esm',
    level: 'Practitioner',
    isEnrolled: true,
    progressPercent: 53,
    examResult: {
      score: 32,
      passed: false,
      status: 'failed',
      duration: '40 min',
      date: '03/06/2026 - 2:00pm',
      correct: 14,
      incorrect: 29,
    },
  },
  {
    code: 'ESM-A',
    name: 'Endorsed Scrum Master Authority',
    description: 'Authority level — enterprise-wide Agile transformation.',
    badgeAsset: 'assets/badge/endorsed_scrum_master_authority.svg',
    family: 'esm',
    level: 'Authority',
    isEnrolled: false,
    progressPercent: 0,
    examResult: null,
  },
  {
    code: 'EPO-P',
    name: 'Endorsed Product Owner Practitioner',
    description: 'Practitioner level — advanced product strategy and OKRs.',
    badgeAsset: 'assets/badge/endorsed_product_owner_practitioner.svg',
    family: 'epo',
    level: 'Practitioner',
    isEnrolled: false,
    progressPercent: 0,
    examResult: {
      score: 64,
      passed: true,
      status: 'earned',
      duration: '40 min',
      date: '03/06/2026 - 2:00pm',
      correct: 31,
      incorrect: 43,
    },
  },
  {
    code: 'EPO-A',
    name: 'Endorsed Product Owner Authority',
    description: 'Authority level — product-led growth and portfolio management.',
    badgeAsset: 'assets/badge/endorsed_product_owner_authority.svg',
    family: 'epo',
    level: 'Authority',
    isEnrolled: false,
    progressPercent: 0,
    examResult: {
      score: 28,
      passed: false,
      status: 'revoked',
      duration: '40 min',
      date: '03/06/2026 - 2:00pm',
      correct: 10,
      incorrect: 45,
    },
  },
  {
    code: 'ESF',
    name: 'Endorsed Scrum Facilitator',
    description: 'Foundation level — Scrum facilitation and team dynamics.',
    badgeAsset: 'assets/badge/endorsed_scrum_facilitator.svg',
    family: 'esf',
    level: 'Foundation',
    isEnrolled: false,
    progressPercent: 0,
    examResult: {
      score: 85,
      passed: true,
      status: 'earned',
      duration: '40 min',
      date: '03/06/2026 - 2:00pm',
      correct: 38,
      incorrect: 27,
    },
  },
];

/* --------------------------------------------------------------------------
 * Mock test question bank — ESM-P
 * Figma: nodes 17737-49884, 13144-55249, 13434-35306 (runner screens)
 * -------------------------------------------------------------------------- */

const ESM_P_MOCK_TEST_QUESTIONS: readonly MockTestQuestion[] = [
  {
    id: 'q-esm-p-01',
    text: 'Which of the following best describes the primary purpose of the Sprint in Scrum?',
    options: [
      { id: 'A', text: 'To plan all project work for the next quarter' },
      { id: 'B', text: 'To create a usable, potentially releasable product increment' },
      { id: 'C', text: "To review the team's performance and assign tasks" },
      { id: 'D', text: 'To document requirements for stakeholder approval' },
    ],
    correctOptionId: 'B',
    hint: 'Think about what a Sprint produces at the end — it must be something the stakeholders can inspect and potentially use.',
  },
  {
    id: 'q-esm-p-02',
    text: 'Who is responsible for maximizing the value of the product and the work of the Development Team?',
    options: [
      { id: 'A', text: 'Scrum Master' },
      { id: 'B', text: 'Development Team' },
      { id: 'C', text: 'Product Owner' },
      { id: 'D', text: 'Stakeholder' },
    ],
    correctOptionId: 'C',
    hint: 'This role owns the Product Backlog and decides on the order of work items.',
  },
  {
    id: 'q-esm-p-03',
    text: 'What is the recommended duration of a Sprint according to the Scrum Guide?',
    options: [
      { id: 'A', text: 'One to six weeks' },
      { id: 'B', text: 'Exactly two weeks' },
      { id: 'C', text: 'No more than one month' },
      { id: 'D', text: 'As long as needed to complete the Sprint Goal' },
    ],
    correctOptionId: 'C',
    hint: 'The Scrum Guide states a fixed upper boundary for Sprint length to maintain predictability and limit risk.',
  },
  {
    id: 'q-esm-p-04',
    text: 'Which Scrum event serves as an opportunity for the Development Team to inspect its own process and create a plan for improvements?',
    options: [
      { id: 'A', text: 'Sprint Review' },
      { id: 'B', text: 'Sprint Retrospective' },
      { id: 'C', text: 'Daily Scrum' },
      { id: 'D', text: 'Sprint Planning' },
    ],
    correctOptionId: 'B',
    hint: 'This event focuses on the team itself — how it works, not what it builds.',
  },
  {
    id: 'q-esm-p-05',
    text: 'What artifact provides transparency into the work selected for the Sprint and the progress toward the Sprint Goal?',
    options: [
      { id: 'A', text: 'Product Backlog' },
      { id: 'B', text: 'Increment' },
      { id: 'C', text: 'Sprint Backlog' },
      { id: 'D', text: 'Release Plan' },
    ],
    correctOptionId: 'C',
    hint: 'This artifact is owned by the Development Team and is visible only for the current Sprint.',
  },
  {
    id: 'q-esm-p-06',
    text: 'The Scrum Master serves the Product Owner in which of the following ways?',
    options: [
      { id: 'A', text: 'Writing acceptance criteria for Product Backlog items' },
      { id: 'B', text: 'Ensuring the team completes all Product Backlog items in a Sprint' },
      { id: 'C', text: 'Facilitating Scrum events as requested or needed' },
      {
        id: 'D',
        text: 'Helping understand product goal techniques and finding techniques for effective Product Backlog management',
      },
    ],
    correctOptionId: 'D',
    hint: 'The Scrum Master helps the Product Owner understand how to manage the Product Backlog effectively.',
  },
  {
    id: 'q-esm-p-07',
    text: 'Which of the following best describes the "Definition of Done" in Scrum?',
    options: [
      { id: 'A', text: 'A checklist created by the Product Owner to approve Sprint Backlog items' },
      {
        id: 'B',
        text: 'A formal understanding of the state of the Increment when it meets the quality measures required',
      },
      { id: 'C', text: 'A document signed by stakeholders confirming the Sprint deliverables' },
      { id: 'D', text: 'A set of requirements agreed upon before each Sprint Planning' },
    ],
    correctOptionId: 'B',
    hint: 'This is a shared standard that gives the team a shared understanding of what "complete" means for an Increment.',
  },
  {
    id: 'q-esm-p-08',
    text: 'During a Sprint, who has the authority to cancel the Sprint?',
    options: [
      { id: 'A', text: 'Scrum Master' },
      { id: 'B', text: 'Development Team' },
      { id: 'C', text: 'Product Owner' },
      { id: 'D', text: 'Any Scrum Team member' },
    ],
    correctOptionId: 'C',
    hint: 'Only one role can cancel a Sprint, and they do so when the Sprint Goal becomes obsolete.',
  },
  {
    id: 'q-esm-p-09',
    text: 'What is the primary outcome of the Sprint Review?',
    options: [
      { id: 'A', text: 'An updated Sprint Backlog for the next Sprint' },
      { id: 'B', text: 'A revised Product Backlog based on stakeholder feedback' },
      { id: 'C', text: 'Acceptance of all completed Sprint Backlog items by the Product Owner' },
      { id: 'D', text: 'A performance report for the Development Team' },
    ],
    correctOptionId: 'B',
    hint: 'The Sprint Review is an opportunity to inspect the Increment and adapt the Product Backlog if needed.',
  },
  {
    id: 'q-esm-p-10',
    text: 'Which of the following is NOT an accountability of the Development Team in Scrum?',
    options: [
      { id: 'A', text: 'Self-organizing to accomplish the Sprint Goal' },
      { id: 'B', text: 'Ordering the Product Backlog to achieve goals' },
      { id: 'C', text: 'Creating the Sprint Backlog' },
      { id: 'D', text: 'Delivering a Done Increment each Sprint' },
    ],
    correctOptionId: 'B',
    hint: 'Ordering the Product Backlog is a responsibility belonging to a different role on the Scrum Team.',
  },
];

/* --------------------------------------------------------------------------
 * Mock test data — ESM-P
 * Figma: node 13567-16238 (Mock test section)
 * -------------------------------------------------------------------------- */

const ESM_P_MOCK_TEST_STATS: MockTestStats = {
  totalAttempts: 5,
  bestScorePercent: 95,
  avgScorePercent: 46,
  totalTimeMinutes: 640, // 10h 40m
};

const ESM_P_MOCK_TEST_HISTORY: readonly MockTestAttempt[] = [
  {
    title: 'mock test 1',
    totalQuestions: 70,
    date: '03/06/2026 - 2:00pm',
    correct: 31,
    incorrect: 43,
    status: 'passed',
    scorePercent: 64,
  },
  {
    title: 'mock test 2',
    totalQuestions: 75,
    date: '04/06/2026 - 3:00pm',
    correct: 29,
    incorrect: 46,
    status: 'passed',
    scorePercent: 68,
  },
  {
    title: 'mock test 3',
    totalQuestions: 80,
    date: '05/06/2026 - 1:00pm',
    correct: 32,
    incorrect: 50,
    status: 'passed',
    scorePercent: 70,
  },
  {
    title: 'mock test 4',
    totalQuestions: 65,
    date: '06/06/2026 - 4:00pm',
    correct: 35,
    incorrect: 40,
    status: 'passed',
    scorePercent: 72,
  },
  {
    title: 'mock test 5',
    totalQuestions: 90,
    date: '07/06/2026 - 10:00am',
    correct: 30,
    incorrect: 55,
    status: 'passed',
    scorePercent: 75,
  },
  {
    title: 'mock test 6',
    totalQuestions: 100,
    date: '08/06/2026 - 5:00pm',
    correct: 28,
    incorrect: 60,
    status: 'passed',
    scorePercent: 78,
  },
  {
    title: 'mock test 7',
    totalQuestions: 85,
    date: '09/06/2026 - 11:00am',
    correct: 24,
    incorrect: 54,
    status: 'failed',
    scorePercent: 40,
  },
];

/* --------------------------------------------------------------------------
 * Mock detail — ESM-P (low completion, 12%)
 * Figma node 13567-14984
 * -------------------------------------------------------------------------- */

const ESM_P_DETAIL_LOW: CertDetail = {
  code: 'ESM-P',
  fullName: 'Endorsed Scrum Master Practitioner',
  family: 'esm',
  badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
  stats: {
    completionPercent: 12,
    averageScorePercent: 0,
    totalTimeMinutes: 45,
    trendDelta: 0,
  },
  learningHeading: 'First file is ready to explore!',
  learningBody: 'Agile Methodologies Overview',
  learningMeta: '15 pages',
  learningCtaLabel: 'Start learning',
  learningCtaStyle: 'primary',
  certificationCard: {
    code: 'ESM-P',
    title: 'Endorsed Scrum Master Practitioner',
    issuer: 'Institute of Scrum',
    imageAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
    isEarned: false,
    issuedDate: null,
    expiryDate: null,
    progressPercent: 12,
  },
  monthlyScores: monthScores({ Feb: 0 }),
  weeklyScores: weekScores({}),
  examSummary: { passed: 0, failed: 0 },
  yearFilter: 'this_year',
  weekFilter: 'this_week',
  learningMaterials: ESM_P_MATERIALS,
  mockTestStats: ESM_P_MOCK_TEST_STATS,
  mockTestHistory: ESM_P_MOCK_TEST_HISTORY,
  mockTestQuestions: ESM_P_MOCK_TEST_QUESTIONS,
};

/* --------------------------------------------------------------------------
 * Mock detail — ESM-P (high completion, 95%)
 * Figma node 13568-23341
 * -------------------------------------------------------------------------- */

const ESM_P_DETAIL_HIGH: CertDetail = {
  code: 'ESM-P',
  fullName: 'Endorsed Scrum Master Practitioner',
  family: 'esm',
  badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
  stats: {
    completionPercent: 95,
    averageScorePercent: 43,
    totalTimeMinutes: 763, // 12h 43m
    trendDelta: 10,
  },
  learningHeading: 'We think you are ready to pass Test! (ESM-P)',
  learningBody:
    'You achieved amazing results in the mock exam, and reviewed all the attached files.',
  learningCtaLabel: 'Start Exam',
  learningCtaStyle: 'primary',
  certificationCard: {
    code: 'ESM-P',
    title: 'Endorsed Scrum Master Practitioner',
    issuer: 'Institute of Scrum',
    imageAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
    isEarned: false,
    issuedDate: null,
    expiryDate: null,
    progressPercent: 53,
  },
  monthlyScores: monthScores({ Feb: 65, Mar: 45, Apr: 50, May: 28 }),
  weeklyScores: weekScores({ Sat: 35, Sun: 38, Mon: 42, Tue: 44, Wed: 48, Thu: 52, Fri: 60 }),
  examSummary: { passed: 24, failed: 20 },
  yearFilter: 'this_year',
  weekFilter: 'this_week',
  learningMaterials: ESM_P_MATERIALS,
  mockTestStats: ESM_P_MOCK_TEST_STATS,
  mockTestHistory: ESM_P_MOCK_TEST_HISTORY,
  mockTestQuestions: ESM_P_MOCK_TEST_QUESTIONS,
};

/* --------------------------------------------------------------------------
 * Enrolled cert headers — 1-cert and 2-cert list states
 * -------------------------------------------------------------------------- */

const ESM_P_HEADER: EnrolledCertHeader = {
  code: 'ESM-P',
  family: 'esm',
  familyLabel: 'ESM',
  certType: 'Practitioner',
  fullName: 'ESM - Endorsed Scrum Master',
  badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
  progressPercent: 53,
  isActive: true,
  hasCertificate: false,
};

const EPO_A_HEADER: EnrolledCertHeader = {
  code: 'EPO-A',
  family: 'epo',
  familyLabel: 'EPO',
  certType: 'Authority',
  fullName: 'EPO - Endorsed Product Owner',
  badgeAsset: 'assets/badge/endorsed_product_owner_authority.svg',
  progressPercent: 53,
  isActive: true,
  hasCertificate: false,
};

/* --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function translateActionLabel(label: string, lang: LanguageService): string {
  const keyMap: Record<string, string> = {
    Open: 'dashboard.certs.materialOpen',
    Continue: 'dashboard.certs.materialContinue',
    'In Progress': 'dashboard.certs.materialInProgress',
    'Not Started': 'dashboard.certs.materialNotStarted',
    Completed: 'dashboard.certs.materialCompleted',
  };
  return lang.t(keyMap[label] ?? label);
}

/* --------------------------------------------------------------------------
 * Demo mode
 * -------------------------------------------------------------------------- */

/** Demo modes to cycle through while developing. */
export type CertDemoMode =
  | 'one-cert-low' // 1 enrolled cert, 12% completion detail
  | 'one-cert-high' // 1 enrolled cert, 95% completion detail
  | 'two-certs-low' // 2 enrolled certs, 12% completion detail
  | 'two-certs-high'; // 2 enrolled certs, 95% completion detail

const STATES: Record<CertDemoMode, CertificatesState> = {
  'one-cert-low': {
    enrolledCerts: [ESM_P_HEADER],
    allCerts: ALL_CERTS,
    selectedDetail: ESM_P_DETAIL_LOW,
    activeSection: 'overview',
    sessions: ESM_P_SESSIONS,
  },
  'one-cert-high': {
    enrolledCerts: [ESM_P_HEADER],
    allCerts: ALL_CERTS,
    selectedDetail: ESM_P_DETAIL_HIGH,
    activeSection: 'overview',
    sessions: ESM_P_SESSIONS,
  },
  'two-certs-low': {
    enrolledCerts: [ESM_P_HEADER, EPO_A_HEADER],
    allCerts: ALL_CERTS,
    selectedDetail: ESM_P_DETAIL_LOW,
    activeSection: 'overview',
    sessions: ESM_P_SESSIONS,
  },
  'two-certs-high': {
    enrolledCerts: [ESM_P_HEADER, EPO_A_HEADER],
    allCerts: ALL_CERTS,
    selectedDetail: ESM_P_DETAIL_HIGH,
    activeSection: 'overview',
    sessions: ESM_P_SESSIONS,
  },
};

/* --------------------------------------------------------------------------
 * Store
 * -------------------------------------------------------------------------- */

/**
 * CertificatesStore — signals-based store for the My Certificates feature.
 *
 * Public API:
 *   · state             Signal<CertificatesState>
 *   · demoMode          Signal<CertDemoMode>
 *   · setDemoMode(mode)
 *   · setActiveSection(section)
 *   · setYearFilter(year)   — changes the year filter on the detail chart
 *   · Derived signals: enrolledCerts, allCerts, selectedDetail, activeSection,
 *     totalTimeFormatted, averageScoreFormatted, trendFormatted, yearFilter
 */
@Injectable({ providedIn: 'root' })
export class CertificatesStore {
  /* ── private state ───────────────────────────────────────────────────── */

  private readonly lang = inject(LanguageService);
  private readonly _demoMode = signal<CertDemoMode>('one-cert-high');
  private readonly _activeSection = signal<CertDetailSection>('overview');
  private readonly _yearFilter = signal<'this_year' | 'last_year'>('this_year');
  private readonly _weekFilter = signal<ScoreFilterWeek>('this_week');
  /** ID of the chapter currently active in the session viewer. */
  private readonly _activeChapterId = signal<string | null>(null);

  /* ── public read-only views ──────────────────────────────────────────── */

  readonly demoMode = this._demoMode.asReadonly();
  readonly state = computed<CertificatesState>(() => STATES[this._demoMode()]);
  readonly yearFilter = this._yearFilter.asReadonly();
  readonly weekFilter = this._weekFilter.asReadonly();
  readonly activeChapterId = this._activeChapterId.asReadonly();

  /* ── convenience derivations ─────────────────────────────────────────── */

  readonly enrolledCerts = computed(() => this.state().enrolledCerts);
  readonly allCerts = computed(() => this.state().allCerts);
  readonly selectedDetail = computed(() => {
    const detail = this.state().selectedDetail;
    if (!detail) return null;
    const materials = detail.learningMaterials.map((m) => ({
      ...m,
      actionLabel: translateActionLabel(m.actionLabel, this.lang),
    }));
    if (detail.learningCtaLabel === 'Start learning') {
      return {
        ...detail,
        learningMaterials: materials,
        learningHeading: this.lang.t('dashboard.learning.firstFileReady'),
        learningBody: this.lang.t('dashboard.learning.agileOverview'),
        learningMeta: this.lang.t('dashboard.learning.pagesCount', { count: '15' }),
        learningCtaLabel: this.lang.t('dashboard.learning.ctaStart'),
      };
    }
    return {
      ...detail,
      learningMaterials: materials,
      learningHeading: this.lang.t('dashboard.learning.readyToPass', { code: detail.code }),
      learningBody: this.lang.t('dashboard.learning.amazingResults'),
      learningCtaLabel: this.lang.t(
        detail.learningCtaLabel === 'Start Final Test'
          ? 'dashboard.learning.ctaFinalTest'
          : 'dashboard.learning.ctaStartExam',
      ),
    };
  });
  readonly activeSection = computed(() => this._activeSection());
  readonly sessions = computed(() => this.state().sessions);

  /** Look up a session by materialId (used by CertSessionPage via route param). */
  sessionByMaterialId(materialId: string): CertSessionData | null {
    return this.sessions().find((s) => s.materialId === materialId) ?? null;
  }

  readonly stats = computed(() => this.selectedDetail()?.stats ?? null);

  /** "0%" or "43%" */
  readonly averageScoreFormatted = computed(() => {
    const s = this.stats();
    return s ? `${s.averageScorePercent}%` : '0%';
  });

  /** "00{hours}" or "12{hours} 43{minutes}" */
  readonly totalTimeFormatted = computed(() => {
    const mins = this.stats()?.totalTimeMinutes ?? 0;
    if (mins === 0) return this.lang.t('dashboard.certs.hoursAbbr', { count: '00' });
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hStr = h.toString();
    if (m > 0) {
      return `${this.lang.t('dashboard.certs.hoursAbbr', { count: hStr })} ${this.lang.t('dashboard.certs.minutesAbbr', { count: m.toString() })}`;
    }
    return this.lang.t('dashboard.certs.hoursAbbr', { count: hStr });
  });

  /** "+5%" or "-2%" or "—" */
  readonly trendFormatted = computed(() => {
    const delta = this.stats()?.trendDelta ?? 0;
    if (delta === 0) return '—';
    return delta > 0 ? `+${delta}%` : `${delta}%`;
  });

  readonly trendIsPositive = computed(() => (this.stats()?.trendDelta ?? 0) > 0);

  /* ── actions ─────────────────────────────────────────────────────────── */

  setDemoMode(mode: CertDemoMode): void {
    this._demoMode.set(mode);
    this._activeSection.set('overview');
  }

  setActiveSection(section: CertDetailSection): void {
    this._activeSection.set(section);
  }

  setYearFilter(year: 'this_year' | 'last_year'): void {
    this._yearFilter.set(year);
  }

  setWeekFilter(week: ScoreFilterWeek): void {
    this._weekFilter.set(week);
  }

  /**
   * Opens a session viewer and sets the active chapter.
   * Pass `chapterId = null` to default to the first chapter of that session.
   */
  openSession(materialId: string, chapterId: string | null = null): void {
    const session = this.sessionByMaterialId(materialId);
    if (!session) return;
    const firstChapterId = session.chapters[0]?.id ?? null;
    this._activeChapterId.set(chapterId ?? firstChapterId);
  }

  setActiveChapter(chapterId: string): void {
    this._activeChapterId.set(chapterId);
  }
}
