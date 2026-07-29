/**
 * `ViewportService` — signal-backed viewport breakpoint queries.
 *
 * Some layouts are not expressible as a pure CSS breakpoint override: when the
 * mobile design changes the *structure* of a view (different element order,
 * different interaction model), rendering both trees and hiding one with
 * `hidden md:block` doubles the DOM, duplicates content for screen readers, and
 * mounts every child component twice. Those cases need a real breakpoint signal
 * so `@if` can render exactly one branch.
 *
 * Use this **only** for structural differences. Anything achievable with a
 * Tailwind responsive variant (`md:`, `lg:`) must stay in CSS — it is free,
 * has no hydration flash, and does not re-render on resize.
 *
 * The app is CSR-only (CLAUDE.md §3), but the `window` guard keeps the service
 * safe if that ever changes; it degrades to "not mobile" (desktop layout).
 */

import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Mobile upper bound — mirrors Tailwind's `md` breakpoint (768px), so
 * `isMobile() === true` is exactly the range where `md:*` utilities are
 * inactive. Keep in sync with `--breakpoint-md` in `styles.css` if that is
 * ever customised.
 */
const MOBILE_QUERY = '(max-width: 767.98px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly mobile = signal(false);

  /** `true` while the viewport is narrower than Tailwind's `md` breakpoint. */
  readonly isMobile = this.mobile.asReadonly();

  constructor() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(MOBILE_QUERY);
    this.mobile.set(query.matches);

    const onChange = (event: MediaQueryListEvent): void => this.mobile.set(event.matches);
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }
}
