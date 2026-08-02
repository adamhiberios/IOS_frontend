# Insights (Public Blog)

`features/insights`, 2 public pages, `/insights` + `/insights/:slug`.

> **Naming collision to be aware of:** `features/insights` is the **public
> blog** (article posts with slugs), not student analytics. Student
> analytics aggregates (`GET /insights` API endpoint — same name, different
> thing) live on the Dashboard overview only, via
> `features/dashboard/data-access/insights.*` (`StudentInsightsStore`) — see
> [`dashboard.md`](./dashboard.md). There is deliberately no standalone
> analytics page. The two `insights.*` i18n namespaces (blog vs. dashboard →
> `studentInsights.*`) are kept separate.

Both pages are **REAL** against `InsightsApi` (base `${apiBaseUrl}/blog`) →
backend `blog.controller.ts`. Endpoint contract:
[`../backend/cms-blog-contact.md`](../backend/cms-blog-contact.md#blog--public-controllerblog-admin-controlleradminblog).

- **List** — cursor/keyset infinite feed (`toPage`, page limit 9), keeps
  backend `published_at DESC` order (no client resort). Search is
  server-side (`?search=`, English title), debounced 300ms.
- **Detail** — renders admin-authored `contentHtml` via Angular's built-in
  `[innerHTML]` sanitizer (never `bypassSecurityTrust*`), scoped
  `.ios-blog-prose` styling. 404 (draft/archived/unknown slug) → not-found
  state. Read-time computed from body word count.

**Contract correction from an earlier note:** `GET /blog/:slug` is
**enveloped** `{ data, meta:{locale} }`, not bare as first assumed.
`authorName`/`metaDescription`/`seo.*` are nullable (mapped `?? ''`).

**Shared `ios-insights-card`:** `readTime` made optional, added optional
`authorName` byline (list rows have an author but no read-time). Backend
supplies no featured image — the mapper derives a deterministic placeholder
(`blog_1..3.png`) from the slug.

**Known discrepancy:** the landing page's Scrum-Journal cards link to three
hardcoded fixture slugs (`landing.store.ts`) that are very likely not
published articles — see [`landing-marketing.md`](./landing-marketing.md).

**SEO:** `seo.jsonLd` is now rendered into a
`<script type="application/ld+json">` tag on the detail page via the shared
`JsonLdService` (2026-08-03 SEO task) — see
[`../../status/current-status.md`](../../status/current-status.md).

## Admin authoring — `/admin/blog`

Full CRUD + lifecycle + per-locale translations. See
[`admin.md`](./admin.md) and
[`../../archive/changelog.md`](../../archive/changelog.md) for the build
write-up (rich-text editor choice, translations dialog, slug-lock behaviour).
