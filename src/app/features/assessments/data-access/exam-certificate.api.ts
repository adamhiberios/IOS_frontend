import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

/**
 * One row of `GET /me/certificates` — only the fields the result page shows.
 * The credentials feature owns the full shape; this is a deliberate local
 * subset so `assessments` does not import across features.
 */
export interface IssuedCertificateDto {
  /** Public credential id, e.g. `IOS-ESM-A-2026-000001`. */
  readonly certId: string | null;
  readonly program: string;
  readonly programCode: string;
  /** ISO-8601. */
  readonly issuedAt: string;
  readonly status: 'valid' | 'revoked';
  /** Public PDF URL — null until rendering + upload finish. */
  readonly certificateUrl: string | null;
  readonly verifyUrl: string | null;
}

interface IssuedCertificatesResponseDto {
  readonly data: readonly IssuedCertificateDto[];
}

/** Transport for the student's issued certificates, as seen from the exam flow. */
@Injectable({ providedIn: 'root' })
export class ExamCertificateApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/me/certificates`;

  /** `GET /me/certificates` — the caller's certificates, newest first. */
  list(): Observable<readonly IssuedCertificateDto[]> {
    return this.http.get<IssuedCertificatesResponseDto>(this.url).pipe(map((res) => res.data));
  }
}
