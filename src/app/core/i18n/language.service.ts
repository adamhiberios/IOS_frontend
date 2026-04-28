import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DirectionService, type AppLocale } from './direction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Flat or nested JSON structure emitted by a translation file / endpoint. */
type TranslationNode = string | TranslationTree;
interface TranslationTree {
  [key: string]: TranslationNode;
}

/** Named params for interpolation — e.g. `t('key', { name: 'John' })`. */
type TranslateParams = Record<string, string>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Storage key for persisting the user's locale preference. */
const LOCALE_STORAGE_KEY = 'ios_locale';

/** Base path for local JSON files. Future: swap to an API endpoint. */
const I18N_BASE = '/assets/i18n';

/**
 * Supported locales with their human-readable display labels.
 * Display labels are intentionally never translated — they always appear in
 * their own script so users can recognise and select them regardless of the
 * current UI language.
 */
export const SUPPORTED_LOCALES: readonly { code: AppLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
] as const;

// ---------------------------------------------------------------------------
// Helper — key resolver
// ---------------------------------------------------------------------------

/**
 * Resolves a dot-notation key (e.g. `'auth.login.title'`) against a nested
 * translation tree and interpolates `{param}` placeholders.
 *
 * Returns the key itself when the path is missing so missing translations are
 * visible in the UI rather than silently blank.
 */
function resolveKey(tree: TranslationTree, key: string, params?: TranslateParams): string {
  const segments = key.split('.');
  let node: TranslationNode = tree;

  for (const seg of segments) {
    if (typeof node !== 'object' || node === null || !(seg in node)) {
      return key;
    }
    node = node[seg];
  }

  if (typeof node !== 'string') {
    return key;
  }

  if (!params) return node;

  return node.replace(/\{(\w+)\}/g, (_: string, p: string) => params[p] ?? `{${p}}`);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * `LanguageService` — single source of truth for locale, direction, and
 * translated strings.
 *
 * ## Design goals
 * - **Signal-first**: `locale`, `direction`, `isRtl` are readonly signals so
 *   OnPush + zoneless components re-render automatically on locale changes.
 * - **Template-friendly**: `t(key, params?)` reads `_translations` signal
 *   internally, so any template expression calling it is automatically tracked
 *   and will re-evaluate when the locale changes (no pipe needed).
 * - **Future-proof**: translation loading is isolated in `loadTranslations()`.
 *   Swapping the source from a local JSON file to a backend endpoint only
 *   requires changing the URL in that single method.
 * - **Persistence**: the selected locale is stored in `localStorage` (language
 *   preference is a UI setting, NOT sensitive data — see CLAUDE.md §8 storage
 *   policy).
 *
 * ## Usage in components
 * ```ts
 * protected readonly lang = inject(LanguageService);
 * // template: {{ lang.t('auth.login.title') }}
 * ```
 *
 * ## Adding a new locale
 * 1. Add the code to `AppLocale` in `direction.ts`.
 * 2. Add a JSON file to `src/assets/i18n/<code>.json`.
 * 3. Add an entry to `SUPPORTED_LOCALES` in this file.
 * 4. If RTL, add the code to `RTL_LOCALES` in `direction.ts`.
 *
 * ## Migrating to a backend endpoint (future)
 * Replace the `url` in `loadTranslations()` with the API endpoint. The rest
 * of the service — signal shape, caching, initializer — remains unchanged.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly http = inject(HttpClient);
  private readonly dir = inject(DirectionService);

  // ---- Private state -------------------------------------------------------

  private readonly _locale = signal<AppLocale>(this.readPersistedLocale());
  private readonly _translations = signal<TranslationTree>({});
  private readonly _loading = signal(false);

  /** Simple in-session cache: locale → loaded tree.  Avoids re-fetching when
   *  the user toggles back to a previously visited locale. */
  private readonly cache = new Map<AppLocale, TranslationTree>();

  // ---- Public read-only surface --------------------------------------------

  /** The currently active locale code. */
  readonly locale = this._locale.asReadonly();

  /** `true` while a translation file is being fetched. */
  readonly loading = this._loading.asReadonly();

  /**
   * Writing direction derived from the locale.
   * Delegated to `DirectionService` which owns the `<html dir>` attribute.
   */
  readonly direction = this.dir.direction;

  /** Convenience boolean; use in templates for conditional layout adjustments. */
  readonly isRtl = this.dir.isRtl;

  // ---- Translation accessor ------------------------------------------------

  /**
   * Looks up `key` (dot-notation) in the active translation tree and
   * interpolates optional `{param}` placeholders.
   *
   * **Signal-tracked**: because this method reads `this._translations()`, any
   * Angular template expression that calls `lang.t(...)` automatically
   * establishes a reactive dependency on the translations signal and will
   * re-evaluate when the locale changes.
   *
   * @example
   * ```html
   * {{ lang.t('auth.login.title') }}
   * {{ lang.t('common.greeting', { name: user.name }) }}
   * ```
   */
  t(key: string, params?: TranslateParams): string {
    return resolveKey(this._translations(), key, params);
  }

  /**
   * Returns all supported locale options (code + display label).
   * Suitable for populating a language-selector dropdown.
   */
  readonly supportedLocales = SUPPORTED_LOCALES;

  // ---- Lifecycle -----------------------------------------------------------

  /**
   * Loads the initial translation file. Call once from `app.config.ts` via
   * `provideAppInitializer` so translations are ready before the first route
   * renders.
   */
  async init(): Promise<void> {
    await this.loadTranslations(this._locale());
  }

  // ---- Locale switching ----------------------------------------------------

  /**
   * Switches the active locale. Loads the translation file (or uses cache),
   * updates the DOM (`<html lang dir>`), and persists the choice.
   */
  async setLocale(next: AppLocale): Promise<void> {
    if (next === this._locale()) return;
    await this.loadTranslations(next);
    this._locale.set(next);
    this.dir.setLocale(next);
    this.persistLocale(next);
  }

  // ---- Private helpers -----------------------------------------------------

  /**
   * Fetches the translation JSON for `locale`.
   *
   * **Future migration point**: to load from a backend endpoint instead of a
   * local asset, replace the `url` below with your API path, e.g.:
   * ```ts
   * const url = `${environment.apiBaseUrl}/i18n/${locale}`;
   * ```
   * The surrounding loading/caching/signal-update logic stays the same.
   */
  private async loadTranslations(locale: AppLocale): Promise<void> {
    if (this.cache.has(locale)) {
      this._translations.set(this.cache.get(locale)!);
      return;
    }

    this._loading.set(true);
    try {
      // ── Current source: local JSON assets ──────────────────────────────────
      const url = `${I18N_BASE}/${locale}.json`;
      // ── Future source: backend endpoint ────────────────────────────────────
      // const url = `${environment.apiBaseUrl}/i18n/${locale}`;
      // ───────────────────────────────────────────────────────────────────────
      const tree = await firstValueFrom(this.http.get<TranslationTree>(url));
      this.cache.set(locale, tree);
      this._translations.set(tree);
    } catch (err) {
      // Log but don't crash the app. The UI will show raw keys, which is
      // visible enough to surface the issue in development/testing.
      console.error(`[LanguageService] Failed to load translations for "${locale}":`, err);
    } finally {
      this._loading.set(false);
    }
  }

  private readPersistedLocale(): AppLocale {
    try {
      // eslint-disable-next-line no-restricted-globals -- locale pref is UI-only, not tokens/PII
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale | null;
      const valid: AppLocale[] = SUPPORTED_LOCALES.map((l) => l.code);
      if (stored && valid.includes(stored)) return stored;
    } catch {
      // localStorage may be blocked (private browsing / permissions policy).
    }
    // Fallback: honour the <html lang> set by index.html (server-side default
    // or the browser's document language preference).
    const fromDom = document.documentElement.lang as AppLocale | '';
    if (fromDom === 'ar' || fromDom === 'fr') return fromDom;
    return 'en';
  }

  private persistLocale(locale: AppLocale): void {
    try {
      // eslint-disable-next-line no-restricted-globals -- locale pref is UI-only, not tokens/PII
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore — preference just won't survive the next session.
    }
  }
}
