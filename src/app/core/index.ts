/**
 * Core layer — singletons only (auth, http, idle, network, error, i18n, event bus).
 *
 * Cross-feature traffic flows through here per CLAUDE.md §5–§6.
 * Provided once via providers in app.config.ts; never imported into a feature
 * folder for instantiation, only through DI tokens.
 */

export * from './auth';
export * from './http';
export * from './i18n';
export * from './event-bus';
