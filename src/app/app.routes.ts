import { type Routes } from '@angular/router';

import { publicOnlyGuard, roleGuard } from '@core/auth';

/**
 * App-level routes — every feature is lazy-loaded. The shell (header/sidebar)
 * is composed by `layouts/app-shell` once it lands; for now the routes mount
 * directly to the root <router-outlet />.
 *
 * Auth posture (epic 3, /docs/07):
 *   - `/auth/*` is gated by `publicOnlyGuard` so a signed-in user gets bounced
 *     to `/dashboard` instead of being shown a login form they don't need.
 *   - Every protected branch uses `roleGuard(...)` which itself redirects
 *     unauthenticated visitors to `/auth/login` with `returnUrl` preserved.
 *   - `roleGuard` runs as `canMatch`, which means the lazy chunk for the
 *     protected feature is never even fetched when access is denied —
 *     a small but real perf win for url-bar surfers.
 *
 * Conventions:
 *   - Each feature owns its own `*.routes.ts` and exports it as the default.
 *   - Cross-feature imports are forbidden (CLAUDE.md §5); communication goes
 *     through `core/event-bus` or a `core/` singleton.
 */
export const routes: Routes = [
  {
    // Public landing page — no guard, visible to everyone.
    // Authenticated users navigate to their dashboard from within the page;
    // unauthenticated users are directed to /auth/login or /auth/register.
    path: '',
    loadChildren: () => import('@features/landing/landing.routes'),
    title: 'Institute of Scrum — Learn, Certify, Advance',
  },
  {
    path: 'auth',
    canMatch: [publicOnlyGuard],
    loadChildren: () => import('@features/auth/auth.routes'),
    title: 'Sign in',
  },
  {
    path: 'dashboard',
    loadChildren: () => import('@features/dashboard/dashboard.routes'),
    canMatch: [roleGuard(['learner', 'instructor', 'admin', 'support'])],
    title: 'Dashboard',
  },
  {
    path: 'courses',
    loadChildren: () => import('@features/courses/courses.routes'),
    canMatch: [roleGuard(['learner', 'instructor', 'admin', 'support'])],
    title: 'Courses',
  },
  {
    path: 'assessments',
    loadChildren: () => import('@features/assessments/assessments.routes'),
    canMatch: [roleGuard(['learner', 'instructor', 'admin', 'support'])],
    title: 'Assessments',
  },
  {
    path: 'admin',
    loadChildren: () => import('@features/admin/admin.routes'),
    canMatch: [roleGuard(['admin', 'support'])],
    title: 'Admin',
  },
  {
    path: 'insights',
    loadChildren: () => import('@features/insights/insights.routes'),
    title: 'Insights',
  },
  {
    path: 'forbidden',
    loadComponent: () => import('@features/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
    title: 'Access denied',
  },
  {
    path: '**',
    loadComponent: () => import('@features/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Not found',
  },
];
