/**
 * Core notifications — the app-shell's unread-count badge singleton.
 *
 * Only the cross-cutting badge count lives here (the navbar, a layout, must not
 * import the notifications feature). The full feed + list logic stays in
 * `features/notifications`.
 */
export { NotificationBadgeStore } from './notification-badge.store';
