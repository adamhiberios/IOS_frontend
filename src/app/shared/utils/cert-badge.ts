/**
 * Certificate family + badge artwork, derived from a backend `programCode`.
 *
 * The backend has no family or badge field, so every surface that shows a
 * badge (dashboard, My Learning, public certificate verification) derives it
 * from the code — here, so they all show the same artwork for a programme.
 */

/**
 * Certification family — drives the card background colour.
 * · 'esm' → ESM family (Endorsed Scrum Master)   #E8EDF0 (blue-soft)
 * · 'epo' → EPO family (Endorsed Product Owner)  #EEEFED (green-soft)
 * · 'esf' → everything else (e.g. Endorsed Scrum Facilitator)  #F6F6F6
 */
export type CertFamily = 'esm' | 'epo' | 'esf';

/** Badge asset base name per family — mirrors `src/app/assets/badge/*.svg`. */
const BADGE_BASE: Record<CertFamily, string> = {
  esm: 'endorsed_scrum_master',
  epo: 'endorsed_product_owner',
  esf: 'endorsed_scrum_facilitator',
};

/**
 * Derive the certification family from a `programCode` (e.g. `"ESM-P"` → `esm`,
 * `"EPO-A"` → `epo`, anything else → `esf`). Codes are backend-issued short
 * strings (`ESM`, `ESM-P`, `ESM-A`, `EPO`, `EPO-P`, `EPO-A`, `ESF`, …).
 */
export function resolveCertFamily(programCode: string): CertFamily {
  const upper = programCode.toUpperCase();
  if (upper.startsWith('ESM')) return 'esm';
  if (upper.startsWith('EPO')) return 'epo';
  return 'esf';
}

/**
 * Resolve the local badge SVG for a `programCode`. `esf` has no level variants
 * today — only `esm`/`epo` ship `_practitioner`/`_authority` artwork.
 */
export function resolveBadgeAsset(programCode: string): string {
  const family = resolveCertFamily(programCode);
  const base = BADGE_BASE[family];
  if (family === 'esf') return `assets/badge/${base}.svg`;
  const upper = programCode.toUpperCase();
  if (upper.endsWith('-P')) return `assets/badge/${base}_practitioner.svg`;
  if (upper.endsWith('-A')) return `assets/badge/${base}_authority.svg`;
  return `assets/badge/${base}.svg`;
}
