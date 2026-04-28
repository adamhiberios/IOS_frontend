import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 403 — the user is signed in but doesn't have a role that grants access
 * to the route they tried to reach. Surfaces as a friendly dead-end rather
 * than the 404 page so they don't think the URL is broken.
 *
 * The frontend is not the security boundary (CLAUDE.md §8); this page is
 * UX, not enforcement. The backend independently rejects any protected
 * action regardless of what the user lands on here.
 */
@Component({
  selector: 'ios-forbidden-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-xl px-6 py-24 text-center">
      <p class="text-sm font-semibold text-ios-brand-primary">403</p>
      <h1 class="mt-4 text-3xl font-semibold text-ios-brand-dark">Access denied</h1>
      <p class="mt-3 text-gray-600">
        You're signed in, but you don't have permission to view this page.
      </p>
      <a
        routerLink="/dashboard"
        class="mt-8 inline-flex items-center rounded-md bg-ios-brand-primary px-4 py-2 text-white hover:opacity-90"
      >
        Back to dashboard
      </a>
    </section>
  `,
})
export class ForbiddenPage {}
