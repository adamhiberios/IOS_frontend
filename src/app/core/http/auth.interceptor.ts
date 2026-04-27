import { type HttpInterceptorFn } from '@angular/common/http';

import { SKIP_AUTH } from './http.tokens';

/**
 * AUTH interceptor — first in the chain (CLAUDE.md §6).
 *
 * Stub: until /docs/08 (auth) is implemented, this only honours the SKIP_AUTH
 * flag and lets the request pass through. Once `AuthStore` lands it will:
 *
 *   - Read the access token signal from `core/auth/AuthStore`
 *   - Attach `Authorization: Bearer <token>` for non-public requests
 *   - On 401, trigger a single in-flight refresh (handled by the refresh
 *     coordinator) and replay the original request with the new token
 *
 * The 401-refresh race is documented in /docs/08 §4 and will be tested with
 * the parallel-401 acceptance scenario per CLAUDE.md §11.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  // TODO(epic-3): inject AuthStore, attach bearer, coordinate refresh on 401.
  return next(req);
};
