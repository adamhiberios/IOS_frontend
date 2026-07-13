import { type Routes } from '@angular/router';

/**
 * Credentials feature routes — mounted under `/dashboard/credentials`.
 *
 * · '' → earned-certificates list (GET /me/certificates, BE-I-16 / A3)
 *
 * Distinct from the mock learning hub at `/dashboard/certificates`.
 */
const CREDENTIALS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'My Credentials',
    loadComponent: () => import('./pages/credentials.page').then((m) => m.CredentialsPage),
  },
];

export default CREDENTIALS_ROUTES;
