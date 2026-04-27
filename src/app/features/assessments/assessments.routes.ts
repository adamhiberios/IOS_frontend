import { type Routes } from '@angular/router';

/**
 * Assessments — the highest-stakes feature in the app. The exam runner page
 * MUST be a separate lazy chunk so the bundle does not bleed into other
 * routes; see CLAUDE.md §10 and /docs/09 for the discipline that applies here.
 */
export const ASSESSMENTS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Assessments',
    children: [],
  },
  {
    path: ':assessmentId/run',
    title: 'Exam',
    // TODO(epic-9): loadComponent for the exam runner; ensure the chunk stays
    // under the per-route 100 kB gzip budget (CLAUDE.md §7).
    children: [],
  },
];

export default ASSESSMENTS_ROUTES;
