/**
 * UAT — user acceptance testing. Customer-facing pre-prod; data is realistic
 * but not real production data. Logging is muted to mirror prod-like noise.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'uat',
  production: true,
  apiBaseUrl: 'https://api-dev.instituteofscrum.org/api/v1',
  wsBaseUrl: 'wss://api-dev.instituteofscrum.org',
  verboseLogging: false,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: true,
  },
  monitoringDsn: '',
};
