/**
 * DEVELOPMENT — local dev server. Identical to `environment.ts` so that
 * `ng serve` (which uses development by default) and `ng build --configuration=development`
 * stay in lock-step.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'development',
  production: false,
  apiBaseUrl: 'https://api-dev.instituteofscrum.org/api/v1',
  wsBaseUrl: 'wss://api-dev.instituteofscrum.org',
  verboseLogging: true,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: false,
  },
  monitoringDsn: '',
};
