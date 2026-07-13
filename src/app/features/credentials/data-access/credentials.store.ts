import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import { CredentialsApi } from './credentials.api';
import { type EarnedCertificate } from './credentials.model';

/**
 * `CredentialsStore` — injectable singleton for the earned-certificates feature.
 *
 * Owns the student's `GET /me/certificates` list. Business logic lives here; the
 * page only binds signals and dispatches `load` / `reload`. State mutates through
 * action methods; signals are exposed as `.asReadonly()` views (docs/03 §3). No
 * Observables leak to the component — `firstValueFrom` bridges inside the store.
 * Certificates are user PII, so the cache is cleared on `user.logged-out`.
 */
@Injectable({ providedIn: 'root' })
export class CredentialsStore {
  private readonly api = inject(CredentialsApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  /* ─── private writable state ─── */
  private readonly _items = signal<readonly EarnedCertificate[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  /** True once a fetch has completed (so an empty list ≠ "not loaded yet"). */
  private readonly _loaded = signal(false);

  /* ─── public readonly views ─── */
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  /** True when the fetch succeeded and returned no certificates. */
  readonly isEmpty = computed(() => this._loaded() && this._items().length === 0);

  /* ─── actions ─── */

  /**
   * Load earned certificates from `GET /me/certificates`. Skips the fetch when
   * already loaded unless `force` is passed (e.g. a manual retry).
   */
  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      this._items.set(await firstValueFrom(this.api.list()));
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('credentials.loadError'));
    } finally {
      this._loading.set(false);
    }
  }

  /** Force a re-fetch of the certificate list. */
  async reload(): Promise<void> {
    await this.load(true);
  }

  /** Wipe all state — invoked on logout so no credential survives the session. */
  private clear(): void {
    this._items.set([]);
    this._error.set(null);
    this._loaded.set(false);
  }
}
