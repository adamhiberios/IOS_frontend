/**
 * DEVELOPMENT — local dev server. Identical to `environment.ts` so that
 * `ng serve` (which uses development by default) and `ng build --configuration=development`
 * stay in lock-step.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'development',
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  wsBaseUrl: 'ws://localhost:8080/ws',
  verboseLogging: true,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: false,
  },
  monitoringDsn: '',
};
