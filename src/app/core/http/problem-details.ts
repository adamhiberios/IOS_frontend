import { HttpErrorResponse } from '@angular/common/http';

/**
 * RFC 7807 Problem Details body as emitted by the backend
 * `GlobalExceptionFilter` (see `docs/backend-analysis.md` §1.5).
 */
export interface ProblemDetails {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
  readonly request_id?: string;
  readonly errors?:
    | readonly {
        readonly field: string;
        readonly code: string;
        readonly message: string;
      }[]
    | null;
}

/**
 * Extract a user-facing message from a backend error. Prefers the localized
 * `detail`, then `title`, then a Nest-style `message`. Returns `null` when no
 * usable message is present so the caller can fall back to its own i18n copy.
 * Never surfaces raw stack/URL text to the UI.
 */
export function problemDetailMessage(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  const body = err.error as (ProblemDetails & { message?: unknown }) | string | null;
  if (typeof body === 'string' && body.trim().length > 0) {
    return body;
  }
  if (body && typeof body === 'object') {
    const candidate = body.detail ?? body.title ?? body.message;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
}

/** The stable, machine-readable `code` from a backend Problem Details error, if any. */
export function problemDetailCode(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  const body = err.error as ProblemDetails | null;
  return typeof body?.code === 'string' ? body.code : null;
}
