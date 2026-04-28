import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';

import { AuthStore } from '@core/auth';
import { provideAppHttp } from '@core/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideAppHttp(),

    /**
     * Silent re-authentication on app boot — /docs/07 §2.2.
     *
     * Awaits AuthStore.bootstrap() before the first route renders so guards
     * see a hydrated session if a refresh cookie was still valid. Failures
     * are swallowed inside the store (the user simply stays signed out);
     * we never want to block app start on an auth round-trip.
     *
     * In Epic 3 the underlying call is mocked: there's no httpOnly cookie
     * to read, so bootstrap is a no-op and a fresh visitor is just routed
     * through `/auth/login` like normal.
     */
    provideAppInitializer(() => inject(AuthStore).bootstrap()),
  ],
};
