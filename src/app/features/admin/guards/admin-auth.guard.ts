import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';

import { type AppRole, AuthStore } from '@core/auth';

/**
 * The admin-staff roles that may enter the admin app — the backend `AdminRole`
 * set (see `docs/backend-analysis.md` §2). A `student` session is never admin.
 * Individual admin pages narrow further with their own `@Roles` on the backend;
 * this guard only gates entry to the admin shell.
 */
export const ADMIN_ROLES: readonly AppRole[] = [
  'super_admin',
  'learning_admin',
  'content_creator',
  'finance_admin',
  'support_admin',
];

/**
 * Gate for the authenticated admin area (`canMatch`).
 *
 *   - Not authenticated            → `/admin/login` (with `returnUrl` preserved).
 *   - Authenticated, non-admin     → `/forbidden` (e.g. a signed-in student).
 *   - Authenticated admin          → allow.
 *
 * Distinct from the learner `roleGuard`, which bounces to `/auth/login`; admins
 * have their own entry point, so unauthenticated access lands on `/admin/login`.
 * Frontend RBAC only hides UI — the backend re-authorizes every action.
 */
export const adminAuthGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    // Use the full URL being navigated to. The `segments` a CanMatch guard
    // receives are RELATIVE to where the guard is mounted (under `/admin`), so
    // rebuilding from them drops the `/admin` prefix (e.g. `/admin/catalog`
    // became `/catalog`). `getCurrentNavigation().extractedUrl` is the absolute
    // target.
    const target = router.getCurrentNavigation()?.extractedUrl;
    const returnUrl = target ? router.serializeUrl(target) : '/admin';
    return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl } });
  }

  if (!auth.hasAnyRole(ADMIN_ROLES)) {
    return router.createUrlTree(['/forbidden']);
  }

  return true;
};

/**
 * Inverse gate for `/admin/login` (`canMatch`) — a signed-in admin who lands on
 * the login page is bounced into the admin app instead of seeing a form they
 * don't need. A signed-in student is left on the login page so they can sign in
 * with a staff account.
 */
export const adminLoginGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.isAuthenticated() && auth.hasAnyRole(ADMIN_ROLES)
    ? router.createUrlTree(['/admin'])
    : true;
};
