import type { HttpHeaders, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { DirectionService } from '@core/i18n';

/**
 * LOCALE interceptor — second in the chain (CLAUDE.md §6).
 *
 * Adds an `Accept-Language` header that matches the active locale so the
 * backend can return localized error messages, certificates, and emails.
 *
 * The header is added if (and only if) the caller has not already set one,
 * so feature code can override on a per-request basis when it really needs to.
 */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Accept-Language')) {
    return next(req);
  }

  const locale = inject(DirectionService).locale();
  const headers: HttpHeaders = req.headers.set('Accept-Language', locale);

  return next(req.clone({ headers }));
};
