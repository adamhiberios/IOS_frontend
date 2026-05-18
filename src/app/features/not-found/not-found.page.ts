import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageService } from '@core/i18n';

@Component({
  selector: 'ios-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-xl px-6 py-24 text-center">
      <p class="text-sm font-semibold text-ios-primary-500">404</p>
      <h1 class="mt-4 text-3xl font-semibold text-ios-fg">{{ lang.t('notFound.heading') }}</h1>
      <p class="mt-3 text-ios-fg-muted">
        {{ lang.t('notFound.description') }}
      </p>
      <a
        routerLink="/"
        class="mt-8 inline-flex items-center rounded-md bg-ios-primary-500 px-4 py-2 text-white hover:bg-ios-primary-600"
      >
        {{ lang.t('notFound.backHome') }}
      </a>
    </section>
  `,
})
export class NotFoundPage {
  protected readonly lang = inject(LanguageService);
}
