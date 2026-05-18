import { type Routes } from '@angular/router';

/**
 * Assessments — the highest-stakes feature in the app. The exam runner page
 * MUST be a separate lazy chunk so the bundle does not bleed into other
 * routes; see CLAUDE.md §10 and /docs/09 for the discipline that applies here.
 *
 * Exam verify flow (Figma nodes 13271-13551, 13269-13490, 13461-40691):
 *   /assessments/verify   → ExamVerifyPage  (instructions + confirm dialog + success dialog)
 *
 * Exam ready page (Figma node 13271-14042) — reached via the email link:
 *   /assessments/ready    → ExamReadyPage   (certification badge + "Let's start" CTA)
 *
 * Exam runner (Figma node 13271-13907):
 *   /assessments/run      → ExamRunnerPage  (question panel + timer + EPO-green sidebar)
 *
 * Exam result (Figma node 13172-56939):
 *   /assessments/result   → ExamResultPage  (reveals correct answers, score, share)
 *
 * Epic-9: replace DEMO_EXAM_QUESTIONS with a backend-resolved signal; wire
 * the WebSocket heartbeat and IndexedDB sync per CLAUDE.md §10.
 */
export const ASSESSMENTS_ROUTES: Routes = [
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
    path: 'run',
    title: 'Final Exam — Institute of Scrum',
    loadComponent: () => import('./pages/exam-runner.page').then((m) => m.ExamRunnerPage),
  },
  {
    path: 'result',
    title: 'Exam Results — Institute of Scrum',
    loadComponent: () => import('./pages/exam-result.page').then((m) => m.ExamResultPage),
  },
];

export default ASSESSMENTS_ROUTES;
