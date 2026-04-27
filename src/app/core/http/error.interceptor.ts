import { type HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { environment } from '@env/environment';

import { SUPPRESS_ERROR_TOAST } from './http.tokens';

/**
 * ERROR interceptor — last in the chain (CLAUDE.md §6).
 *
 * Responsibilities:
 *   - Strip tokens, passwords, PII before any error is logged or reported
 *     (CLAUDE.md §4 banned-patterns table).
 *   - Hand the sanitized error to the error reporter (Sentry, etc.) — wired
 *     once `core/error/` lands in a later epic.
 *   - Surface a global toast unless SUPPRESS_ERROR_TOAST is set.
 *
 * This stub does the redaction and rethrows; the toast and reporter calls
 * are no-ops until the error subsystem ships.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const suppressToast = req.context.get(SUPPRESS_ERROR_TOAST);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const safe = redact(err);

      if (environment.verboseLogging) {
        // CLAUDE.md §4: never log tokens / passwords / PII. The redactor above
        // strips them; this branch is opt-in via verboseLogging in dev/test.
        console.error('[http]', safe);
      }

      // TODO(epic-3): forward `safe` to ErrorReporter (core/error/).
      // TODO(epic-3): if !suppressToast, surface a localized toast via
      //               core/notifications/. For now, silence by default.
      void suppressToast;

      return throwError(() => err);
    }),
  );
};

interface SafeError {
  readonly status: number;
  readonly url: string | null;
  readonly method: string;
  readonly message: string;
}

/**
 * Strip headers, body, and any URL fragment that might carry a token / PII.
 * Keep only the fields a reporter or human needs to diagnose the failure.
 */
function redact(err: HttpErrorResponse): SafeError {
  return {
    status: err.status,
    // Drop query strings; tokens have ended up there in practice.
    url: err.url ? err.url.split('?')[0] ?? err.url : null,
    method: 'method' in err && typeof err.method === 'string' ? err.method : 'UNKNOWN',
    message: typeof err.message === 'string' ? err.message : 'HTTP error',
  };
}
