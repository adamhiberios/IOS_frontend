import { type CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

/**
 * Roles the frontend understands. Source of truth: /docs/07 §3.1.
 *
 * Adding a role here without also updating the §3.4 permission matrix is a
 * code-review block — the two are kept in lockstep so the shipped UI never
 * disagrees with the backend's enforcement.
 */
export type AppRole = 'learner' | 'instructor' | 'admin' | 'support';

/**
 * Frontend role gate (CanMatch). Hides routes a user shouldn't see; the
 * backend re-authorizes every actual action (CLAUDE.md §8 + /docs/07 §3.5).
 *
 * Behaviour:
 *   - Unauthenticated              → redirect to `/auth/login` with `returnUrl`.
 *   - Authenticated, role mismatch → redirect to `/forbidden`.
 *   - Authenticated, role match    → allow.
 *
 * Wired with `canMatch` so the lazy chunk for the protected feature isn't
 * even fetched when access is denied — saves bytes for a learner who tabs
 * past `/admin` URL-bar surfing.
 *
 * Usage:
 *   { path: 'admin', canMatch: [roleGuard(['admin', 'support'])], ... }
 */
export function roleGuard(allowed: readonly AppRole[]): CanMatchFn {
  return (_route, segments) => {
    const auth = inject(AuthStore);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      const returnUrl = '/' + segments.map((s) => s.path).join('/');
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
    }

    if (!auth.hasAnyRole(allowed)) {
      return router.createUrlTree(['/forbidden']);
    }

    return true;
  };
}
