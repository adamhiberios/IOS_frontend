import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { type Page, problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { PublicCatalogApi } from './catalog.api';
import { type PublicCertificate, type PublicCertificateSeo } from './catalog.model';

/** Safety cap on the number of pages walked when building the full catalog. */
const MAX_PAGES = 10;

/**
 * `PublicCatalogStore` — shared read-model for the public catalog.
 *
 * Loads the (small) set of active certificates once and indexes them by
 * `programCode`, so the static marketing pages can overlay real backend data
 * (price/title) onto their fixed layout via {@link byCode}, and a browse grid
 * can read {@link items}. Marketing copy the backend doesn't own stays in the
 * page components; when the backend has no matching cert the page keeps its
 * static fallback. Business logic lives here; components only read signals.
 */
@Injectable({ providedIn: 'root' })
export class PublicCatalogStore {
  private readonly api = inject(PublicCatalogApi);
  private readonly lang = inject(LanguageService);

  private readonly _items = signal<readonly PublicCertificate[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _loaded = signal(false);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  /** Index of certificates by upper-cased `programCode` for O(1) lookup. */
  private readonly byCodeMap = computed(() => {
    const map = new Map<string, PublicCertificate>();
    for (const cert of this._items()) map.set(cert.programCode.toUpperCase(), cert);
    return map;
  });

  /** The backend certificate for a marketing `programCode`, or `undefined`. */
  byCode(programCode: string): PublicCertificate | undefined {
    return this.byCodeMap().get(programCode.toUpperCase());
  }

  /**
   * `seo` for one certificate, by marketing `programCode` — resolved to the
   * real id via {@link byCode} (list data), then fetched from `GET
   * /catalog/:id` (the only endpoint the backend attaches `seo`/`jsonLd` to).
   *
   * SEO-only: callers use this purely to populate `<title>`/meta/JSON-LD, not
   * page content — the static marketing pages' copy stays as authored. Never
   * throws; an unknown code, a 404, or a network failure all resolve to
   * `undefined` so a page's structured data is simply absent, not broken.
   * Cached per id for the life of the store.
   */
  private readonly seoCache = new Map<string, PublicCertificateSeo | undefined>();

  async loadSeo(programCode: string): Promise<PublicCertificateSeo | undefined> {
    await this.load();
    const cert = this.byCode(programCode);
    if (!cert) return undefined;
    if (this.seoCache.has(cert.id)) return this.seoCache.get(cert.id);
    try {
      const detail = await firstValueFrom(this.api.getById(cert.id));
      this.seoCache.set(cert.id, detail.seo);
      return detail.seo;
    } catch {
      this.seoCache.set(cert.id, undefined);
      return undefined;
    }
  }

  /**
   * Load the full active catalogue once (walks cursor pages up to {@link
   * MAX_PAGES}). Skips when already loaded unless `force` is passed. Never
   * throws — failures surface via {@link error} and the pages fall back to
   * their static copy.
   */
  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const collected: PublicCertificate[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const result: Page<PublicCertificate> = await firstValueFrom(
          this.api.list({ limit: 100, cursor: cursor ?? undefined }),
        );
        collected.push(...result.items);
        if (!result.hasMore || !result.nextCursor) break;
        cursor = result.nextCursor;
      }
      this._items.set(collected);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('catalog.loadError'));
    } finally {
      this._loading.set(false);
    }
  }

  /** Force a re-fetch of the catalogue. */
  async reload(): Promise<void> {
    await this.load(true);
  }
}
