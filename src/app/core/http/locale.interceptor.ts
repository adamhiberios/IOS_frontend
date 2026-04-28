import type { HttpHeaders, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { LanguageService } from '@core/i18n';

/**
 * LOCALE interceptor — second in the chain (CLAUDE.md §6).
 *
 * Attaches `Accept-Language` and `X-Locale` headers matching the active locale
 * so the backend can return localised error messages, certificates, and emails.
 *
 * The header is added if (and only if) the caller has not already set one,
 * so feature code can override on a per-request basis when it really needs to.
 *
 * Note: translation-asset requests (`/assets/i18n/*.json`) are also intercepted
 * but the header is harmless for static files and avoids a special-case check.
 */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Accept-Language')) {
    return next(req);
  }

  const locale = inject(LanguageService).locale();
  const headers: HttpHeaders = req.headers.set('Accept-Language', locale).set('X-Locale', locale);

  return next(req.clone({ headers }));
};
