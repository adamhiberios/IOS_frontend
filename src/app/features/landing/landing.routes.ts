import { type Routes } from '@angular/router';

/**
 * Landing feature routes — mounted at `/` in app.routes.ts.
 *
 * Public routes: no guard. Both authenticated and unauthenticated users reach
 * these pages. All copy is resolved through `LanguageService.t()` in the template.
 */
const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing.page').then((m) => m.LandingPage),
    title: 'Institute of Scrum — Learn, Certify, Advance',
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact.page').then((m) => m.ContactPage),
    title: 'Contact — Institute of Scrum',
  },
  {
    path: 'about-mock-exam',
    loadComponent: () => import('./pages/about-mock-exam.page').then((m) => m.AboutMockExamPage),
    title: 'About Mock Exam — Institute of Scrum',
  },
  {
    path: 'about-scrum-master',
    loadComponent: () =>
      import('./pages/about-scrum-master.page').then((m) => m.AboutScrumMasterPage),
    title: 'About Scrum Master — Institute of Scrum',
  },
  {
    path: 'about-product-owner',
    loadComponent: () =>
      import('./pages/about-product-owner.page').then((m) => m.AboutProductOwnerPage),
    title: 'About Product Owner — Institute of Scrum',
  },
  {
    path: 'about-scrum-facilitator',
    loadComponent: () =>
      import('./pages/about-scrum-facilitator.page').then((m) => m.AboutScrumFacilitatorPage),
    title: 'About Scrum Facilitator — Institute of Scrum',
  },
  {
    path: 'certifications',
    loadComponent: () =>
      import('./pages/all-certifications.page').then((m) => m.AllCertificationsPage),
    title: 'All Certifications — Institute of Scrum',
  },
  {
    path: 'certifications/esm',
    loadComponent: () => import('./pages/cert-details-esm.page').then((m) => m.CertDetailsEsmPage),
    title: 'Endorsed Scrum Master (ESM) — Institute of Scrum',
  },
  {
    path: 'certifications/esm-p',
    loadComponent: () =>
      import('./pages/cert-details-esm-p.page').then((m) => m.CertDetailsEsmPPage),
    title: 'Endorsed Scrum Master Practitioner (ESM-P) — Institute of Scrum',
  },
  {
    path: 'certifications/esm-a',
    loadComponent: () =>
      import('./pages/cert-details-esm-a.page').then((m) => m.CertDetailsEsmAPage),
    title: 'Endorsed Scrum Master Authority (ESM-A) — Institute of Scrum',
  },
  {
    path: 'certifications/epo',
    loadComponent: () => import('./pages/cert-details-epo.page').then((m) => m.CertDetailsEpoPage),
    title: 'Endorsed Product Owner (EPO) — Institute of Scrum',
  },
  {
    path: 'certifications/epo-p',
    loadComponent: () =>
      import('./pages/cert-details-epo-p.page').then((m) => m.CertDetailsEpoPPage),
    title: 'Endorsed Product Owner Practitioner (EPO-P) — Institute of Scrum',
  },
  {
    path: 'certifications/epo-a',
    loadComponent: () =>
      import('./pages/cert-details-epo-a.page').then((m) => m.CertDetailsEpoAPage),
    title: 'Endorsed Product Owner Authority (EPO-A) — Institute of Scrum',
  },
  {
    path: 'certifications/esf',
    loadComponent: () => import('./pages/cert-details-esf.page').then((m) => m.CertDetailsEsmFPage),
    title: 'Endorsed Scrum Facilitator (ESF) — Institute of Scrum',
  },
];

export default routes;
