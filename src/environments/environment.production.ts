/**
 * PRODUCTION — customer-facing.
 *
 * Points at the live IOS API (`https://api.instituteofscrum.org/api/v1`).
 * `monitoringDsn` is still empty — no errors get reported until it is set.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'production',
  production: true,
  apiBaseUrl: 'https://api.instituteofscrum.org/api/v1',
  wsBaseUrl: 'wss://api.instituteofscrum.org',
  verboseLogging: false,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: true,
  },
  monitoringDsn: '',
};
