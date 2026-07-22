import { Injectable, inject, signal } from '@angular/core';

import { ConsentApi } from './consent.api';
import {
  CONSENT_STORAGE_KEY,
  COOKIE_POLICY_VERSION,
  type ConsentSelection,
  type StoredConsent,
  toCategories,
} from './consent.model';

/**
 * `ConsentStore` — root singleton for GDPR cookie consent (BE-042 / C2).
 *
 * Decides whether the banner is shown (no stored choice for the current policy
 * version → visible), records the user's choice to `POST /consent` (best-effort
 * audit trail) and persists it locally so the banner stays dismissed until the
 * policy version changes. localStorage is used only for this non-sensitive
 * preference — never tokens/PII/exam data (CLAUDE.md §4).
 */
@Injectable({ providedIn: 'root' })
export class ConsentStore {
  private readonly api = inject(ConsentApi);

  private readonly _visible = signal(false);
  private readonly _selection = signal<ConsentSelection>({ analytics: false, marketing: false });

  /** Whether the consent banner should be rendered. */
  readonly visible = this._visible.asReadonly();
  /** The last decided (or default) non-essential selection, for the manage view. */
  readonly selection = this._selection.asReadonly();

  /** The policy version this build presents (exposed for the banner copy/link). */
  readonly policyVersion = COOKIE_POLICY_VERSION;

  constructor() {
    const stored = this.readStored();
    if (stored && stored.policyVersion === COOKIE_POLICY_VERSION) {
      this._selection.set({
        analytics: stored.categories.analytics,
        marketing: stored.categories.marketing,
      });
      this._visible.set(false);
    } else {
      // No decision yet (or the policy changed) — prompt with privacy-preserving
      // defaults (all non-essential OFF).
      this._visible.set(true);
    }
  }

  /** Accept every category (necessary + all non-essential). */
  acceptAll(): void {
    this.decide({ analytics: true, marketing: true });
  }

  /** Reject all non-essential categories (keep strictly-necessary only). */
  rejectNonEssential(): void {
    this.decide({ analytics: false, marketing: false });
  }

  /** Save a custom non-essential selection from the manage view. */
  save(selection: ConsentSelection): void {
    this.decide(selection);
  }

  /** Re-open the banner (e.g. from a "Manage cookies" footer link). */
  reopen(): void {
    this._visible.set(true);
  }

  private decide(selection: ConsentSelection): void {
    const categories = toCategories(selection);
    this._selection.set(selection);
    this._visible.set(false);
    this.writeStored({
      categories,
      policyVersion: COOKIE_POLICY_VERSION,
      decidedAt: new Date().toISOString(),
    });
    // Fire-and-forget audit trail — a failure must not block the UX; the choice
    // is already persisted locally and honoured client-side.
    this.api.record(categories, COOKIE_POLICY_VERSION).subscribe({ error: () => undefined });
  }

  private readStored(): StoredConsent | null {
    try {
      // eslint-disable-next-line no-restricted-globals -- consent choice is a UI-only pref (§2.7.1), not tokens/PII
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredConsent;
      if (!parsed?.categories || typeof parsed.policyVersion !== 'string') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private writeStored(value: StoredConsent): void {
    try {
      // eslint-disable-next-line no-restricted-globals -- consent choice is a UI-only pref (§2.7.1), not tokens/PII
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Private mode / storage disabled — the choice still holds for this session.
    }
  }
}
