import { type Routes } from '@angular/router';

/**
 * Auth feature routes — login, password reset, MFA, etc.
 * Lazy-loaded from app.routes.ts; never imported directly elsewhere.
 *
 * Placeholder: concrete pages land in epic 3 (auth). For now the route
 * exists so the lazy chunk boundary is established and the guards / RBAC
 * work in subsequent epics can plug in without restructuring.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    // TODO(epic-3): loadComponent: () => import('./pages/login.page').then(m => m.LoginPage)
    title: 'Sign in',
    children: [],
  },
];

export default AUTH_ROUTES;
