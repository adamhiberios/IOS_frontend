/**
 * Final-exam domain types for the `assessments` feature.
 *
 * These mirror the shape of `MockTestQuestion` in the `certificates` feature
 * but are intentionally kept separate — cross-feature imports are banned per
 * CLAUDE.md §4. If a shared exam-question type becomes necessary, promote it
 * to `@shared` via an architect ADR.
 */

export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface ExamOption {
  readonly id: OptionId;
  readonly text: string;
}

export interface ExamQuestion {
  /** Stable unique identifier — e.g. "q-epo-p-01". */
  readonly id: string;
  /** Full question text shown in the question panel. */
  readonly text: string;
  /** Exactly 4 answer options in display order. */
  readonly options: readonly ExamOption[];
  /**
   * The correct answer id. Hidden from the UI during the exam —
   * only surfaced on the results page after the learner submits.
   */
  readonly correctOptionId: OptionId;
}

/**
 * State passed from the exam runner to the result page via Angular router
 * navigation extras (`state`). Consumed in the constructor of
 * `ExamResultPage` via `router.getCurrentNavigation()?.extras?.state`.
 */
export interface ExamResultNavState {
  readonly questions: readonly ExamQuestion[];
  readonly answers: Record<number, OptionId | null>;
}

// Epic-9: replace with backend-resolved data fetched from the assessments API.
export const DEMO_EXAM_QUESTIONS: readonly ExamQuestion[] = [
  {
    id: 'q-epo-p-01',
    text: 'A Scrum team is struggling to complete Sprint Goals consistently. What is the most appropriate action for the Scrum Master to take?',
    options: [
      { id: 'A', text: 'Assign tasks directly to developers' },
      { id: 'B', text: 'Facilitate a retrospective to identify root causes' },
      { id: 'C', text: 'Extend the Sprint length' },
      { id: 'D', text: 'Remove the Product Owner from planning' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-02',
    text: 'Who is responsible for maximising the value of the product resulting from the work of the Scrum Team?',
    options: [
      { id: 'A', text: 'Scrum Master' },
      { id: 'B', text: 'Development Team' },
      { id: 'C', text: 'Product Owner' },
      { id: 'D', text: 'Stakeholders' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-03',
    text: 'Which of the following best describes the Product Backlog?',
    options: [
      { id: 'A', text: 'A fixed list of features agreed at the start of the project' },
      { id: 'B', text: 'An ordered list of everything that might be needed in the product' },
      { id: 'C', text: 'A list of tasks assigned to individual developers' },
      { id: 'D', text: 'A document that describes the technical architecture' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-04',
    text: 'What is the recommended maximum length of a Sprint?',
    options: [
      { id: 'A', text: 'Two weeks' },
      { id: 'B', text: 'One month' },
      { id: 'C', text: 'Three months' },
      { id: 'D', text: 'Six weeks' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-05',
    text: 'During Sprint Planning, who is responsible for creating the Sprint Backlog?',
    options: [
      { id: 'A', text: 'The Product Owner alone' },
      { id: 'B', text: 'The Scrum Master alone' },
      { id: 'C', text: 'The entire Scrum Team collaboratively' },
      { id: 'D', text: 'External project managers' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-06',
    text: 'What is the primary purpose of the Sprint Review?',
    options: [
      { id: 'A', text: 'To inspect the increment and adapt the Product Backlog if needed' },
      { id: 'B', text: 'To evaluate team performance and allocate bonuses' },
      { id: 'C', text: 'To report project status to senior management' },
      { id: 'D', text: 'To create detailed documentation of the Sprint work' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-07',
    text: 'Which artifact provides transparency to the work remaining for the Sprint Goal?',
    options: [
      { id: 'A', text: 'Product Backlog' },
      { id: 'B', text: 'Increment' },
      { id: 'C', text: 'Sprint Backlog' },
      { id: 'D', text: 'Release plan' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-08',
    text: 'A stakeholder requests a change to the product mid-Sprint. What should the Product Owner do?',
    options: [
      { id: 'A', text: 'Immediately add it to the current Sprint Backlog' },
      {
        id: 'B',
        text: 'Add it to the Product Backlog for future consideration and order it appropriately',
      },
      { id: 'C', text: 'Reject the request without further discussion' },
      { id: 'D', text: 'Cancel the Sprint and restart with the new requirement' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-09',
    text: 'What does "Definition of Done" represent in Scrum?',
    options: [
      { id: 'A', text: 'A list of tasks completed by developers in a Sprint' },
      { id: 'B', text: 'A shared understanding of what it means for work to be complete' },
      { id: 'C', text: 'The acceptance criteria written by the Product Owner' },
      { id: 'D', text: 'A sign-off form signed by stakeholders' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q-epo-p-10',
    text: 'In Scrum, who has the authority to cancel a Sprint?',
    options: [
      { id: 'A', text: 'Scrum Master' },
      { id: 'B', text: 'Development Team' },
      { id: 'C', text: 'Product Owner' },
      { id: 'D', text: 'Project Sponsor' },
    ],
    correctOptionId: 'B',
  },
];
