import { type Routes } from '@angular/router';

/**
 * Settings feature routes — mounted at `/dashboard/settings` by `DASHBOARD_ROUTES`.
 *
 * `/dashboard/settings`                        → SettingsPage (main)
 * `/dashboard/settings/cancel-subscription`    → CancelSubscriptionPage
 * `/dashboard/settings/subscription-cancelled` → SubscriptionCancelledPage
 */
const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Settings',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'cancel-subscription',
    title: 'Cancel Subscription',
    loadComponent: () =>
      import('./pages/cancel-subscription.page').then((m) => m.CancelSubscriptionPage),
  },
  {
    path: 'subscription-cancelled',
    title: 'Subscription Cancelled',
    loadComponent: () =>
      import('./pages/subscription-cancelled.page').then((m) => m.SubscriptionCancelledPage),
  },
];

export default SETTINGS_ROUTES;
