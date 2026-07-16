import type { LucideIconName } from '@ui';

/**
 * In-app notification domain model (BE-I-18 / A4).
 *
 * `title` and `body` arrive **already localized** from the backend (it renders
 * i18n server-side and honours the `X-Locale` header), so they are plain display
 * strings — never re-translate them. `data` carries per-notification params
 * (e.g. `verifyUrl`) used for deep-linking. `type` is a free backend string; the
 * frontend only maps it to a cosmetic icon (unknown types fall back to a bell).
 */
export interface Notification {
  readonly id: string;
  readonly type: string;
  /** Localized by the backend — display as-is. */
  readonly title: string;
  /** Localized by the backend — display as-is. */
  readonly body: string;
  /** Arbitrary params for deep-linking (e.g. `{ verifyUrl }`). */
  readonly data: Record<string, unknown>;
  readonly read: boolean;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
}

/** Query for the cursor-paginated `GET /notifications` list. */
export interface NotificationsQuery {
  readonly cursor?: string;
  readonly limit?: number;
  readonly unreadOnly?: boolean;
}

/**
 * Cosmetic icon per notification `type`. The backend owns the (localized) copy;
 * this is purely visual, so unknown types degrade to a neutral bell.
 */
const TYPE_ICONS: Readonly<Record<string, LucideIconName>> = {
  welcome: 'award',
  enrollment: 'graduation-cap',
  'course-recommendation': 'graduation-cap',
  'course-progress': 'circle-check',
  'new-material': 'file-plus',
  security: 'shield-alert',
  'verify-account': 'shield-alert',
  'password-update': 'key',
  'profile-update': 'user-round-check',
  discount: 'percent',
  payment: 'dollar-sign',
  'payment-receipt': 'dollar-sign',
  'exam-access': 'ticket',
  'exam-code': 'ticket',
  certificate: 'badge-check',
};

/** Every icon {@link notificationIcon} can return — register these in the card. */
export const NOTIFICATION_ICON_NAMES: readonly LucideIconName[] = [
  'bell',
  'award',
  'graduation-cap',
  'circle-check',
  'file-plus',
  'shield-alert',
  'key',
  'user-round-check',
  'percent',
  'dollar-sign',
  'ticket',
  'badge-check',
];

/** Map a backend notification `type` to a display icon (fallback: bell). */
export function notificationIcon(type: string): LucideIconName {
  return TYPE_ICONS[type] ?? 'bell';
}

/**
 * Extract a deep-link URL from a notification's `data` params, if any. Looks at
 * the common keys the backend uses (`verifyUrl`, `url`, `link`). Returns `null`
 * when there's nothing to link to.
 */
export function notificationLink(data: Record<string, unknown>): string | null {
  for (const key of ['verifyUrl', 'url', 'link']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}
