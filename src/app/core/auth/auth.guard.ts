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
 *
 * `returnUrl` is built from `router.getCurrentNavigation().extractedUrl`
 * rather than just `segments` — `segments` (the matched `UrlSegment[]`)
 * carries path only, no query string. Reading the in-flight navigation's
 * `extractedUrl` preserves query params too, e.g. `/checkout?certId=…` after
 * "Enroll Now" redirects through login used to come back with the query
 * string stripped, landing on an empty checkout page.
 */
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const returnUrl = buildReturnUrl(router, segments);
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
};

/**
 * Reconstructs the full attempted URL — path + query string — for use as
 * `returnUrl`. Falls back to path-only if, for some reason, there's no
 * in-flight navigation to read from (defensive; shouldn't happen inside a
 * `CanMatch` guard).
 */
export function buildReturnUrl(router: Router, segments: { path: string }[]): string {
  const path = '/' + segments.map((s) => s.path).join('/');
  const queryParams = router.getCurrentNavigation()?.extractedUrl.queryParams ?? {};
  return router.serializeUrl(router.createUrlTree([path], { queryParams }));
}

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
