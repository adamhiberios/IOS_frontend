import { type Routes } from '@angular/router';

import { roleGuard } from '@core/auth';

/**
 * App-level routes — every feature is lazy-loaded. The shell (header/sidebar)
 * is composed by `layouts/app-shell` once it lands; for now the routes mount
 * directly to the root <router-outlet />.
 *
 * The root path is currently the temporary RTL/LTR smoke screen rendered by
 * `App` (see src/app/app.html). Once `features/dashboard` ships its first
 * page, this entry redirects to `/dashboard`.
 *
 * Conventions:
 *   - Each feature owns its own `*.routes.ts` and exports it as the default.
 *   - Cross-feature imports are forbidden (CLAUDE.md §5); communication goes
 *     through `core/event-bus` or a `core/` singleton.
 *   - `roleGuard` is wired here even though its body is a stub until epic 3,
 *     so RBAC behavior is added later by editing the guard, not the routes.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // Temporarily renders the root component (smoke screen). Will become a
    // redirect to '/dashboard' once that feature has a real landing page.
    children: [],
  },
  {
    path: 'auth',
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
    path: '**',
    loadComponent: () =>
      import('@features/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Not found',
  },
];
