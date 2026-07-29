# CMS Frontend Plan — Stage 2

> **Status (updated 2026-07-29): NOT STARTED — no slice below is done.**
>
> Slices **9 and 10 were built on 2026-07-29 and then rolled back** at the user's
> direction before review. Every CMS file was deleted and every CMS edit to a
> shared file reverted; `src/` contains no reference to `/cms`. Treat this plan as
> unexecuted. The one piece kept from that session is the **`/admin/contact`
> inbox** (part of Slice 10 below, but dependent only on the separate
> `/admin/contact` API) — it is built and staged, so **skip it when working
> Slice 10**.
>
> **Slice 1 (BE-I-30) remains the highest-priority item**: the public landing page
> 404s in production until it ships.
>
> **Three findings from the rolled-back attempt are recorded below and are worth
> keeping** — they are properties of the *backend*, not of the deleted code:
> the bare-vs-wrapped envelope split on the admin CMS controller (§1), the fact
> that `SLUG_LOCKED` / `SYSTEM_PAGE_PROTECTED` / `SECTION_NOT_IN_PAGE` are **not**
> error `code`s (**BE-I-31**, §1), and that section **reorder is `learning_admin`
> only** (§Slice 10). The section-union design note under Slice 2 also stands as a
> recommendation, though no code for it now exists.
>
> Context: [`implementation-progress.md`](./implementation-progress.md) →
> "Stage 2 · CMS-ADMIN — built then rolled back".
> Stage 1 (Phases 1–4: auth, admin app, student engines) is complete and committed
> on `feat/real-backend-integration`. This document is the slice-by-slice plan for
> **Stage 2**, whose scope is the CMS surface the backend merged on 2026-07-22 →
> 2026-07-27 plus the landing regression that came with it.
>
> **Written 2026-07-27** against backend HEAD **`7160f11`** and frontend HEAD
> **`904a478`**. Endpoint contracts:
> [`backend-analysis.md` §6.9b](./backend-analysis.md#69b-latest-backend-sync-2026-07-25b--cms-module-blog-fix-analytics-window)
> (CMS inventory) and
> [§6.9c](./backend-analysis.md#69c-latest-backend-sync-2026-07-27--️-get-landing-removed-exam-review-contact-seo)
> (landing removal, contact, SEO). Open backend gaps:
> [`backend-blockers-report.md`](./backend-blockers-report.md).
> Progress is recorded in [`implementation-progress.md`](./implementation-progress.md)
> — update it after each slice, as with every other feature.

---

## 0. Why this exists

The backend shipped a **typed-section CMS** (`3e52625`) with a public read API, an
admin authoring API, 16 section types and a seed of 8 marketing pages. Nothing in
`src/app` consumes it — verified 2026-07-27: no `*.api.ts` references `/cms`.

Then `66a7632` **deleted `GET /landing`**, which the shipped landing page calls
(`features/landing/data-access/landing.api.ts:21-25`). The marketing site is
therefore both **broken today** and **due to be rebuilt on the CMS**. Slice 1 fixes
the breakage with the minimum change; Slices 2–8 rebuild the public site on the
CMS; Slices 9–11 add authoring.

### Working rules (unchanged from Stage 1)

- Build **one slice at a time**, verify, then **stop for review**. Never commit
  without the user's explicit "commit".
- After each slice: update `implementation-progress.md`, then
  `npm run typecheck && npm run lint && npm run build` must be clean
  (`npx ng build --configuration production` to check bundles/budgets).
- Data-access layering per feature:
  `data-access/<feat>.{dto,model,mappers,api,store}.ts` — DTOs mirror the wire,
  models are the frontend domain, stores are signal stores, no Observables leak
  into components.
- Angular rules (CLAUDE.md): standalone components, signals, `OnPush`, new control
  flow, no `any`, `ios-` selector prefix, logical CSS properties, i18n keys in
  `en/fr/ar` (Arabic needs professional review).
- Backend is **READ-ONLY**. New gaps get filed as `BE-I-xx` in
  `backend-analysis.md`, not fixed.

---

## 1. Contract summary (what Stage 2 talks to)

All paths under `/api/v1`. Envelopes are per-endpoint (BE-I-01).

**Public**

| Endpoint                   | Envelope                  | Notes                                                                                              |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /cms/pages/:slug`     | `{ data, meta:{locale} }` | PUBLISHED only (404 otherwise). `data:{ slug, title, locale, direction, sections[], seo{} }`.       |
| `GET /cms/globals/:key`    | `{ data, meta:{locale} }` | `nav` \| `footer` \| `announcement`; 404 when missing/invisible.                                    |
| `GET /analytics/public-stats` | bare `{ stats:{…} }`   | `{ programs, students, certificatesIssued }` — replaces the deleted `GET /landing`.                |
| `GET /catalog`             | `{ data, meta }`          | Featured programs (already consumed by `PublicCatalogStore`).                                      |
| `POST /contact`            | `{ data }` (201)          | Throttled (default 3 / 60 s → **429**), honeypot `company`, uniform 201, 400 on validation.        |
| `GET /sitemap.xml`, `/robots.txt` | XML / text         | Backend-served under `/api/v1`; **edge/CDN rewrite**, not an Angular route.                        |

**Section shape** (each item of `data.sections[]`):

```jsonc
{
  "type": "hero",              // one of the 16 types
  "config": { … },             // language-neutral structure (per-type schema)
  "content": { … },            // localized block for the resolved locale
  "locale": "fr",
  "direction": "ltr",
  "fallbackUsed": false,       // true when the block fell back to `en`
  "data": null                 // hydrated payload for dynamic types only
}
```

`certifications` → `data.certifications[]`; `journal` → `data.articles[]`; every
other type has `data: null` (`cms.service.ts:778-799`). **Never refetch
catalog/blog for those two — the payload is already there.**

**SEO block:** `{ metaTitle, metaDescription, canonicalUrl, ogType, ogImageUrl,
jsonLd }`. `jsonLd` is `WebSite + Organization` on `home`, `WebPage +
BreadcrumbList` elsewhere (`cms.service.ts:125-143`). Blog detail and catalog
detail carry their own `seo.jsonLd` too (`blog.service.ts:550`,
`catalog.service.ts:461`).

**Admin** (`admin/cms`, RolesGuard; `cms-admin.controller.ts:70-295`)

| Endpoint                                   | Roles                           | Notes                                            |
| ------------------------------------------ | ------------------------------- | -------------------------------------------------- |
| `POST/GET /pages`, `GET/PATCH /pages/:id`  | create/edit: content_creator, learning_admin · read: any admin | list is `?status=&search=&cursor=&limit=` |
| `PATCH /pages/:id/translations`            | content_creator, learning_admin | replace-merge per locale                         |
| `POST /pages/:id/publish` \| `/unpublish`  | learning_admin                  | 409 `CMS_PAGE_NOT_PUBLISHABLE` + `errors[]`      |
| `DELETE /pages/:id`                        | learning_admin                  | archive; `isSystem` → 409 `SYSTEM_PAGE_PROTECTED` |
| `POST /pages/:id/sections`, `PATCH/DELETE /sections/:sid`, `PATCH /sections/:sid/translations` | content_creator, learning_admin | config+content validated per type |
| `PUT /pages/:id/sections/order`            | learning_admin                  | `{ order: uuid[] }`; 400 `SECTION_NOT_IN_PAGE`   |
| `GET/PATCH /globals/:key`(`/translations`) | read: any admin · write: learning_admin | upsert                                    |
| `GET/GET :id/PATCH :id/DELETE :id` on `/admin/contact` | support_admin, learning_admin (delete: learning_admin) | contact inbox; delete is a **hard** GDPR delete |

**Error codes to branch on:** `CMS_PAGE_NOT_PUBLISHABLE` is a real RFC-7807
`code`. ⚠️ **Corrected 2026-07-29 (BE-I-31):** `SLUG_LOCKED`,
`SYSTEM_PAGE_PROTECTED` and `SECTION_NOT_IN_PAGE` are **not** — they are plain
`Conflict`/`BadRequest` exceptions carrying the sentinel only as a message
prefix, so they flatten to generic codes and cannot be told apart by `code`. The
"key off `code`, not status" rule (BE-I-01/12) therefore cannot be followed for
those three; Slice 9 substring-matches `detail` in one documented place
(`cms.store.ts#classifyFailure`) — **reuse that helper, don't reinvent the match.**

---

## 2. Constraints and open backend gaps

| Gap                     | Effect on this plan                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **BE-I-27** (narrowed)  | No media upload for CMS sections or `ogImageUrl` — image fields stay **pasted URLs** with a visible hint. Catalog images *do* have an upload URL now (separate, non-CMS task). |
| **BE-I-28**             | No draft preview endpoint — Slice 10 ships a **structural** preview built from the admin payload and must say so; do not imply WYSIWYG. |
| **BE-I-30**             | `GET /landing` is gone — Slice 1.                                                                         |
| SEO routes              | `sitemap.xml` / `robots.txt` are served under `/api/v1`; getting them to the site root is an **edge/CDN rewrite** — raise with infra, don't build Angular routes for them. |
| Non-prod indexing       | `robots.txt` is a blanket `Disallow: /` outside production — expected, don't "fix" it.                     |

### Decisions to take before Slice 3

1. **Routing ownership** — do CMS pages take over `/`, `/about*`, `/why-scrum`,
   `/contact`, `/privacy`, `/terms` (a catch-all `:slug` route), or does each keep
   a hand-built Angular page with CMS supplying only content? *Recommendation:* a
   single catch-all CMS route with an explicit slug allowlist, so an unknown slug
   404s in the app rather than hitting the API.
2. **Unknown section types** — render nothing and log, or render a visible
   placeholder in non-production? *Recommendation:* silent no-op in production,
   dev-only placeholder, so a backend-side new type never breaks the page.
3. **Existing marketing components** — reuse the current landing components as the
   section implementations (preferred, keeps the design) or build fresh ones.
4. **SSR/prerender** — `seo` and `jsonLd` only pay off with server rendering.
   Confirm whether Angular SSR is in scope for Stage 2; if not, the SEO slice is
   best-effort client-side and the sitemap still works.

---

## 3. Slices

Each slice is one session's work: build → `typecheck`/`lint`/`build` → update
`implementation-progress.md` → stop for review.

### Slice 1 — Landing regression fix (BE-I-30) ⛔ P0

**Goal:** the landing page stops 404-ing, without waiting for the CMS.

- **Endpoints:** `GET /analytics/public-stats` (bare `{ stats:{ programs,
  students, certificatesIssued } }`) + `GET /catalog` for featured programs.
- **Files:** `features/landing/data-access/landing.{api,dto,model,mappers}.ts` —
  repoint `LandingApi` (currently `${apiBaseUrl}/landing`, `landing.api.ts:21-25`);
  drop the `featuredPrograms` half of the old DTO and compose it from the existing
  `PublicCatalogStore` instead of a second bespoke mapper.
- **Acceptance:** landing renders live counters and featured programs; no request
  to `/landing` remains anywhere in `src/app`; static fallback still works when the
  stats call fails (keep the current graceful-degradation behaviour).
- **Note:** this is deliberately a minimal repoint. Slice 8 replaces the page's
  static content with `GET /cms/pages/home`.

### Slice 2 — CMS data-access (logic only)

**Goal:** typed transport + store for the public CMS, consumed by nothing yet.

- **Files (new):** `features/cms/data-access/cms.{dto,model,mappers,api,store}.ts`.
- **Modelling:** a **discriminated union** on `type` for sections, so each
  component receives a narrowed type and the renderer's `switch` is exhaustive.
  Keep `config`/`content` shapes verbatim from `SECTION_SCHEMAS`
  (`IOS_Backend/src/modules/cms/dto/section.dtos.ts:496-552`).
  - **Recommendation carried over from the rolled-back attempt:** put the
    registry in **`@shared/types`**, not in this feature. Both the public
    renderer *and* the admin editor (Slices 9–10) need the same `config`+`content`
    pairing; defining it twice guarantees drift. Give each feature a thin carrier
    over it — the public one resolves a single `content` block per section, the
    admin one keeps the per-locale `translations` map.
  - Pair it with a **compile-time assertion** that the type list and the registry
    cover each other, so adding a 17th type without describing it fails
    `typecheck` rather than rendering an empty section at runtime.
- **Store:** `CmsPageStore` (page by slug, loading/error/`fallbackUsed`) and
  `CmsGlobalsStore` (nav/footer/announcement, fetched once, cached).
- **Acceptance:** typecheck clean; tree-shakes out of the bundle (no consumer yet);
  unknown `type` values parse without throwing.
- **Review gate:** the union + mapper design is the load-bearing decision of this
  workstream — review before Slice 3.

### Slice 3 — Public page shell, routing, section-renderer host

**Goal:** a CMS page renders end to end with zero section components implemented.

- **Files:** `features/cms/pages/cms-page.page.ts`, `features/cms/cms.routes.ts`,
  `features/cms/components/section-host.ts`.
- **Behaviour:** resolve slug from the route → `CmsPageStore.load(slug)` → render
  `<ios-cms-section-host>` per section; unknown/unimplemented types no-op per
  Decision 2. 404 from the API → the app's not-found page. Honour
  `direction` (RTL) per section block.
- **Acceptance:** `/{slug}` renders title + an empty section list for a seeded
  page; a 404 slug shows the app 404; no console errors in en/fr/ar.

### Slice 4 — Section components, batch A (static/simple)

`hero`, `indicator_band`, `feature_cards`, `logo_cloud`, `rich_band`, `cta_band`,
`content_columns`.

- **Files:** `features/cms/components/sections/<type>.section.ts` (one standalone,
  `OnPush` component each).
- **Config/content pairs** come from `SECTION_SCHEMAS`; e.g. `hero.config` =
  `{ backgroundImageUrl?, breadcrumb?, ctas?[] }`, `hero.content` = localized text
  + `ctaLabels[]`. **`config.ctas[i].href` pairs with `content.ctaLabels[i]` by
  index** — guard against length mismatch rather than assuming.
- **Acceptance:** the seeded `home`/`about` pages render visually complete for
  these types in en/fr/ar; images use `ngSrc`; no layout shift.

### Slice 5 — Section components, batch B (structured) + SEO block

`level_matrix`, `steps_timeline`, `faq`, `testimonials`, `stats`, `media_embed`.

- **Plus:** wire the page `seo` block — `metaTitle`/`metaDescription`/canonical/OG
  tags via `Meta`/`Title`, and `seo.jsonLd` into a
  `<script type="application/ld+json">`. Sanitise nothing into `innerHTML` beyond
  Angular's built-in sanitizer; **never** `bypassSecurityTrust*` (the lesson-viewer
  precedent, `172f35a`).
- **`media_embed`:** `config.mediaType` is `image | video`; treat `url` as
  untrusted — allowlist hosts for iframe embeds.
- **Acceptance:** structured data validates in Google's Rich Results test for
  `home` and one interior page; `faq` renders as an accessible disclosure list
  (APG pattern).

### Slice 6 — Dynamic sections + contact form (BE-I-26 now fixed)

- **`certifications`:** render `section.data.certifications[]` (already hydrated);
  respect `config.tracks`, `defaultTrack`, `limitPerTrack`.
- **`journal`:** render `section.data.articles[]`; `config.limit`, `moreHref`.
- **`contact_form`:** `POST /contact` `{ name, email, subject?, message,
  pageSlug?, company? }`. **`company` is the honeypot — render it visually hidden
  and always send it empty.** Handle **429** (throttled: default 3 per 60 s) with a
  friendly retry message, 400 with field errors, and treat **any 201 as success**
  (the backend deliberately returns a uniform 201).
- **Acceptance:** a submission lands in `/admin/contact`; a filled honeypot is
  silently accepted client-side but never surfaces as an error; rate-limit path is
  exercised manually.

### Slice 7 — Globals: nav, footer, announcement

- `GET /cms/globals/{nav,footer,announcement}` → drive the marketing navbar,
  footer and the announcement bar from CMS content, with the current hardcoded
  markup as the fallback when a global is missing (404 is a normal state).
- **Acceptance:** editing a global in the admin API changes the site chrome; a
  missing/invisible global degrades to the existing static chrome.

### Slice 8 — Home cutover

- Replace the landing page's static blocks with `GET /cms/pages/home` sections
  (Slice 1's counters stay — they're live data, not CMS content).
- Retire or repoint the now-duplicated landing components; delete dead code rather
  than leaving two implementations.
- **Acceptance:** `/` is CMS-driven; `public-stats` counters still render; the
  static fallback path still works if the CMS call fails; bundle budget unchanged
  or better after the dead-code removal.

> **Stage 2 could reasonably ship here.** Slices 9–11 are authoring, and can be a
> separate review cycle.

### Slice 9 — Admin CMS: pages list + editor

> ⚠️ Built on 2026-07-29 and **rolled back** — not done. Notes from that attempt
> are inline below.

- **Files:** `features/admin/data-access/cms.{dto,model,mappers,api,store}.ts`,
  `features/admin/pages/admin-cms-pages.page.ts` (+ nav item, role-filtered).
- **Envelope warning (verified against source):** the list is `{ data, meta }`,
  but `GET /admin/cms/pages/:id` is **bare**, writes are `{ data }`, and
  `DELETE` returns only `{ id, status }`. Map per endpoint.
- List (`?status=&search=&cursor=&limit=`, cursor pagination via `@core/http`
  `toPage`/`toHttpParams`), create, edit, publish/unpublish, archive.
- **Surface the publish gate reasons** from the 409 `CMS_PAGE_NOT_PUBLISHABLE`
  `errors[]` — the B7 precedent (`0db202e`), not a generic message.
- Slug is immutable once PUBLISHED (409 `SLUG_LOCKED`) — disable the field and
  explain why. `isSystem` pages can't be deleted (409 `SYSTEM_PAGE_PROTECTED`).
- **Acceptance:** a draft page can be created, edited, published and unpublished;
  every documented 409 renders a specific message.

### Slice 10 — Admin CMS: section editor, globals — ⚠️ contact inbox is DONE, the rest is not

> Built on 2026-07-29 and **rolled back**, except the contact inbox. Two
> recommendations from that attempt are worth keeping:
>
> 1. **Generate the per-type section forms from descriptors rather than
>    hand-writing 32 shapes.** Hand-writing them duplicates the backend's
>    `SECTION_SCHEMAS` as a second validation source that drifts, and the drift
>    shows up as an editor blocked from saving something the server would accept.
>    Let descriptors drive layout only, keep the backend authoritative, and
>    surface its 400 `errors[]` (which are per-field, e.g.
>    `"columns: columns must not be greater than 6"`) verbatim beside the form.
> 2. **Globals have no per-key schema on the backend** (`global.dtos.ts:11-30`
>    accepts any object), so there is no contract to generate a form from. A
>    validated JSON editor is the honest interim; a structured editor should wait
>    until Slice 7 settles what the public chrome actually reads.

- **Per-type section forms** driven by the same union as Slice 2 — add, edit,
  delete, **reorder** (`PUT /pages/:id/sections/order`), and per-locale
  translations (replace-merge, same idiom as catalog/exam/blog editors).
  ⚠️ **Reorder is `learning_admin` only** — narrower than the `content_creator`-
  allowed section edits it reorders. Verified against source.
- ⚠️ **Index-paired fields** (`config.ctas[i]` ↔ `content.ctaLabels[i]`, and the
  same idiom on `indicator_band`, `feature_cards`, `logo_cloud`, `level_matrix`,
  `steps_timeline`, `stats`): the backend does **not** enforce equal lengths, so
  the editor is the only place a mismatch can be caught. Warn on it.
- **Globals editor** for nav/footer/announcement. A **404 on read is a normal
  empty state**, not an error — the global simply hasn't been created yet, and
  `PATCH` will create it.
- ~~**Admin contact inbox**~~ — ✅ **DONE** (built & staged 2026-07-29, kept
  through the CMS rollback because it depends only on the separate
  `/admin/contact` API). Cursor list + status transitions
  (`new → read → archived | spam`) + hard delete for learning_admin behind a
  confirm dialog naming it as **GDPR erasure**. **Skip this bullet.**
- **BE-I-27:** image fields are URL inputs with an explicit "paste a URL" hint.
  **BE-I-28:** the preview is structural only — label it.
- **Acceptance:** a page can be composed end-to-end in the UI and rendered by the
  public site; reorder round-trips; a section with invalid config shows the 400
  field errors.

### Slice 11 — Hardening

- a11y sweep (landmarks, headings order, focus management, APG patterns for FAQ /
  disclosure / dialogs), RTL check for every section in Arabic, i18n key coverage
  in en/fr/ar, error/empty states, bundle-budget check with the production config,
  and a `/simplify` review pass (the Stage-1 precedent).
- Raise the **edge rewrite** for `sitemap.xml` / `robots.txt` with infra.

---

## 4. Section-type reference

Config/content shapes are defined by `SECTION_SCHEMAS`
(`IOS_Backend/src/modules/cms/dto/section.dtos.ts:496-552`) — read it before
building each component; the table below is the build checklist, not the schema.

| #   | `type`            | Slice | Dynamic `data` | Notes                                                           |
| --- | ----------------- | ----- | -------------- | ----------------------------------------------------------------- |
| 1   | `hero`            | 4     | —              | `config.ctas[]` ↔ `content.ctaLabels[]` **by index**; bg image URL |
| 2   | `indicator_band`  | 4     | —              | `config.style` (band styles) + `items[]` icon list               |
| 3   | `feature_cards`   | 4     | —              | `config.columns`, `cards[]`                                      |
| 4   | `logo_cloud`      | 4     | —              | `config.logos[]` — pasted URLs (BE-I-27)                         |
| 5   | `rich_band`       | 4     | —              | localized rich text — Angular sanitizer only                     |
| 6   | `cta_band`        | 4     | —              | `config.ctas[]` ↔ `content.ctaLabels[]`                          |
| 7   | `content_columns` | 4     | —              | `imageUrl`, `imageSide: left\|right` (mind RTL)                  |
| 8   | `level_matrix`    | 5     | —              | `levels[]` + `matrix` — needs a real data table, not a grid of divs |
| 9   | `steps_timeline`  | 5     | —              | `steps[]` + optional `cta`                                       |
| 10  | `faq`             | 5     | —              | empty config; `content.items[{question,answer}]` — APG disclosure |
| 11  | `testimonials`    | 5     | —              | `config.columns`, `content.items[]`                              |
| 12  | `stats`           | 5     | —              | static numbers — **not** the live `public-stats` counters        |
| 13  | `media_embed`     | 5     | —              | `mediaType: image\|video`, `url` — allowlist embed hosts         |
| 14  | `certifications`  | 6     | `data.certifications[]` | pre-hydrated from catalog — do not refetch              |
| 15  | `journal`         | 6     | `data.articles[]`       | pre-hydrated from blog — do not refetch                 |
| 16  | `contact_form`    | 6     | —              | `POST /contact`; honeypot `company`; 429 handling                |

---

## 5. Risks

| Risk                                                                 | Mitigation                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Backend adds a 17th section type** and the renderer breaks         | Unknown-type no-op (Decision 2) + a dev-only placeholder; the union has an explicit fallback arm |
| **The backend keeps changing under us** — three breaking changes in five days (BE-I-29, BE-I-30, and the `/landing` removal) | Re-verify §1 against source at the start of each slice; file `BE-I-xx` immediately             |
| Sanitisation of CMS-authored HTML                                    | Angular's built-in sanitizer only; never `bypassSecurityTrust*`; allowlist embed hosts          |
| SEO value without SSR                                                | Settle Decision 4 before Slice 5; sitemap + jsonLd still help, meta tags less so                |
| Duplicate marketing implementations after Slice 8                    | Delete the superseded components in the same slice, don't defer                                  |
| Bundle growth on a public, first-paint-critical route                | Lazy-load the CMS feature; keep section components in the CMS chunk; check budgets each slice    |

## 6. Definition of done (Stage 2)

- Every seeded page (`home`, `about`, `about-agile`, `about-scrum`, `why-scrum`,
  `contact`, `privacy`, `terms`) renders from the CMS in en/fr/ar, RTL included.
- No frontend code calls `GET /landing`; the landing counters come from
  `GET /analytics/public-stats`.
- Contact submissions reach `/admin/contact` and are manageable there.
- An editor can create, compose, translate, reorder, publish and unpublish a page
  without developer help — with the BE-I-27/28 limitations stated in the UI.
- `typecheck` / `lint` / production `build` clean; bundle budgets respected;
  Arabic strings queued for professional review (CLAUDE.md §9).
