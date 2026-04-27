import { type Routes } from '@angular/router';

/**
 * Dashboard routes — the post-login landing surface. Different user roles see
 * different widget mixes; the page itself is one route, the role-aware
 * composition lives inside the page component (epic 4+).
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dashboard',
    children: [],
  },
];

export default DASHBOARD_ROUTES;
