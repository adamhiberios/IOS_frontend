import { type CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

/**
 * Bare authentication gate (CanMatch). Use for routes that any signed-in
 * user is allowed to see; reach for `roleGuard(...)` when role membership
 * actually matters. Composing both — `canMatch: [authGuard, roleGuard(...)]`
 * — is fine but redundant: `roleGuard` already checks isAuthenticated.
 *
 * Unauthenticated visitors are redirected to `/auth/login` with the
 * original URL preserved as `returnUrl` so they land back where they were
 * trying to go after signing in.
 */
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const returnUrl = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
};

/**
 * Inverse of {@link authGuard} — used on `/auth/*` so a signed-in user who
 * lands on `/auth/login` (e.g. via a stale bookmark) is bounced into the
 * app instead of being shown a login form they don't need.
 */
export const publicOnlyGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
