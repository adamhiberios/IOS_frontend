import { type Routes } from '@angular/router';

/**
 * Notifications feature routes — mounted at `/dashboard/notifications` by
 * `DASHBOARD_ROUTES`.
 *
 * `/dashboard/notifications` → NotificationsPage (full list, sortable)
 */
const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Notifications',
    loadComponent: () => import('./pages/notifications.page').then((m) => m.NotificationsPage),
  },
];

export default NOTIFICATIONS_ROUTES;
