import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import { type EarnedCertificatesResponseDto } from './credentials.dto';
import { toEarnedCertificate } from './credentials.mappers';
import { type EarnedCertificate } from './credentials.model';

/**
 * Transport for the student's earned certificates — `GET /me/certificates`
 * (student token; BE-I-16). The bearer token is attached by `authInterceptor`,
 * `X-Locale` by `localeInterceptor`. Response is the **`{ data }`** envelope
 * (no pagination), unwrapped here.
 */
@Injectable({ providedIn: 'root' })
export class CredentialsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/me/certificates`;

  /** `GET /me/certificates` — every certificate the student has earned. */
  list(): Observable<EarnedCertificate[]> {
    return this.http
      .get<EarnedCertificatesResponseDto>(this.base)
      .pipe(map((res) => res.data.map(toEarnedCertificate)));
  }
}
