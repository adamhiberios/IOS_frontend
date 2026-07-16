/**
 * Wire shapes for the in-app notifications endpoints (BE-I-18 / A4). Mirror the
 * backend JSON exactly. Envelopes vary per endpoint (BE-I-01):
 *  · `GET /notifications`            → `{ data, meta.pagination }` (cursor) — use `PagedResponse`
 *  · `GET /notifications/unread-count` → bare `{ count }` (owned by core badge store)
 *  · `POST /notifications/:id/read`  → `{ data: NotificationItemDto }`
 *  · `POST /notifications/read-all`  → `{ updated: number }`
 *
 * `title`/`body` are already localized server-side (rendered per `X-Locale`).
 */
export interface NotificationItemDto {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly data: Record<string, unknown> | null;
  readonly read: boolean;
  readonly createdAt: string;
}

/** `POST /notifications/:id/read` response — the updated item (idempotent). */
export interface MarkReadResponseDto {
  readonly data: NotificationItemDto;
}

/** `POST /notifications/read-all` response — how many rows flipped to read. */
export interface MarkAllReadResponseDto {
  readonly updated: number;
}
