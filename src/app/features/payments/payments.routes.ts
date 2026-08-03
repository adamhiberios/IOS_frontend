import { type Routes } from '@angular/router';

/**
 * Payments feature routes — mounted at `/checkout` (see `app.routes.ts`).
 *
 * `''` → Place order / "Complete payment" page. Expects the item being
 * purchased via query params (`certId`, `title`, `code`, `price`, …) — see
 * the doc comment on `PlaceOrderPage.order` for the full contract.
 */
const PAYMENTS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Complete payment',
    loadComponent: () => import('./pages/place-order.page').then((m) => m.PlaceOrderPage),
  },
];

export default PAYMENTS_ROUTES;
