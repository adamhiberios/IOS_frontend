/**
 * PublicResourceDownloadApi — transport for the gated-download lead capture,
 * `POST /resource-downloads` (`@Public()`, no auth). Used by the Scrum Guide
 * download page.
 *
 * Non-idempotent write: not retried (retry.interceptor.ts default for POST).
 * Errors are surfaced inline by the calling form, so the global error toast
 * is suppressed via `SUPPRESS_ERROR_TOAST`.
 *
 * The backend deliberately does not serve the asset — it only records the
 * lead. The caller releases the file once this resolves.
 */

import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '@core/http';
import { environment } from '@env/environment';

import {
  type SubmitResourceDownloadRequest,
  type SubmitResourceDownloadResponse,
} from './resource-download.dto';
import { type ResourceDownloadPayload } from './resource-download.model';

@Injectable({ providedIn: 'root' })
export class PublicResourceDownloadApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/resource-downloads`;

  /** `POST /resource-downloads` — record the lead; 201 is the only success signal. */
  submit(payload: ResourceDownloadPayload): Observable<void> {
    const body: SubmitResourceDownloadRequest = {
      email: payload.email.trim(),
      fullName: payload.fullName?.trim() || undefined,
      country: payload.country?.trim() || undefined,
      resourceSlug: payload.resourceSlug,
      pageSlug: payload.pageSlug,
      company: payload.company,
    };
    return this.http
      .post<SubmitResourceDownloadResponse>(this.base, body, {
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map(() => undefined));
  }
}
