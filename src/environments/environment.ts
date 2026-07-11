/**
 * Default environment — DEVELOPMENT.
 *
 * This file is the import target everywhere in the app. The Angular build
 * replaces it with the matching configuration's variant via `fileReplacements`
 * in angular.json. Never import any of the other environment.*.ts files
 * directly; always import from `@env/environment`.
 *
 * Per CLAUDE.md §13 these files are only edited with explicit user direction.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'development',
  production: false,
  apiBaseUrl: 'https://api-dev.instituteofscrum.org/api/v1',
  wsBaseUrl: 'wss://api-dev.instituteofscrum.org',
  /** Enable verbose console output and the i18n missing-key handler. */
  verboseLogging: true,
  /** Feature flags fall back to backend when undefined; defaults below favour local DX. */
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: false,
  },
  /** Sentry / monitoring DSN; empty in dev to avoid noisy events. */
  monitoringDsn: '',
};
