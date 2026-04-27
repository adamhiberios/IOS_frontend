/**
 * Shape of every environment.*.ts file. Adding a field here forces every
 * environment to declare it — guarantees no env drifts silently.
 */
export interface AppEnvironment {
  /** Human-readable identifier — surfaced in the about page and bug reports. */
  readonly name: 'development' | 'test' | 'uat' | 'production';
  /** Mirrors Angular's own `environment.production` semantics. */
  readonly production: boolean;
  /** REST base URL. CLAUDE.md §4: never hardcode in source files. */
  readonly apiBaseUrl: string;
  /** WebSocket base URL. */
  readonly wsBaseUrl: string;
  /** Verbose console output, dev-only banners, missing-i18n logging. */
  readonly verboseLogging: boolean;
  /** Build-time feature-flag defaults; backend can still override at runtime. */
  readonly featureFlags: {
    /** Allow IndexedDB-backed exam answer drafts. */
    readonly examOfflineMode: boolean;
    /** Encrypt exam answer drafts with AES-GCM (per /docs/09 §7). */
    readonly examAesEncryption: boolean;
  };
  /** Sentry / monitoring DSN. Empty disables monitoring. */
  readonly monitoringDsn: string;
}
