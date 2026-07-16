import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, type PagedResponse, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type MarkAllReadResponseDto,
  type MarkReadResponseDto,
  type NotificationItemDto,
} from './notifications.dto';
import { toNotification } from './notifications.mappers';
import { type Notification, type NotificationsQuery } from './notification.model';

/**
 * Transport for the student's in-app notifications (BE-I-18 / A4). Bearer token
 * via `authInterceptor`, `X-Locale` via `localeInterceptor` (so `title`/`body`
 * come back localized). The unread-count endpoint is owned by the core
 * `NotificationBadgeStore` (the navbar needs it and can't import this feature).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/notifications`;

  /** `GET /notifications` — cursor-paginated feed (`{ data, meta.pagination }`). */
  list(query: NotificationsQuery): Observable<Page<Notification>> {
    const params = toHttpParams({
      cursor: query.cursor,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
    return this.http
      .get<PagedResponse<NotificationItemDto>>(this.base, { params })
      .pipe(map((res) => toPage(res, toNotification)));
  }

  /** `POST /notifications/:id/read` — idempotent; returns the updated item. */
  markRead(id: string): Observable<Notification> {
    return this.http
      .post<MarkReadResponseDto>(`${this.base}/${id}/read`, {})
      .pipe(map((res) => toNotification(res.data)));
  }

  /** `POST /notifications/read-all` — returns the number of rows updated. */
  markAllRead(): Observable<number> {
    return this.http
      .post<MarkAllReadResponseDto>(`${this.base}/read-all`, {})
      .pipe(map((res) => res.updated));
  }
}
