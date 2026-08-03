import { type Routes } from '@angular/router';

import { authGuard, publicOnlyGuard } from '@core/auth';

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
    // Learner-facing app — any authenticated account may enter; the backend
    // re-authorizes every action (CLAUDE.md §8).
    path: 'dashboard',
    loadChildren: () => import('@features/dashboard/dashboard.routes'),
    canMatch: [authGuard],
    title: 'Dashboard',
  },
  // NOTE: there is no `/courses` route. The student learning hub is
  // `/dashboard/certificates` (the designed surface). `/courses` briefly hosted a
  // second, plainer set of pages over the same `/learning/*` endpoints; they were
  // removed as duplicates and the designed pages were wired to the real API
  // instead. `features/courses/data-access` remains — it *is* that API layer.
  {
    path: 'assessments',
    loadChildren: () => import('@features/assessments/assessments.routes'),
    canMatch: [authGuard],
    title: 'Assessments',
  },
  {
    // Admin app — the feature owns its own gating: `/admin/login` is public,
    // everything under the admin shell is protected by `adminAuthGuard`
    // (see features/admin/admin.routes.ts). Staff roles = backend `AdminRole`.
    path: 'admin',
    loadChildren: () => import('@features/admin/admin.routes'),
    title: 'Admin',
  },
  {
    path: 'insights',
    loadChildren: () => import('@features/insights/insights.routes'),
    title: 'Insights',
  },
  {
    // Checkout — any authenticated account may buy; the backend recomputes
    // and authorizes the charge server-side regardless of what the UI shows.
    path: 'checkout',
    loadChildren: () => import('@features/payments/payments.routes'),
    canMatch: [authGuard],
    title: 'Checkout',
  },
  // Stripe redirect targets — the backend hardcodes these exact paths as
  // `successUrl`/`cancelUrl` on every checkout session
  // (IOS_Backend `PaymentService.createEnrollmentCheckout` / `createRetakeCheckout`),
  // so they live at `/payments/*`, not nested under `/checkout`.
  {
    path: 'payments/success',
    loadComponent: () =>
      import('@features/payments/pages/payment-success.page').then((m) => m.PaymentSuccessPage),
    canMatch: [authGuard],
    title: 'Payment successful',
  },
  {
    path: 'payments/cancel',
    loadComponent: () =>
      import('@features/payments/pages/payment-cancel.page').then((m) => m.PaymentCancelPage),
    canMatch: [authGuard],
    title: 'Payment cancelled',
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
