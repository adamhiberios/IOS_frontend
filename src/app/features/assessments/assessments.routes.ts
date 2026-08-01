import { type Routes } from '@angular/router';

import { EXAM_DRAFT_STORE, IdbExamDraftStore } from './data-access/exam-draft.store';
import { ExamSessionStore } from './data-access/exam-session.store';
import { ExamSessionWs } from './data-access/exam-session.ws';
import { examDraftSweepGuard } from './guards/exam-draft-sweep.guard';

/**
 * Assessments — the highest-stakes feature in the app. The exam runner is a
 * separate lazy chunk so socket.io-client + the engine never bleed into other
 * routes; see CLAUDE.md §10 and /docs/08-exam-engine.md.
 *
 * Routes:
 *   /assessments/verify            → ExamVerifyPage  (validate-access + identity — Slice 5b)
 *   /assessments/ready             → ExamReadyPage   (start CTA — Slice 5b)
 *   /assessments/run/:sessionId    → ExamRunnerPage  (in-exam; route-scoped store + WS)
 *   /assessments/result/:sessionId → ExamResultPage  (score-only; review disabled, BE-I-22)
 *
 * `ExamSessionStore` and `ExamSessionWs` are provided at the `run` route so a
 * fresh instance is created per attempt and destroyed (with its socket, timers,
 * and subscriptions) on route exit. `EXAM_DRAFT_STORE` is bound to the IDB
 * implementation here for clarity, though its root factory default is identical.
 */
const RUN_PROVIDERS = [
  ExamSessionStore,
  ExamSessionWs,
  { provide: EXAM_DRAFT_STORE, useClass: IdbExamDraftStore },
];

export const ASSESSMENTS_ROUTES: Routes = [
  {
    // Pathless wrapper — sweeps stale drafts on entry to the assessments area
    // (in the lazy chunk, so the IDB code never lands in the app shell).
    path: '',
    canActivate: [examDraftSweepGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Assessments',
        children: [],
      },
      {
        path: 'verify',
        title: 'Verify Exam — Institute of Scrum',
        loadComponent: () => import('./pages/exam-verify.page').then((m) => m.ExamVerifyPage),
      },
      {
        path: 'ready',
        title: 'Exam Ready — Institute of Scrum',
        loadComponent: () => import('./pages/exam-ready.page').then((m) => m.ExamReadyPage),
      },
      {
        path: 'run/:sessionId',
        title: 'Final Exam — Institute of Scrum',
        providers: RUN_PROVIDERS,
        loadComponent: () => import('./pages/exam-runner.page').then((m) => m.ExamRunnerPage),
      },
      {
        path: 'result/:sessionId',
        title: 'Exam Results — Institute of Scrum',
        loadComponent: () => import('./pages/exam-result.page').then((m) => m.ExamResultPage),
      },
      {
        // Keyed by attemptId, not sessionId — the review endpoint takes the
        // attempt, and `submit` doesn't return one (BE-I-32). Reached from the
        // dashboard's real-exam history, which has the id.
        path: 'review/:attemptId',
        title: 'Answer Review — Institute of Scrum',
        loadComponent: () => import('./pages/exam-review.page').then((m) => m.ExamReviewPage),
      },
    ],
  },
];

export default ASSESSMENTS_ROUTES;
