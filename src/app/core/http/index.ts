/**
 * Core HTTP layer.
 *
 * Public surface:
 *   - HTTP_INTERCEPTORS in canonical order (auth → locale → retry → error).
 *   - Per-request HttpContext tokens (SKIP_AUTH, SKIP_RETRY, …).
 *   - The `provideAppHttp()` helper for app.config.ts.
 *
 * CLAUDE.md §6 fixes the interceptor order; the helper enforces it so
 * feature code can never accidentally re-order it.
 */

import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { type EnvironmentProviders } from '@angular/core';

import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { localeInterceptor } from './locale.interceptor';
import { retryInterceptor } from './retry.interceptor';

export {
  RETRY_ATTEMPTS,
  SKIP_AUTH,
  SKIP_RETRY,
  SUPPRESS_ERROR_TOAST,
} from './http.tokens';

/**
 * Wire the HttpClient with the canonical interceptor chain.
 *
 * Called once from `app.config.ts`. Order is fixed by CLAUDE.md §6:
 *   auth → locale → retry → error
 *
 * Use the fetch backend (withFetch) for streaming and HTTP/2 friendliness;
 * the legacy XHR backend is incompatible with the SSR-disabled CSR posture
 * we plan around in /docs/04 §2.
 */
export function provideAppHttp(): EnvironmentProviders {
  return provideHttpClient(
    withFetch(),
    withInterceptors([authInterceptor, localeInterceptor, retryInterceptor, errorInterceptor]),
  );
}
