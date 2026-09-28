import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, map, of, throwError } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '@core/http';
import { environment } from '@env/environment';
import { resolveBadgeAsset, resolveCertFamily } from '@shared';

import { type CertificateVerificationDto } from './certificate-verify.dto';
import { type CertificateVerification } from './certificate-verify.model';

/**
 * Public certificate verification (IDD-258) — `GET /verify/:certId`, no auth.
 *
 * Resolves `null` for an unknown ID (404): that is an answer, not a failure.
 * Any other error rejects. The page shows every outcome inline, so the global
 * error toast is suppressed.
 */
@Injectable({ providedIn: 'root' })
export class CertificateVerifyApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/verify`;

  verify(certId: string): Observable<CertificateVerification | null> {
    return this.http
      .get<CertificateVerificationDto>(`${this.base}/${encodeURIComponent(certId)}`, {
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(
        map(toCertificateVerification),
        catchError((err: unknown) =>
          err instanceof HttpErrorResponse && err.status === 404 ? of(null) : throwError(() => err),
        ),
      );
  }
}

function toCertificateVerification(dto: CertificateVerificationDto): CertificateVerification {
  return {
    certId: dto.certId,
    holderName: dto.studentName,
    program: dto.program,
    programCode: dto.programCode,
    issueDate: dto.issueDate,
    valid: dto.status === 'valid' && dto.isActive,
    family: resolveCertFamily(dto.programCode),
    badgeAsset: resolveBadgeAsset(dto.programCode),
  };
}
