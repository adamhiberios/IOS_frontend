# Landing / Marketing Pages

> From the 2026-07-25 static-analysis page audit (frontend HEAD `904a478`).
> Method: static analysis only, code-verified against `IOS_Backend`. Some
> facts below have since changed (e.g. landing is no longer MOCK — see
> [`../../status/current-status.md`](../../status/current-status.md)); this
> file preserves the architectural detail, cross-check dates before relying
> on a status tag.

`features/landing`, 16 pages, lazy at `/`.

## `/` — LandingPage

The only landing page with a data layer. Historically `LandingStore.load()` →
`GET /landing` (deleted, BE-I-30) → now `GET /analytics/public-stats` +
`PublicCatalogStore` (see current status). Everything else on the page is
component-local i18n copy.

The three "Scrum Journal" cards are **static**: `FALLBACK_INSIGHT_POSTS`
(`landing.store.ts`) with hardcoded English titles/dates and links like
`/insights/why-employers-require-scrum-certification` — these slugs are
fixtures, not published articles, and almost certainly 404 against the real
blog (`GET /blog/:slug`). Unverified but high risk.

On API error the store keeps `FALLBACK_STATS = {programs:0, students:0,
certificatesIssued:0}` so the page still renders — a deliberate, sound
fallback pattern reused throughout the app.

## Cert-detail pages (7)

`cert-details-esm.page.ts` and six siblings (`esm-p`, `esm-a`, `epo`,
`epo-p`, `epo-a`, `esf`) are thin wrappers around
`<ios-cert-details-template>` with a `computed<CertDetailsConfig>` of i18n
keys and asset paths. **No catalog fetch for content** — price/level/syllabus
are translation strings; the identifier is a slug (`code: 'ESM'`), not the
backend certificate UUID. As of the SEO task (2026-08-03), the shared
template does fetch `GET /catalog/:id` for SEO metadata only (title/
description/JSON-LD) — content stays static, this was a deliberate scope
decision, not a data rewire.

`features/landing/data-access/catalog.api.ts` (`GET /catalog`, `/catalog/:id`,
`/catalog/:id/outline`) exists and is fully written but originally had **no
page injecting it** — the public catalog was wired at the transport layer
only until the SEO fetch above.

`CertDetailsEsmFPage` is the class name for the ESF page — cosmetic mismatch
with "ESM" naming, but harmless.

## `/contact` — ContactPage

Historically a stub: `onSubmit` sets `submitting=true`, runs a 1500ms
`setTimeout`, resets the form — nothing sent (`TODO(contact-api)`). The
duplicate `contact-section.ts` carried the same TODO. This is the old
**static marketing** contact page, distinct from the CMS `contact_form`
*section* (which now has a real `POST /contact` backend — see
[`../backend/cms-blog-contact.md`](../backend/cms-blog-contact.md)). Will be
superseded once CMS Slice 6 ships; not yet rewired as of this writing.

## Legal + about pages

Pure i18n copy (`/terms-of-use`, `/privacy-policy`). The four `about-*` pages
(`about-mock-exam`, `about-scrum-master`, `about-product-owner`,
`about-scrum-facilitator`) have **zero inbound links** anywhere in the app —
neither navbar nor footer reference them. `about-mock-exam` is also missing
the i18n key `mockExam.howItWorks.preview.timeRemainingLabel`.

## Dead links on the certification-comparison grid

`cert-levels-section.ts` and `market-stats-section.ts` link to
`/certifications/{psm,asm,ppo,apo,psf,asf}` — none of these routes exist.
Correct targets: `psm`→`esm-p`, `asm`→`esm-a`, `ppo`→`epo-p`, `apo`→`epo-a`;
`psf`/`asf` have no corresponding page at all. This is the landing page's
most-clicked surface. See
[`cross-cutting-findings.md`](./cross-cutting-findings.md) for the full dead-link table.

Also: `hero-section.ts`/`all-certs-cta-section.ts` link to `/guide` (no such
route).

**Not a defect:** `landing-footer.ts` deliberately uses `href="#"` with a
`preventDefault` handler for placeholder links, not `routerLink="#"` — avoids
an invalid-route navigation. Correct pattern.
