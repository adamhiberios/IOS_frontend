/**
 * PublicContactApi — transport for the public contact form, `POST /contact`
 * (`@Public()`, no auth). Shared by every `ios-landing-contact-section`
 * instance and the standalone `ios-contact-page`.
 *
 * Non-idempotent write: not retried (retry.interceptor.ts default for POST).
 * Errors are surfaced inline by the calling form, so the global error toast
 * is suppressed via `SUPPRESS_ERROR_TOAST`.
 */

import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '@core/http';
import { environment } from '@env/environment';

import { type SubmitContactRequest, type SubmitContactResponse } from './contact.dto';
import { type ContactSubmissionPayload } from './contact.model';

@Injectable({ providedIn: 'root' })
export class PublicContactApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/contact`;

  /** `POST /contact` — persist the submission; 201 is the only success signal. */
  submit(payload: ContactSubmissionPayload): Observable<void> {
    const body: SubmitContactRequest = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      subject: payload.subject?.trim() || undefined,
      message: payload.message.trim(),
      pageSlug: payload.pageSlug,
      company: payload.company,
    };
    return this.http
      .post<SubmitContactResponse>(this.base, body, {
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map(() => undefined));
  }
}
