# CMS, Blog & Contact — Endpoint Contracts

> Read this when working on the CMS renderer/editor, blog, or the contact
> form. Build plan for CMS: [`../cms-frontend-plan.md`](../cms-frontend-plan.md).
> Open CMS gaps: [`open-issues.md`](./open-issues.md) (BE-I-27/28/31).

## CMS — public `@Controller('cms')` + admin `@Controller('admin/cms')`

Merged `3e52625` (2026-07-22). **No frontend consumer exists** except the
rolled-back-then-partially-kept admin contact inbox (unrelated API). See
[`../cms-frontend-plan.md`](../cms-frontend-plan.md) for the full build plan.

### Public (`@Public()`, GET only)

Both return `{ data, meta:{ locale } }` — block-level locale resolution with
`en` fallback + `fallbackUsed` flag, same idiom as catalog/blog translations.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/cms/pages/:slug` | PUBLISHED only (else 404). `data:{ slug, title, locale, direction, sections:[{ type, config, content, locale, direction, fallbackUsed, data\|null }], seo:{ metaTitle, metaDescription, canonicalUrl, ogType, ogImageUrl } }`. Seeded slugs: `home`, `about`, `about-agile`, `about-scrum`, `why-scrum`, `contact`, `privacy`, `terms`. |
| GET | `/cms/globals/:key` | `nav` \| `footer` \| `announcement`; `data:{ key, config, content, locale, direction, fallbackUsed }`; 404 when missing/invisible. |

### Section shape (each item of `data.sections[]`)

```jsonc
{
  "type": "hero",              // one of 16 types
  "config": { … },              // language-neutral structure (per-type schema)
  "content": { … },             // localized block for the resolved locale
  "locale": "fr",
  "direction": "ltr",
  "fallbackUsed": false,
  "data": null                  // hydrated payload for dynamic types only
}
```

`certifications` → `data.certifications[]`; `journal` → `data.articles[]`
(both pre-hydrated at read time — **never refetch** catalog/blog for them).
Every other type has `data: null`.

**16 section types:** `hero`, `indicator_band`, `feature_cards`, `logo_cloud`,
`rich_band`, `level_matrix`, `steps_timeline`, `cta_band`, `faq`,
`content_columns`, `certifications`*, `journal`*, `testimonials`, `stats`,
`media_embed`, `contact_form`. Shapes are defined by `SECTION_SCHEMAS`
(`IOS_Backend/src/modules/cms/dto/section.dtos.ts:496-552`) — read it before
building each component.

**SEO block:** `{ metaTitle, metaDescription, canonicalUrl, ogType,
ogImageUrl, jsonLd }`. `jsonLd` is `WebSite + Organization` on `home`,
`WebPage + BreadcrumbList` elsewhere. Blog detail and catalog detail also
carry their own `seo.jsonLd`.

### Admin (`admin/cms`, RolesGuard, RLS-audited writes)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| POST | `/admin/cms/pages` | content_creator, learning_admin | creates DRAFT |
| GET | `/admin/cms/pages` | any admin | `?status=&search=&cursor=&limit=` |
| GET | `/admin/cms/pages/:id` | any admin | page + ordered sections — **bare**, not `{ data }` |
| PATCH | `/admin/cms/pages/:id` | content_creator, learning_admin | slug immutable once PUBLISHED (409 `SLUG_LOCKED`) |
| PATCH | `/admin/cms/pages/:id/translations` | content_creator, learning_admin | replace-merge per locale |
| POST | `/admin/cms/pages/:id/{publish,unpublish}` | learning_admin | 409 `CMS_PAGE_NOT_PUBLISHABLE` + `errors[]` (this one IS a real error code) |
| DELETE | `/admin/cms/pages/:id` | learning_admin | archive; `isSystem` page → 409 `SYSTEM_PAGE_PROTECTED` |
| POST | `/admin/cms/pages/:id/sections` | content_creator, learning_admin | validates `config`+`content` per section-type schema |
| PATCH/DELETE | `/admin/cms/sections/:sid` (`/translations`) | content_creator, learning_admin | |
| PUT | `/admin/cms/pages/:id/sections/order` | **learning_admin only** | `{ order: uuid[] }`; 400 `SECTION_NOT_IN_PAGE`. Narrower than the content_creator-allowed section edits it reorders. |
| GET/PATCH | `/admin/cms/globals/:key` (`/translations`) | read: any admin · write: learning_admin | upsert (creates when missing — a 404 on read is a normal empty state) |
| DELETE returns | — | — | only `{ id, status }` |

**Envelope warning:** list is `{ data, meta }`, single-page read is **bare**,
writes are `{ data }`, delete returns only `{ id, status }` — all four shapes
on the same controller. Map per endpoint.

**Error codes to branch on:** `CMS_PAGE_NOT_PUBLISHABLE` is a real
`AppException` with its own `code`. `SLUG_LOCKED`, `SYSTEM_PAGE_PROTECTED`,
`SECTION_NOT_IN_PAGE` are **not** — see [`open-issues.md`](./open-issues.md#be-i-31).

## Blog — public `@Controller('blog')`, admin `@Controller('admin/blog')`

Shipped `334d0c6`. Fully consumed by the frontend (public rewire + admin
authoring).

### Public (`@Public()`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/blog` | `{ data, meta.pagination }` (cursor, `published_at DESC`). Item: `{ slug, title, metaDescription, publishedAt, authorName, locale, fallbackUsed }` — no `contentHtml`. Optional `?search=` (English title). |
| GET | `/blog/:slug` | `{ data, meta:{locale} }` (⚠️ enveloped, not bare — corrected from an earlier note). `BlogDetailDto`: `{ slug, title, contentHtml, metaDescription, publishedAt, authorName, locale, fallbackUsed, seo:{…} }`. **404 for draft/archived/unknown** (never reveals a non-published article). `authorName`/`metaDescription`/`seo.*` are nullable. |

### Admin `admin/blog` (content_creator/learning_admin for read+create+update; learning_admin only for publish/unpublish/delete)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/blog` | list all statuses (`BlogAdminItemDto`) |
| GET | `/admin/blog/:id` | **bare** `BlogAdminDetailDto` (adds `contentHtml` + raw `translations`, snake_case inner keys `content_html`/`meta_description`) |
| POST | `/admin/blog` | create (English fields + slug) |
| PATCH | `/admin/blog/:id` | update English fields + slug |
| PATCH | `/admin/blog/:id/translations` | per-locale, replace-merge idiom |
| POST | `/admin/blog/:id/publish` \| `/unpublish` | learning_admin |
| DELETE | `/admin/blog/:id` | learning_admin — **soft-delete → archived**, label it "Archive" not "Delete" |

Slug is locked once published. Translation editor authors `tr/fr/es/ar/de`
(English is canonical, auto-mirrored to `translations.en` server-side); app
UI itself stays en/fr/ar.

## Contact — public `@Controller('contact')`, admin `@Controller('admin/contact')`

Shipped `2976be0` → `7160f11` (resolves BE-I-26). Admin inbox is **built &
staged** (kept through the CMS rollback — independent of CMS).

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/contact` | `@Public()`, throttled (default 3/60s via `CONTACT_THROTTLE_LIMIT`/`_TTL`) | `{ name(≤120), email(≤255), subject?(≤160), message(≤5000), pageSlug?(≤255), company?(honeypot — leave empty) }` → **201** `{ data }`. Honeypot silently drops the submission. **Any 201 = success** (mail failure never fails the request); 400 validation; 429 over-rate. |
| GET | `/admin/contact` | support_admin, learning_admin | `?status=&cursor=&limit=` — cursor page, same shape as blog/cms admin lists |
| GET | `/admin/contact/:id` | support_admin, learning_admin | `{ data }` detail incl. message body + IP/user-agent capture |
| PATCH | `/admin/contact/:id` | support_admin, learning_admin | `{ status }` — `new`\|`read`\|`archived`\|`spam` (`new` is server-initial, not a manual target) |
| DELETE | `/admin/contact/:id` | learning_admin | **hard delete** (GDPR erasure — no soft-delete here) → `{ id, deleted:true }` |

**Triage model shipped in the admin inbox:** `new → read → archived`, with
`spam` as a side branch that keeps the row (flag what the honeypot missed,
without deleting it). Opening a message does **not** auto-mark it read
(explicit action only — several admins triage one inbox). Delete confirmation
names it as irreversible GDPR erasure (every other admin list soft-deletes;
this one is a deliberate hard delete). `ipHash` shown only in a collapsed
"technical details" block — raw IP is never stored (backend keeps sha256
only). Store clears on `user.logged-out` (PII in memory).
