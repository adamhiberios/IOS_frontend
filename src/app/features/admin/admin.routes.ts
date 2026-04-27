import { type Routes } from '@angular/router';

/**
 * Admin routes — gated by `roleGuard(['admin'])` from app.routes.ts.
 * Frontend RBAC hides UI but does not enforce; the backend re-authorizes
 * every action. See CLAUDE.md §8 and /docs/07.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Admin',
    children: [],
  },
];

export default ADMIN_ROUTES;
