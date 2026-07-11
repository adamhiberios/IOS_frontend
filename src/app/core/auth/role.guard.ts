import { type CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

/**
 * Admin staff roles — mirror the backend `AdminRole` enum exactly
 * (`IOS_Backend/database/entities/admin-user.entity.ts`).
 */
export type AdminRole =
  | 'super_admin'
  | 'learning_admin'
  | 'content_creator'
  | 'finance_admin'
  | 'support_admin';

/**
 * Roles the frontend understands, in the real backend's role space. A student
 * account carries the synthetic `student` role; an admin account carries its
 * `AdminRole`. Source of truth: the backend `type` + `role` claims (see
 * `docs/backend-analysis.md` §2). `roleGuard` / `hasAnyRole` check membership.
 */
export type AppRole = 'student' | AdminRole;

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
 *   { path: 'admin', canMatch: [roleGuard(['super_admin', 'learning_admin'])], ... }
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
