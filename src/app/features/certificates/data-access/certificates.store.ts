import { Injectable, signal } from '@angular/core';

import type { CertDetailSection } from './certificates.model';

/**
 * `CertificatesStore` — signal store for the certificate detail page's
 * left side-nav section switch.
 *
 * Everything else the detail page needs — progress, curriculum, the
 * certification card, mock-test stats/history — now comes straight from
 * `CoursesStore` (`/learning/*`) and `MockStore` (`/mock/*`) in
 * `cert-detail.page.ts`. This store used to also hold a fixture-backed
 * `CertDetail` snapshot (`ESM_P_DETAIL_LOW`/`HIGH`) that fed the Overview
 * charts and the Mock test tab with the same canned numbers regardless of
 * which certificate was open; both were rewired to real data and the
 * fixture was removed (2026-08-02).
 */
@Injectable({ providedIn: 'root' })
export class CertificatesStore {
  private readonly _activeSection = signal<CertDetailSection>('overview');
  readonly activeSection = this._activeSection.asReadonly();

  setActiveSection(section: CertDetailSection): void {
    this._activeSection.set(section);
  }
}
