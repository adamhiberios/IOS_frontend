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
];

export default routes;
