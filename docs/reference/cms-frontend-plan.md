# CMS Frontend Plan — Stage 2

> **Status: NOT STARTED as a build** — no slice below is done, except Slice 1
> (landing regression fix — see [`../status/current-status.md`](../status/current-status.md)).
>
> Slices 9 and 10 were built on 2026-07-29 and then **rolled back** at the
> user's direction before review. Every CMS file was deleted and every CMS
> edit to a shared file reverted; `src/` contains no reference to `/cms`.
> Treat this plan as unexecuted. The one piece kept from that session is the
> **`/admin/contact` inbox** (part of Slice 10 below, dependent only on the
> separate `/admin/contact` API, unrelated to CMS) — it is built and staged,
> so **skip it when working Slice 10**. See
> [`../archive/cms-rollback-2026-07-29.md`](../archive/cms-rollback-2026-07-29.md)
> for what to reuse from that attempt.
>
> Context: Stage 1 (Phases 1–4: auth, admin app, student engines) is complete
> and committed on `feat/real-backend-integration`. This is the slice-by-slice
> plan for **Stage 2**: the CMS surface the backend merged 2026-07-22 →
> 2026-07-27, plus the landing regression that came with it.
>
> Endpoint contracts: [`backend/cms-blog-contact.md`](./backend/cms-blog-contact.md).
> Open backend gaps: [`backend/open-issues.md`](./backend/open-issues.md)
> (BE-I-27/28/31).

## 0. Why this exists

The backend shipped a typed-section CMS (`3e52625`) with a public read API,
an admin authoring API, 16 section types, and a seed of 8 marketing pages.
Nothing in `src/app` consumes it. Then `66a7632` deleted `GET /landing`,
which the shipped landing page called — the marketing site was therefore
both broken (fixed by Slice 1) and due to be rebuilt on the CMS (Slices 2–8).

### Working rules (unchanged from Stage 1)

- Build **one slice at a time**, verify, then **stop for review**. Never
  commit without the user's explicit "commit."
- After each slice: update `docs/status/current-status.md`, then
  `npm run typecheck && npm run lint && npm run build` must be clean
  (`npx ng build --configuration production` to check bundles/budgets).
- Data-access layering: see
  [`conventions/frontend-data-access-patterns.md`](./conventions/frontend-data-access-patterns.md).
- Angular rules: CLAUDE.md (standalone, signals, OnPush, new control flow, no
  `any`, `ios-` prefix, logical CSS, i18n en/fr/ar).
- Backend is **READ-ONLY**. New gaps get filed as `BE-I-xx` in
  [`backend/open-issues.md`](./backend/open-issues.md), not fixed.

## 1. Constraints and open backend gaps

| Gap | Effect on this plan |
| --- | --- |
| **BE-I-27** (narrowed) | No media upload for CMS sections or `ogImageUrl` — image fields stay pasted URLs with a visible hint. |
| **BE-I-28** | No draft preview endpoint — Slice 10 ships a **structural** preview built from the admin payload; must say so, not imply WYSIWYG. |
| SEO routes | `sitemap.xml`/`robots.txt` served under `/api/v1`; getting them to the site root is an **edge/CDN rewrite** — raise with infra, don't build Angular routes for them. |
| Non-prod indexing | `robots.txt` is a blanket `Disallow: /` outside production — expected, don't "fix" it. |

### Decisions to take before Slice 3

1. **Routing ownership** — do CMS pages take over `/`, `/about*`, `/why-scrum`,
   `/contact`, `/privacy`, `/terms` (a catch-all `:slug` route), or does each
   keep a hand-built Angular page with CMS supplying only content?
   *Recommendation:* a single catch-all CMS route with an explicit slug
   allowlist, so an unknown slug 404s in the app rather than hitting the API.
2. **Unknown section types** — render nothing and log, or render a visible
   placeholder in non-production? *Recommendation:* silent no-op in
   production, dev-only placeholder — a backend-side new type never breaks
   the page.
3. **Existing marketing components** — reuse the current landing components
   as section implementations (preferred, keeps the design) or build fresh.
4. **SSR/prerender** — `seo`/`jsonLd` only pay off with server rendering.
   Confirm whether Angular SSR is in scope; if not, the SEO slice is
   best-effort client-side (the app is currently plain CSR — no `server.ts`,
   no `@angular/ssr` in `angular.json`) and the sitemap still works.

## 2. Slices

Each slice is one session's work: build → typecheck/lint/build → update
`docs/status/current-status.md` → stop for review.

### Slice 1 — Landing regression fix (BE-I-30) — ✅ DONE

Repointed `LandingApi` off the deleted `GET /landing` to
`GET /analytics/public-stats` (stats) + `PublicCatalogStore` (featured
programs, composed from the already-loaded catalog cache, not a second
bespoke mapper). No `/landing` call remains anywhere in `src/`. No CMS work
involved — this was deliberately a minimal repoint; Slice 8 replaces the
page's static content with `GET /cms/pages/home`.

### Slice 2 — CMS data-access (logic only)

**Goal:** typed transport + store for the public CMS, consumed by nothing yet.

- **Files (new):** `features/cms/data-access/cms.{dto,model,mappers,api,store}.ts`.
- **Modelling:** a **discriminated union** on `type` for sections, so each
  component receives a narrowed type and the renderer's `switch` is
  exhaustive. Keep `config`/`content` shapes verbatim from `SECTION_SCHEMAS`.
  - **Recommendation carried over from the rolled-back attempt:** put the
    registry in **`@shared/types`**, not in this feature — both the public
    renderer and the admin editor (Slices 9–10) need the same
    `config`+`content` pairing; defining it twice guarantees drift. Give
    each feature a thin carrier: the public one resolves a single `content`
    block per section, the admin one keeps the per-locale `translations` map.
  - Pair it with a **compile-time assertion** that the type list and the
    registry cover each other, so a 17th type without a description fails
    `typecheck` rather than rendering an empty section at runtime.
- **Store:** `CmsPageStore` (page by slug, loading/error/`fallbackUsed`) and
  `CmsGlobalsStore` (nav/footer/announcement, fetched once, cached).
- **Acceptance:** typecheck clean; tree-shakes out of the bundle (no consumer
  yet); unknown `type` values parse without throwing.
- **Review gate:** the union + mapper design is the load-bearing decision of
  this workstream — review before Slice 3.

### Slice 3 — Public page shell, routing, section-renderer host

**Goal:** a CMS page renders end to end with zero section components
implemented.

- **Files:** `features/cms/pages/cms-page.page.ts`, `features/cms/cms.routes.ts`,
  `features/cms/components/section-host.ts`.
- **Behaviour:** resolve slug from the route → `CmsPageStore.load(slug)` →
  render `<ios-cms-section-host>` per section; unknown/unimplemented types
  no-op per Decision 2. 404 from the API → app's not-found page. Honour
  `direction` (RTL) per section block.
- **Acceptance:** `/{slug}` renders title + empty section list for a seeded
  page; a 404 slug shows the app 404; no console errors in en/fr/ar.

### Slice 4 — Section components, batch A (static/simple)

`hero`, `indicator_band`, `feature_cards`, `logo_cloud`, `rich_band`,
`cta_band`, `content_columns`.

- **Files:** `features/cms/components/sections/<type>.section.ts` (one
  standalone, OnPush component each).
- **Config/content pairs** from `SECTION_SCHEMAS`; e.g. `hero.config` =
  `{ backgroundImageUrl?, breadcrumb?, ctas?[] }`, `hero.content` = localized
  text + `ctaLabels[]`. **`config.ctas[i].href` pairs with
  `content.ctaLabels[i]` by index** — guard against length mismatch rather
  than assuming (the backend does not enforce equal lengths).
- **Acceptance:** seeded `home`/`about` pages render visually complete for
  these types in en/fr/ar; images use `ngSrc`; no layout shift.

### Slice 5 — Section components, batch B (structured) + SEO block

`level_matrix`, `steps_timeline`, `faq`, `testimonials`, `stats`, `media_embed`.

- **Plus:** wire the page `seo` block — `metaTitle`/`metaDescription`/
  canonical/OG tags via `Meta`/`Title`, and `seo.jsonLd` into a
  `<script type="application/ld+json">`. Angular's built-in sanitizer only;
  **never** `bypassSecurityTrust*` (the lesson-viewer precedent, `172f35a`).
- **`media_embed`:** `config.mediaType` is `image|video`; treat `url` as
  untrusted — allowlist hosts for iframe embeds.
- **Acceptance:** structured data validates in Google's Rich Results test for
  `home` and one interior page; `faq` renders as an accessible disclosure
  list (APG pattern).

### Slice 6 — Dynamic sections + contact form (BE-I-26 now fixed)

- **`certifications`:** render `section.data.certifications[]` (already
  hydrated); respect `config.tracks`, `defaultTrack`, `limitPerTrack`.
- **`journal`:** render `section.data.articles[]`; `config.limit`, `moreHref`.
- **`contact_form`:** `POST /contact` per
  [`backend/cms-blog-contact.md`](./backend/cms-blog-contact.md#contact--public-controllercontact-admin-controlleradmincontact).
  `company` is the honeypot — render visually hidden, always send empty.
  Handle 429 (throttled) with a friendly retry message, 400 with field
  errors, treat any 201 as success.
- **Acceptance:** a submission lands in `/admin/contact`; a filled honeypot
  is silently accepted client-side but never surfaces as an error;
  rate-limit path exercised manually.

### Slice 7 — Globals: nav, footer, announcement

- `GET /cms/globals/{nav,footer,announcement}` → drive the marketing navbar,
  footer, and announcement bar from CMS content, with the current hardcoded
  markup as the fallback when a global is missing (404 is a normal state).
- **Acceptance:** editing a global in the admin API changes the site chrome;
  a missing/invisible global degrades to the existing static chrome.

### Slice 8 — Home cutover

- Replace the landing page's static blocks with `GET /cms/pages/home`
  sections (Slice 1's counters stay — live data, not CMS content).
- Retire or repoint the now-duplicated landing components; delete dead code
  rather than leaving two implementations.
- **Acceptance:** `/` is CMS-driven; `public-stats` counters still render;
  static fallback still works if the CMS call fails; bundle budget unchanged
  or better after dead-code removal.

> **Stage 2 could reasonably ship here.** Slices 9–11 are authoring, and can
> be a separate review cycle.

### Slice 9 — Admin CMS: pages list + editor

> ⚠️ Built on 2026-07-29 and **rolled back** — not done. Reuse the design
> notes; don't re-derive them.

- **Files:** `features/admin/data-access/cms.{dto,model,mappers,api,store}.ts`,
  `features/admin/pages/admin-cms-pages.page.ts` (+ nav item, role-filtered).
- List (`?status=&search=&cursor=&limit=`, cursor via `@core/http`), create,
  edit, publish/unpublish, archive.
- **Surface the publish gate reasons** from the 409
  `CMS_PAGE_NOT_PUBLISHABLE` `errors[]` — the B7 precedent
  (`0db202e`, see [`../archive/admin-pages-build-log.md`](../archive/admin-pages-build-log.md)), not a generic message.
- Slug immutable once PUBLISHED (409 `SLUG_LOCKED`) — disable the field and
  explain why. `isSystem` pages can't be deleted (409 `SYSTEM_PAGE_PROTECTED`).
- **Acceptance:** a draft page can be created, edited, published and
  unpublished; every documented 409 renders a specific message.

### Slice 10 — Admin CMS: section editor, globals

> ⚠️ Built on 2026-07-29 and **rolled back**, except the contact inbox
> (skip that bullet — see below).

- **Per-type section forms** driven by descriptors, **not hand-written per
  type** — hand-writing duplicates the backend's `SECTION_SCHEMAS` as a
  second validation source that drifts, and the drift shows up as an editor
  blocked from saving something the server would accept. Let descriptors
  drive layout only, keep the backend authoritative, surface its 400
  `errors[]` (per-field, e.g. `"columns: columns must not be greater than
  6"`) verbatim beside the form.
- Add, edit, delete, **reorder** (`PUT /pages/:id/sections/order`,
  **learning_admin only** — narrower than the content_creator-allowed
  section edits it reorders), and per-locale translations (replace-merge,
  same idiom as catalog/exam/blog editors).
- ⚠️ **Index-paired fields** (`config.ctas[i]` ↔ `content.ctaLabels[i]`, same
  idiom on `indicator_band`, `feature_cards`, `logo_cloud`, `level_matrix`,
  `steps_timeline`, `stats`): the backend does **not** enforce equal
  lengths — the editor is the only place a mismatch can be caught. Warn on it.
- **Globals editor** for nav/footer/announcement. **No per-key schema on the
  backend** (`global.dtos.ts` accepts any object) — a validated JSON editor
  is the honest interim; a structured editor should wait until Slice 7
  settles what the public chrome actually reads. A 404 on read is a normal
  empty state, not an error — the global hasn't been created yet, `PATCH`
  will create it.
- ~~**Admin contact inbox**~~ — ✅ **DONE**, built & staged, kept through the
  CMS rollback (depends only on the separate `/admin/contact` API). **Skip
  this bullet.**
- **BE-I-27:** image fields are URL inputs with an explicit "paste a URL"
  hint. **BE-I-28:** the preview is structural only — label it.
- **Acceptance:** a page can be composed end-to-end in the UI and rendered by
  the public site; reorder round-trips; a section with invalid config shows
  the 400 field errors.

### Slice 11 — Hardening

- a11y sweep (landmarks, headings order, focus management, APG patterns for
  FAQ/disclosure/dialogs), RTL check for every section in Arabic, i18n key
  coverage in en/fr/ar, error/empty states, bundle-budget check with the
  production config, and a `/simplify` review pass (the Stage-1 precedent).
- Raise the edge rewrite for `sitemap.xml`/`robots.txt` with infra.

## 3. Section-type reference

| # | `type` | Slice | Dynamic `data` | Notes |
| - | --- | --- | --- | --- |
| 1 | `hero` | 4 | — | `config.ctas[]` ↔ `content.ctaLabels[]` **by index**; bg image URL |
| 2 | `indicator_band` | 4 | — | `config.style` (band styles) + `items[]` icon list |
| 3 | `feature_cards` | 4 | — | `config.columns`, `cards[]` |
| 4 | `logo_cloud` | 4 | — | `config.logos[]` — pasted URLs (BE-I-27) |
| 5 | `rich_band` | 4 | — | localized rich text — Angular sanitizer only |
| 6 | `cta_band` | 4 | — | `config.ctas[]` ↔ `content.ctaLabels[]` |
| 7 | `content_columns` | 4 | — | `imageUrl`, `imageSide: left\|right` (mind RTL) |
| 8 | `level_matrix` | 5 | — | `levels[]` + `matrix` — real data table, not a grid of divs |
| 9 | `steps_timeline` | 5 | — | `steps[]` + optional `cta` |
| 10 | `faq` | 5 | — | empty config; `content.items[{question,answer}]` — APG disclosure |
| 11 | `testimonials` | 5 | — | `config.columns`, `content.items[]` |
| 12 | `stats` | 5 | — | static numbers — **not** the live `public-stats` counters |
| 13 | `media_embed` | 5 | — | `mediaType: image\|video`, `url` — allowlist embed hosts |
| 14 | `certifications` | 6 | `data.certifications[]` | pre-hydrated from catalog — do not refetch |
| 15 | `journal` | 6 | `data.articles[]` | pre-hydrated from blog — do not refetch |
| 16 | `contact_form` | 6 | — | `POST /contact`; honeypot `company`; 429 handling |

## 4. Risks

| Risk | Mitigation |
| --- | --- |
| Backend adds a 17th section type and the renderer breaks | Unknown-type no-op (Decision 2) + dev-only placeholder; union has an explicit fallback arm |
| Backend keeps changing under us (three breaking changes in five days seen already) | Re-verify §1/contracts against source at the start of each slice; file `BE-I-xx` immediately |
| Sanitisation of CMS-authored HTML | Angular's built-in sanitizer only; never `bypassSecurityTrust*`; allowlist embed hosts |
| SEO value without SSR | Settle Decision 4 before Slice 5; sitemap + jsonLd still help, meta tags less so |
| Duplicate marketing implementations after Slice 8 | Delete the superseded components in the same slice, don't defer |
| Bundle growth on a public, first-paint-critical route | Lazy-load the CMS feature; keep section components in the CMS chunk; check budgets each slice |

## 5. Definition of done (Stage 2)

- Every seeded page (`home`, `about`, `about-agile`, `about-scrum`,
  `why-scrum`, `contact`, `privacy`, `terms`) renders from the CMS in
  en/fr/ar, RTL included.
- No frontend code calls `GET /landing`; landing counters come from
  `GET /analytics/public-stats`. (Done.)
- Contact submissions reach `/admin/contact` and are manageable there.
- An editor can create, compose, translate, reorder, publish and unpublish a
  page without developer help — with the BE-I-27/28 limitations stated in
  the UI.
- `typecheck`/`lint`/production `build` clean; bundle budgets respected;
  Arabic strings queued for professional review (CLAUDE.md §9).
