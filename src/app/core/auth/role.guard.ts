import { type CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Frontend role gate. Hides routes a user shouldn't see; the backend
 * re-authorizes every actual action (CLAUDE.md §8).
 *
 * Placeholder: until `core/auth/AuthStore` exists in epic 3, this returns
 * true and logs a TODO. The signature is final so feature routes can wire
 * it in now without rework later.
 *
 * Usage:
 *   { path: 'admin', canMatch: [roleGuard(['admin', 'support'])], ... }
 */
export type AppRole = 'learner' | 'instructor' | 'admin' | 'support';

export function roleGuard(allowed: readonly AppRole[]): CanMatchFn {
  return (_route, _segments) => {
    const router = inject(Router);
    void router; // silence "unused" until concrete logic lands
    void allowed;

    // TODO(epic-3): inject AuthStore, read current role signal, check membership.
    //   const role = inject(AuthStore).role();
    //   return allowed.includes(role) ? true : router.createUrlTree(['/']);
    return true;
  };
}
