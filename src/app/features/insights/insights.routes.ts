import { type Routes } from '@angular/router';

/**
 * Insights feature routes — mounted at `/insights` in app.routes.ts.
 *
 * Public route: no guard. Both authenticated and unauthenticated users reach
 * this page.
 */
const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/insights.page').then((m) => m.InsightsPage),
    title: 'Insights — Institute of Scrum',
  },
];

export default routes;
