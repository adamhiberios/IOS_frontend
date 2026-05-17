import { type Routes } from '@angular/router';

/**
 * Dashboard routes — the post-login landing surface for students.
 *
 * `/dashboard`              → Overview page (root route)
 * `/dashboard/certificates` → Certificates feature
 * `/dashboard/profile`      → Profile feature
 * `/dashboard/settings`     → Settings feature (notification prefs, newsletter, account)
 */
const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dashboard — Overview',
    loadComponent: () => import('./pages/overview.page').then((m) => m.DashboardOverviewPage),
  },
  {
    path: 'certificates',
    title: 'My Certificates',
    loadChildren: () => import('@features/certificates/certificates.routes'),
  },
  {
    path: 'profile',
    title: 'Profile',
    loadChildren: () => import('@features/profile/profile.routes'),
  },
  {
    path: 'settings',
    title: 'Settings',
    loadChildren: () => import('@features/settings/settings.routes'),
  },
  {
    path: 'notifications',
    title: 'Notifications',
    loadChildren: () => import('@features/notifications/notifications.routes'),
  },
  { path: 'log', redirectTo: '' },
];

export default DASHBOARD_ROUTES;
