import type { HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

import { RETRY_ATTEMPTS, SKIP_RETRY } from './http.tokens';

/**
 * RETRY interceptor — third in the chain (CLAUDE.md §6).
 *
 * Policy:
 *   - Idempotent methods (GET, HEAD, OPTIONS) are retried up to 2 times by
 *     default with exponential backoff (250ms, 500ms).
 *   - Non-idempotent methods (POST, PUT, PATCH, DELETE) are NOT retried by
 *     default; the application owns the retry decision (e.g. the exam-engine
 *     sync queue retries answers idempotently with a clientSeq — see /docs/09).
 *   - Per-request override via SKIP_RETRY or RETRY_ATTEMPTS.
 *
 * 401s are handled by the auth interceptor (single-flight refresh + replay)
 * and must NOT be retried here.
 */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_ATTEMPTS = 2;

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_RETRY)) {
    return next(req);
  }

  const explicit = req.context.get(RETRY_ATTEMPTS);
  const isIdempotent = IDEMPOTENT_METHODS.has(req.method.toUpperCase());
  const count = explicit ?? (isIdempotent ? DEFAULT_ATTEMPTS : 0);

  if (count <= 0) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count,
      delay: (error: unknown, retryIndex) => {
        // Don't retry 401 — auth interceptor owns refresh semantics.
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          (error as { status: number }).status === 401
        ) {
          // Returning an errored observable terminates the retry without
          // throwing a non-Error value (lint: only-throw-error).
          return throwError(() => error);
        }
        // Exponential backoff capped at 2s.
        const delayMs = Math.min(250 * 2 ** retryIndex, 2_000);
        return timer(delayMs);
      },
    }),
  );
};
