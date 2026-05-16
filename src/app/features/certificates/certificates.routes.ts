import { type Routes } from '@angular/router';

/**
 * Certificates feature routes — mounted under `/dashboard/certificates`.
 *
 * · ''                            → My Certificates list page
 * · ':code'                       → Certificate detail page (e.g. /dashboard/certificates/ESM-P)
 * · ':code/session/:materialId'   → Session viewer (e.g. /dashboard/certificates/ESM-P/session/session-1-a)
 * · ':code/mock-test'             → Mock exam runner (e.g. /dashboard/certificates/ESM-P/mock-test?time=20&count=90)
 */
const CERTIFICATES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'My Certificates',
    loadComponent: () => import('./pages/certificates.page').then((m) => m.CertificatesPage),
  },
  {
    // Must come before ':code' to prevent it matching as the code segment.
    path: ':code/session/:materialId',
    title: 'Learning Session',
    loadComponent: () => import('./pages/cert-session.page').then((m) => m.CertSessionPage),
  },
  {
    // Must come before ':code' to prevent it matching as the code segment.
    path: ':code/mock-test/result',
    title: 'Mock Test Results',
    loadComponent: () => import('./pages/mock-exam-result.page').then((m) => m.MockExamResultPage),
  },
  {
    // Must come before ':code' to prevent it matching as the code segment.
    path: ':code/mock-test',
    title: 'Mock Test',
    loadComponent: () => import('./pages/mock-test.page').then((m) => m.MockTestPage),
  },
  {
    path: ':code',
    title: 'Certificate Detail',
    loadComponent: () => import('./pages/cert-detail.page').then((m) => m.CertDetailPage),
  },
];

export default CERTIFICATES_ROUTES;
