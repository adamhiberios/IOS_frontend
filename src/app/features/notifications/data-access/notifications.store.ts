import { Injectable, computed, signal } from '@angular/core';

import type { Notification, NotificationSortOrder } from './notification.model';

/** ── Mock data (replaces API until the backend endpoint is wired) ────────── */
const MOCK_NOTIFICATIONS: readonly Notification[] = [
  {
    id: '1',
    type: 'welcome',
    titleKey: 'notifications.items.welcome.title',
    descriptionKey: 'notifications.items.welcome.description',
    time: '4:00 pm',
    isRead: false,
    iconName: 'ios-logo',
    iconBg: 'bg-ios-brand-primary-soft',
    createdAt: new Date('2026-05-18T16:00:00'),
  },
  {
    id: '2',
    type: 'course-recommendation',
    titleKey: 'notifications.items.courseRecommendation.title',
    descriptionKey: 'notifications.items.courseRecommendation.description',
    time: '1:00 pm',
    isRead: true,
    iconName: 'award',
    iconBg: 'bg-white',
    createdAt: new Date('2026-05-18T13:00:00'),
  },
  {
    id: '3',
    type: 'security',
    titleKey: 'notifications.items.security.title',
    descriptionKey: 'notifications.items.security.description',
    time: '2:00 pm',
    isRead: true,
    iconName: 'shield-alert',
    iconBg: 'bg-white',
    createdAt: new Date('2026-05-18T14:00:00'),
  },
  {
    id: '4',
    type: 'password-update',
    titleKey: 'notifications.items.passwordUpdate.title',
    descriptionKey: 'notifications.items.passwordUpdate.description',
    time: '5:00 pm',
    isRead: true,
    iconName: 'key',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T17:00:00'),
  },
  {
    id: '5',
    type: 'course-progress',
    titleKey: 'notifications.items.courseProgress.title',
    descriptionKey: 'notifications.items.courseProgress.description',
    time: '7:00 pm',
    isRead: true,
    iconName: 'circle-check',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T19:00:00'),
  },
  {
    id: '6',
    type: 'discount',
    titleKey: 'notifications.items.discount.title',
    descriptionKey: 'notifications.items.discount.description',
    time: '3:00 pm',
    isRead: true,
    iconName: 'percent',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T15:00:00'),
  },
  {
    id: '7',
    type: 'new-material',
    titleKey: 'notifications.items.newMaterial.title',
    descriptionKey: 'notifications.items.newMaterial.description',
    time: '6:00 pm',
    isRead: true,
    iconName: 'file-plus',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T18:00:00'),
  },
  {
    id: '8',
    type: 'profile-update',
    titleKey: 'notifications.items.profileUpdate.title',
    descriptionKey: 'notifications.items.profileUpdate.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'user-round-check',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:00:00'),
  },
  {
    id: '9',
    type: 'payment',
    titleKey: 'notifications.items.payment.title',
    descriptionKey: 'notifications.items.payment.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'dollar-sign',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:01:00'),
  },
  {
    id: '10',
    type: 'exam-access',
    titleKey: 'notifications.items.examAccess.title',
    descriptionKey: 'notifications.items.examAccess.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'newspaper',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:02:00'),
  },
  {
    id: '11',
    type: 'verify-account',
    titleKey: 'notifications.items.verifyAccount.title',
    descriptionKey: 'notifications.items.verifyAccount.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'scan-face',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:03:00'),
  },
  {
    id: '12',
    type: 'enrollment',
    titleKey: 'notifications.items.enrollment.title',
    descriptionKey: 'notifications.items.enrollment.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'circle-check',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:04:00'),
  },
  {
    id: '13',
    type: 'exam-code',
    titleKey: 'notifications.items.examCode.title',
    descriptionKey: 'notifications.items.examCode.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'circle-check',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:05:00'),
  },
  {
    id: '14',
    type: 'payment-receipt',
    titleKey: 'notifications.items.paymentReceipt.title',
    descriptionKey: 'notifications.items.paymentReceipt.description',
    time: '8:00 pm',
    isRead: true,
    iconName: 'dollar-sign',
    iconBg: 'bg-[#f6f6f6]',
    createdAt: new Date('2026-05-18T20:06:00'),
  },
];

/**
 * `NotificationsStore` — lightweight signal store for the notifications feature.
 *
 * State is private and mutated only through action methods.
 * Consumers receive read-only signals and `computed` derivations.
 *
 * NOTE: `load()` currently resolves mock data. When the backend notification
 * endpoint is available, replace the mock with an `HttpClient` call following
 * the pattern in `core/http/`.
 */
@Injectable()
export class NotificationsStore {
  // ── Private writable signals ───────────────────────────────────────────────
  private readonly _notifications = signal<readonly Notification[]>([]);
  private readonly _sortOrder = signal<NotificationSortOrder>('latest');
  private readonly _loading = signal(false);

  // ── Public read-only views ─────────────────────────────────────────────────
  readonly loading = this._loading.asReadonly();
  readonly sortOrder = this._sortOrder.asReadonly();

  /**
   * Notifications sorted according to `sortOrder`.
   * Latest (default) = descending by `createdAt`.
   * Earliest = ascending by `createdAt`.
   */
  readonly notifications = computed<readonly Notification[]>(() => {
    const list = [...this._notifications()];
    const order = this._sortOrder();
    return list.sort((a, b) =>
      order === 'latest'
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime(),
    );
  });

  /** Count of unread notifications. */
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.isRead).length);

  // ── Action methods ─────────────────────────────────────────────────────────

  /** Loads notifications. Swap mock data for a real API call when ready. */
  load(): void {
    this._loading.set(true);
    // Simulate async — remove in production and replace with toSignal(http.get(...))
    setTimeout(() => {
      this._notifications.set(MOCK_NOTIFICATIONS);
      this._loading.set(false);
    }, 0);
  }

  /** Toggles between 'latest' and 'earliest' sort orders. */
  toggleSort(): void {
    this._sortOrder.update((o) => (o === 'latest' ? 'earliest' : 'latest'));
  }

  /** Marks all notifications as read. */
  markAllRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
  }
}
