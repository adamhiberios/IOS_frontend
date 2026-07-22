/**
 * Cookie-consent domain model (GDPR, BE-042 / C2).
 *
 * The banner records the user's per-category choice as an **audit trail** via
 * `POST /consent`; the backend's only cookie (the HttpOnly refresh token) is
 * strictly-necessary and exempt from consent. The choice is also persisted
 * client-side so the banner doesn't reappear until the policy version changes.
 */

/**
 * Version of the cookie policy the banner presents. Bump this whenever the
 * policy materially changes — a stored consent for an older version re-triggers
 * the banner so the user can re-consent.
 */
export const COOKIE_POLICY_VERSION = '2026-01-01';

/** localStorage key holding the persisted {@link StoredConsent}. */
export const CONSENT_STORAGE_KEY = 'ios.cookie-consent';

/** The non-essential categories the user can opt into (necessary is always on). */
export interface ConsentSelection {
  readonly analytics: boolean;
  readonly marketing: boolean;
}

/**
 * The full category map sent to the backend. `necessary` is always `true`
 * (strictly-necessary cookies are exempt from consent but recorded for audit).
 */
export interface ConsentCategories extends ConsentSelection {
  readonly necessary: true;
}

/** What we persist locally to decide whether to re-show the banner. */
export interface StoredConsent {
  readonly categories: ConsentCategories;
  readonly policyVersion: string;
  /** ISO-8601 timestamp of when the choice was made on this device. */
  readonly decidedAt: string;
}

/** Build the backend category map from a non-essential selection. */
export function toCategories(selection: ConsentSelection): ConsentCategories {
  return { necessary: true, analytics: selection.analytics, marketing: selection.marketing };
}
