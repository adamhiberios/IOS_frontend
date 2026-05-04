import { type Routes } from '@angular/router';

/**
 * Insights feature routes — mounted at `/insights` in app.routes.ts.
 *
 * Public routes: no guard. Both authenticated and unauthenticated users reach
 * these pages.
 */
const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/insights.page').then((m) => m.InsightsPage),
    title: 'Insights — Institute of Scrum',
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/insight-detail.page').then((m) => m.InsightDetailPage),
    title: 'Insight — Institute of Scrum',
  },
];

export default routes;
