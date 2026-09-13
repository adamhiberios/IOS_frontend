/**
 * LOCAL — a backend running on the developer's own machine.
 *
 * Exists so a locally-served frontend can talk to a locally-running API
 * without editing `environment.development.ts`, which is shared and points at
 * the deployed dev cluster. Use it via `npm run start:local`.
 *
 * The API must allow `http://localhost:4200` in its CORS allowlist — the
 * backend's `CORS_ORIGINS` does so by default in docker-compose. Note that
 * `localhost:4200` and `localhost:3000` are the same *site* (ports are not part
 * of same-site), so the httpOnly refresh cookie still flows normally.
 *
 * Never referenced by a deployed build: only the `local` configuration in
 * angular.json substitutes it.
 */
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  name: 'development',
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  wsBaseUrl: 'ws://localhost:3000',
  verboseLogging: true,
  featureFlags: {
    examOfflineMode: true,
    examAesEncryption: false,
  },
  monitoringDsn: '',
};
