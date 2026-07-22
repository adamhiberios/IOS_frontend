/**
 * Cookie-consent (GDPR, BE-042 / C2) — public surface.
 *
 * The banner is root-mounted app chrome; the store is a root singleton. Feature
 * code should not need these directly beyond a possible "Manage cookies" link
 * calling `ConsentStore.reopen()`.
 */
export { CookieConsentBanner } from './cookie-consent-banner';
export { ConsentStore } from './consent.store';
export { COOKIE_POLICY_VERSION, type ConsentSelection } from './consent.model';
