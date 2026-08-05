import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

/**
 * Locale codes the app understands. Extend cautiously — every new locale needs:
 *  - A JSON translation file under src/assets/i18n/<locale>.json
 *  - QA review of the layout in that direction
 *  - A professional translator pass for shipped content (CLAUDE.md §9)
 *
 * RTL locales: 'ar' only. All others are LTR.
 */
export type AppLocale = 'en' | 'ar' | 'fr';

/**
 * Writing direction. Always derived from the locale; never set directly.
 */
export type AppDirection = 'ltr' | 'rtl';

const RTL_LOCALES: ReadonlySet<AppLocale> = new Set(['ar']);

/**
 * Single source of truth for `<html lang>` and `<html dir>`.
 *
 * Components consume `locale()` and `direction()` as signals — never reach
 * for `document.documentElement.dir` directly. That keeps Tailwind's logical
 * utilities (ms-*, me-*, text-start) and `rtl:` / `ltr:` variants resolving
 * predictably against the only [dir] ancestor we ever set: <html>.
 *
 * See CLAUDE.md §3, §9 and /docs/06 §3 (a11y).
 */
@Injectable({ providedIn: 'root' })
export class DirectionService {
  private readonly document = inject(DOCUMENT);
  private readonly _locale = signal<AppLocale>(this.detectInitialLocale());

  readonly locale = this._locale.asReadonly();
  readonly direction = computed<AppDirection>(() =>
    RTL_LOCALES.has(this._locale()) ? 'rtl' : 'ltr',
  );
  readonly isRtl = computed(() => this.direction() === 'rtl');

  constructor() {
    // Mirror the initial signal value to the live <html> element so that
    // first-paint Tailwind utilities resolve correctly even before any user
    // interaction.
    this.applyToDocument(this._locale(), this.direction());
  }

  /**
   * Switch the active locale. Updates `<html lang>` and `<html dir>` atomically.
   * Persistence (cookie / user-profile API) belongs in a higher-level service —
   * keep this one focused on the DOM contract.
   */
  setLocale(next: AppLocale): void {
    if (next === this._locale()) {
      return;
    }
    this._locale.set(next);
    this.applyToDocument(next, this.direction());
  }

  private applyToDocument(locale: AppLocale, direction: AppDirection): void {
    const html = this.document.documentElement;
    if (html.lang !== locale) {
      html.lang = locale;
    }
    if (html.dir !== direction) {
      html.dir = direction;
    }
  }

  private detectInitialLocale(): AppLocale {
    // Read whatever is on <html> at boot. The index.html ships with `lang="en"`,
    // so this default is effectively `en` until a persisted preference arrives
    // via the auth profile fetch (handled outside this service).
    // const fromDom = this.document.documentElement.lang as AppLocale | '';
    // if (fromDom === 'ar' || fromDom === 'fr') return fromDom;
    return 'en';
  }
}
