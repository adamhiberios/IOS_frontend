import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import { type AuditLogListResponseDto } from './audit.dto';
import { toAuditLogEntry } from './audit.mappers';
import { type AuditLogEntry, type AuditLogQuery } from './audit.model';

/**
 * Admin audit-log transport — `GET /admin/audit-logs` (read-only).
 *
 * `super_admin` only (backend-enforced; 403 otherwise — see backend-analysis
 * §6.10). Cursor-paginated, newest-first, with optional `tableName` / `actorId`
 * / `recordId` / `action` filters. Sensitive keys in `oldData`/`newData` are
 * redacted server-side.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuditLogsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/audit-logs`;

  list(query: AuditLogQuery = {}): Observable<Page<AuditLogEntry>> {
    const params = toHttpParams({
      tableName: query.tableName,
      actorId: query.actorId,
      recordId: query.recordId,
      action: query.action,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<AuditLogListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toAuditLogEntry)));
  }
}
