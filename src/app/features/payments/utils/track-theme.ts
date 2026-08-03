/**
 * Resolves a certificate's marketing "track" theme class from its program
 * code — the same blue / green / brown palette `<ios-cert-details-template>`
 * uses (see `src/styles.css` `.cert-track-*`). Kept local to `features/payments`
 * (a pure string → string mapping, not a service) so the checkout page can
 * theme its order-summary panel without a cross-feature import into
 * `landing` or `dashboard` (CLAUDE.md §5 — cross-feature imports forbidden).
 *
 *  · ESM family (Endorsed Scrum Master, ESM-P, ESM-A) → blue
 *  · EPO family (Endorsed Product Owner, EPO-P, EPO-A) → green
 *  · ESF (Endorsed Scrum Facilitator) and anything else → brown (neutral default)
 */
export type TrackThemeClass = 'cert-track-blue' | 'cert-track-green' | 'cert-track-brown';

export function resolveTrackClass(programCode: string | null | undefined): TrackThemeClass {
  const code = (programCode ?? '').trim().toUpperCase();
  if (code.startsWith('ESM')) return 'cert-track-blue';
  if (code.startsWith('EPO')) return 'cert-track-green';
  return 'cert-track-brown';
}
