/**
 * PRODUCTION — customer-facing.
 *
 * URLs and DSN must be the live values before the first prod build. The
 * placeholders below intentionally fail loudly if shipped accidentally;
 * `apiBaseUrl` will surface as 404s, and the missing monitoring DSN means
 * no errors get reported until it's set.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'production',
  production: true,
  apiBaseUrl: 'https://api.ios-lms.example/api',
  wsBaseUrl: 'wss://api.ios-lms.example/ws',
  verboseLogging: false,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: true,
  },
  monitoringDsn: '',
};
