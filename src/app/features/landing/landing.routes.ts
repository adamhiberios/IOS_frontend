import { type Routes } from '@angular/router';

/**
 * Landing feature routes — mounted at `/` in app.routes.ts.
 *
 * Public route: no guard. Both authenticated and unauthenticated users reach
 * this page. All copy is resolved through `LanguageService.t()` in the template.
 */
const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing.page').then((m) => m.LandingPage),
    title: 'Institute of Scrum — Learn, Certify, Advance',
  },
];

export default routes;
