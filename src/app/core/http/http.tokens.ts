import { HttpContextToken } from '@angular/common/http';

/**
 * Per-request HttpContext flags. Use sparingly — the default behavior of
 * every interceptor should be the right one for the vast majority of calls.
 */

/**
 * Skip the auth header on this request (e.g. login, refresh, public assets).
 * Default: false — every request gets the bearer token if one is present.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Skip the retry interceptor entirely. Useful for non-idempotent writes that
 * should fail fast rather than be silently re-tried.
 * Default: false — read-style requests retry per the policy in retry.interceptor.ts.
 */
export const SKIP_RETRY = new HttpContextToken<boolean>(() => false);

/**
 * Number of retry attempts (overrides the default for this request).
 * Default: undefined — interceptor uses its built-in policy.
 */
export const RETRY_ATTEMPTS = new HttpContextToken<number | undefined>(() => undefined);

/**
 * Suppress the global error toast on this request — typically when a feature
 * wants to display an inline error in its own UI.
 * Default: false — errors flow to the global error handler.
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
