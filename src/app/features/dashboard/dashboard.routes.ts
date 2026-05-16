import { type Routes } from '@angular/router';

/**
 * Dashboard routes — the post-login landing surface for students.
 *
 * `/dashboard` → Overview page (root route)
 *
 * Additional sub-routes (My certificates, Profile, Settings, Log) will be
 * added in future epics. For now they redirect to the overview so the
 * nav tabs are clickable without 404s.
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
  // Stub route for settings tab — redirect to overview until the page lands.
  { path: 'settings', redirectTo: '' },
  { path: 'log', redirectTo: '' },
];

export default DASHBOARD_ROUTES;
