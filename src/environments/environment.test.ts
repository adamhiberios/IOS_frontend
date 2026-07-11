/**
 * TEST — internal QA / staging-like environment behind the corporate VPN.
 * Exercises the production code path (production: true) but points at the
 * test cluster and keeps verbose logging on for triage.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'test',
  production: true,
  apiBaseUrl: 'https://api-dev.instituteofscrum.org/api/v1',
  wsBaseUrl: 'wss://api-dev.instituteofscrum.org',
  verboseLogging: true,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: true,
  },
  monitoringDsn: '',
};
