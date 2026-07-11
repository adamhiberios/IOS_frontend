import { inject } from '@angular/core';
import { type Routes } from '@angular/router';

import { LanguageService } from '@core/i18n';

import { adminAuthGuard, adminLoginGuard } from './guards/admin-auth.guard';

/**
 * Admin feature routes.
 *
 *   /admin/login  — public staff sign-in (POST /auth/admin/login).
 *   /admin/**     — the admin shell + pages, gated by `adminAuthGuard`
 *                   (unauthenticated → /admin/login; non-admin → /forbidden).
 *
 * Guarding lives here (not on the parent `/admin` route in app.routes) so the
 * login page stays reachable while everything under the shell is protected.
 * Frontend RBAC only hides UI — the backend re-authorizes every action
 * (CLAUDE.md §8, docs/backend-analysis.md §2). Pages are added one by one.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canMatch: [adminLoginGuard],
    loadComponent: () => import('./pages/admin-login.page').then((m) => m.AdminLoginPage),
    title: () => inject(LanguageService).t('admin.login.title'),
  },
  {
    path: '',
    canMatch: [adminAuthGuard],
    loadComponent: () => import('./components/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/admin-home.page').then((m) => m.AdminHomePage),
        title: () => inject(LanguageService).t('admin.home.title'),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/admin-catalog-list.page').then((m) => m.AdminCatalogListPage),
        title: () => inject(LanguageService).t('admin.catalog.title'),
      },
      {
        path: 'catalog/new',
        loadComponent: () =>
          import('./pages/admin-catalog-form.page').then((m) => m.AdminCatalogFormPage),
        title: () => inject(LanguageService).t('admin.catalog.form.createTitle'),
      },
      {
        path: 'catalog/:id/edit',
        loadComponent: () =>
          import('./pages/admin-catalog-form.page').then((m) => m.AdminCatalogFormPage),
        title: () => inject(LanguageService).t('admin.catalog.form.editTitle'),
      },
    ],
  },
];

export default ADMIN_ROUTES;
