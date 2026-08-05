import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { AuthStore } from '@core/auth';
import { provideAppHttp } from '@core/http';
import { LanguageService } from '@core/i18n';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    /**
     * `scrollPositionRestoration: 'top'` — every route navigation (e.g. the
     * "Enroll Now" cert cards) lands at the top of the new page instead of
     * keeping the previous page's scroll offset, which without this made the
     * destination page appear to open mid-content. `anchorScrolling` keeps
     * `#fragment` links (e.g. in-page anchors) working as expected alongside it.
     */
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideAppHttp(),

    /**
     * Language / i18n initializer — runs before the first route renders.
     *
     * Loads the translation file for the persisted (or browser-detected)
     * locale so that every component — including the auth shell — already has
     * translated strings on first paint. The DirectionService is synchronised
     * inside LanguageService.init() so <html lang dir> is set atomically.
     */
    provideAppInitializer(() => inject(LanguageService).init()),

    /**
     * Silent re-authentication on app boot — /docs/07 §2.2.
     *
     * Awaits AuthStore.bootstrap() before the first route renders so guards
     * see a hydrated session if a refresh cookie was still valid. bootstrap()
     * silently attempts `POST /auth/refresh`; a 401 (no/expired cookie) just
     * leaves the visitor signed out. Failures are swallowed inside the store,
     * so app start is never blocked on the auth round-trip.
     */
    provideAppInitializer(() => inject(AuthStore).bootstrap()),
  ],
};
