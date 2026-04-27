import { type Routes } from '@angular/router';

/**
 * Auth feature routes — login, register, password reset, MFA, etc.
 * Lazy-loaded from app.routes.ts; never imported directly elsewhere.
 *
 * EPIC 3 progress:
 *   - register: UI shipped (mocked submit; real auth wiring is a follow-up).
 *   - login:    placeholder, lands next.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage),
    title: 'Create your account',
  },
];

export default AUTH_ROUTES;
