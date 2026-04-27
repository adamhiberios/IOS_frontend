import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ios-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-xl px-6 py-24 text-center">
      <p class="text-sm font-semibold text-ios-primary-500">404</p>
      <h1 class="mt-4 text-3xl font-semibold text-ios-fg">Page not found</h1>
      <p class="mt-3 text-ios-fg-muted">
        The route you tried to reach does not exist or you do not have access to it.
      </p>
      <a
        routerLink="/"
        class="mt-8 inline-flex items-center rounded-md bg-ios-primary-500 px-4 py-2 text-white hover:bg-ios-primary-600"
      >
        Back home
      </a>
    </section>
  `,
})
export class NotFoundPage {}
