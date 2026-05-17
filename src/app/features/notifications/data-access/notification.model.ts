import type { LucideIconName } from '@ui';

/**
 * The type of event that triggered the notification.
 * Maps 1:1 to the notification icon and tone used in the card.
 */
export type NotificationType =
  | 'welcome'
  | 'course-recommendation'
  | 'security'
  | 'password-update'
  | 'course-progress'
  | 'discount'
  | 'new-material'
  | 'profile-update'
  | 'payment'
  | 'exam-access'
  | 'verify-account'
  | 'enrollment'
  | 'exam-code'
  | 'payment-receipt';

/** Sort order used on the notifications list page. */
export type NotificationSortOrder = 'latest' | 'earliest';

/** A single notification item displayed in the notification list. */
export interface Notification {
  readonly id: string;
  readonly type: NotificationType;
  /** i18n translation key for the notification title. */
  readonly titleKey: string;
  /** i18n translation key for the notification body/description. */
  readonly descriptionKey: string;
  /** Pre-formatted display time string, e.g. "4:00 pm". */
  readonly time: string;
  readonly isRead: boolean;
  /**
   * Lucide icon name to render inside the icon container.
   * Use `'ios-logo'` as a sentinel value to render the IOS brand logo instead.
   */
  readonly iconName: LucideIconName | 'ios-logo';
  /**
   * Tailwind background-color class applied to the icon container,
   * e.g. `'bg-ios-brand-primary-soft'` or `'bg-white'`.
   */
  readonly iconBg: 'bg-ios-brand-primary-soft' | 'bg-white' | 'bg-[#f6f6f6]';
  /** ISO timestamp used for sorting. */
  readonly createdAt: Date;
}
