import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import { type DeleteAccountResultDto } from './account.dto';
import { toDeleteAccountResult } from './account.mappers';
import { type DeleteAccountResult } from './account.model';

/**
 * Transport for the self-service GDPR account endpoints — `@Controller('me')`
 * (student token only; admins get 403). Bearer token via `authInterceptor`,
 * `X-Locale` via `localeInterceptor`. See `docs/backend-analysis.md` (BE-042).
 */
@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/me`;

  /**
   * `GET /me/export` — the caller's full personal-data export. The backend
   * streams a JSON attachment; we read the raw bytes as a `Blob` so the exact
   * server payload is preserved for the client-side download. The large exam
   * `answers` blob is omitted by default (no `?includeAnswers=true`).
   */
  export(): Observable<Blob> {
    return this.http.get(`${this.base}/export`, { responseType: 'blob' });
  }

  /**
   * `POST /me/delete` `{ password }` — step-up re-auth account deletion
   * (anonymize-in-place). Wrong password → 401. `withCredentials` so the
   * server's refresh-cookie clear (`Set-Cookie`) is honoured by the browser.
   */
  deleteAccount(password: string): Observable<DeleteAccountResult> {
    return this.http
      .post<DeleteAccountResultDto>(`${this.base}/delete`, { password }, { withCredentials: true })
      .pipe(map(toDeleteAccountResult));
  }
}
