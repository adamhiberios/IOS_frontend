import { type Routes } from '@angular/router';

/**
 * Profile feature routes — mounted at `/dashboard/profile` by
 * `DASHBOARD_ROUTES`.
 *
 * `/dashboard/profile`                    → ProfilePage (view-only)
 * `/dashboard/profile/edit`               → EditProfilePage (update information)
 * `/dashboard/profile/change-password`    → ChangePasswordPage
 */
const PROFILE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Profile',
    loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'edit',
    title: 'Update information',
    loadComponent: () => import('./pages/edit-profile.page').then((m) => m.EditProfilePage),
  },
  {
    path: 'change-password',
    title: 'Change Password',
    loadComponent: () => import('./pages/change-password.page').then((m) => m.ChangePasswordPage),
  },
];

export default PROFILE_ROUTES;
