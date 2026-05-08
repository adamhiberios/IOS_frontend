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
];

export default routes;
