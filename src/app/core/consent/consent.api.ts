import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '@env/environment';

import { SKIP_RETRY, SUPPRESS_ERROR_TOAST } from '../http';
import { type ConsentCategories } from './consent.model';

/**
 * Transport for the public cookie-consent recorder — `POST /consent` (BE-042).
 * Public: consent can be given before login. When a student bearer token is
 * present (attached by `authInterceptor`) the backend links the record to the
 * user; otherwise it's anonymous. This is an audit trail, so the call is
 * fire-and-forget — retries are skipped and the global error toast is
 * suppressed (the store persists the choice locally regardless).
 */
@Injectable({ providedIn: 'root' })
export class ConsentApi {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/consent`;

  /** `POST /consent` — record a consent choice for the current policy version. */
  record(categories: ConsentCategories, policyVersion: string): Observable<unknown> {
    const context = new HttpContext().set(SKIP_RETRY, true).set(SUPPRESS_ERROR_TOAST, true);
    return this.http.post(this.endpoint, { categories, policyVersion }, { context });
  }
}
