# Current Status

> Last updated: 2026-08-03, against frontend HEAD `de7539c` and backend HEAD
> `7160f11`.

## Repo / branch

Frontend project: `institute of scrum/` (Angular 21). Backend (**READ-ONLY,
never modify**): `IOS_Backend/` (NestJS). All work is on git branch
**`feat/real-backend-integration`**. The deployed API is the source of data —
**never run the backend locally**. Dev API:
`https://api-dev.instituteofscrum.org/api/v1` (already set in `environment*.ts`).

Read `CLAUDE.md` for frontend engineering rules (standalone components,
signals, OnPush, new control-flow, no `any`, no Observables in components,
`ios-` selector prefix, logical CSS). Read
[`../reference/conventions/frontend-data-access-patterns.md`](../reference/conventions/frontend-data-access-patterns.md)
before building or reviewing any feature.

## Overall project status

- **Phase 1** (backend study) — ✅ Complete → [`../reference/backend/`](../reference/backend/).
- **Phase 2** (frontend infra: real auth, interceptors, models) — ✅ Complete.
- **Phase 3** (Admin application, all pages) — ✅ Complete.
- **Phase 4** (user-facing app ↔ real backend) — ✅ Planned scope complete (2026-07-25), including the four net-new student/auth features (real exam, courses, mock, email verify) and C1 admin OTP. Two reviews still outstanding (see [`known-issues.md`](./known-issues.md)).
- **Stage 2 — CMS surface + landing rewire** — ⬜ Not started as a whole. Slice 1 (landing regression) is done. Slices 2–11 (public renderer, admin editor) are **not built** — see [`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md). The CMS admin editor was built once (2026-07-29) and **rolled back**; only the `/admin/contact` inbox survived (built & staged, not yet committed by the user).

## What's in flight right now (uncommitted / awaiting review, as of 2026-08-03)

- **Removed "Or continue with" social login section** (known-issues.md gap)
  — 🔵 built, uncommitted, at the user's explicit direction. Removed the
  divider + `ios-social-button` row from both `login.page.ts` and
  `register.page.ts` (`SocialButton`/`SocialProvider` imports, the `socials`
  field, `onSocialLogin`/`onSocialSelect` no-op handlers). The
  `ui/social-button/` component itself is untouched, just unused now; the
  `common.orContinueWith` i18n key is left in place (orphaned, harmless) in
  case OAuth returns later. typecheck/lint clean, build bundle generation
  clean. Not runtime-tested against api-dev.
- **Landing page dead certification links** (known-issues.md gap) — 🔵 built,
  uncommitted. `market-stats-section.ts#certTableRows`'s 4 wrong slugs
  (`psm`/`asm`/`ppo`/`apo`) now point to the real routes
  (`esm-p`/`esm-a`/`epo-p`/`epo-a`). `psf`/`asf` turned out not to be dead
  links on inspection — that row already renders as plain "coming soon" text,
  not an anchor. typecheck/lint clean, build bundle generation clean. Not
  runtime-tested against api-dev.
- **`/certifications` page — one shared cert array** — 🔵 built, uncommitted.
  `all-certifications.page.ts` used to hardcode the same 7 certifications
  twice: once per `ios-certification-card` in the 3 track sections, once more
  in a separate `compCerts` array for the comparison table. Replaced both
  with a single `certDefs: readonly CertDef[]` (code, track, level, svg,
  i18n name key, card theme colors, comparison badge color, prerequisite) —
  track sections now `@for` over `smCerts`/`poCerts`/`sfCerts` (filtered from
  `certDefs`), and the comparison table `@for`s over `certDefs` directly.
  Visual output unchanged (Scrum Master track's theme colors, previously
  implicit via `ios-certification-card` defaults, are now explicit in
  `certDefs` — verified they match the component's own `input()` defaults).
  typecheck/lint clean, build bundle generation clean. Not runtime-tested
  against api-dev.
- **Duplicate-`class`-attribute bug, fixed codebase-wide** — 🔵 built,
  uncommitted. Found while investigating a user-reported styling bug
  (`ios-landing-contact-section`'s submit button and the `/certifications`
  FAQ questions rendering with no padding/margin). Root cause: several landing
  templates had two static `class="..."` attributes on one element (e.g.
  `class="w-full flex ... px-8 py-4 rounded-2xl ..." class="bg-cer-brown-dark
  text-cer-brown-soft"`). Angular does **not** merge these — each becomes a
  separate `setAttribute` call at element creation, so the **second** one
  silently wins and every class from the first is dropped. Merged all
  instances into single `class` strings across: `components/contact-section.ts`
  (submit button — was losing all padding/layout, kept only bg/text color),
  `pages/all-certifications.page.ts` (FAQ button + chevron icon, both floating
  stat cards in the "What is this?" section — was losing `absolute`
  positioning entirely, comparison-table badge pill),
  `pages/about-scrum-master.page.ts`, `pages/about-scrum-facilitator.page.ts`,
  `pages/about-product-owner.page.ts` (badge-trio underline, cert-path badge
  pill, "?" icon + heading in the info box, "Explore other Certifications"
  link — 5 instances each, same pattern in every track page), and the two
  shared components used across all 7 cert-detail pages:
  `components/cert-page-hero.ts` (breadcrumb + `h1` text color) and
  `components/cert-faq-cta.ts` (badge pill, description text color).
  `grep`-verified zero remaining duplicate-`class` elements in `src/`.
  typecheck/lint clean, build bundle generation clean. Not runtime-tested
  against api-dev.

Otherwise nothing in flight — the three items below (SEO json-ld,
learning-hub dedup, BE-I-30 landing repoint + exam review) were committed by
Adam directly on `feat/real-backend-integration`; verified against HEAD
`de7539c` on 2026-08-03 (typecheck clean, lint clean aside from the 3
known-benign `prefer-ngsrc` warnings, build bundle generation clean).

## Recently committed

- **SEO — render `seo.jsonLd`** (blog article + catalog certificate pages) — ✅ committed `d7aa702`. Closes backlog items 13a/13b. New `core/seo/json-ld.service.ts` owns a single `<script type="application/ld+json">` tag. Blog: wired via `insights.mappers.ts`/`insight-detail.page.ts`. Catalog: SEO-only `GET /catalog/:id` fetch added to `cert-details-template.ts` — page **content stays static** per user decision; `metaTitle`/`metaDescription` are fetched but not applied (no `Title`/`Meta` service precedent in the app — flagged, not assumed). Not runtime-tested against api-dev.
- **Learning hub de-duplication** (`/dashboard/certificates` rewired to real data, `/courses` deleted) — ✅ committed `335b621` + `f9d9cfa`. Corrects a mistake where `172f35a` built a second `features/courses` hub duplicating the already-designed `/dashboard/certificates` hub. `cert-session.page`, `cert-detail.page`, `certificates.page` now read real `/learning/*` data; `certificates.store.ts` fixture code stripped from 872→493 lines (mock-test fixtures and two `ESM_P_DETAIL_*` snapshots deliberately kept — still consumed, no real source yet, but Overview and Mock-test sections have since been rebuilt on real data too, so this store is nearly empty of fixtures). `/courses` route and pages deleted; `courses/data-access/*` kept (it's the real wiring layer). Not runtime-tested against api-dev.
- **BE-I-30 landing repoint + real-exam answer review** — ✅ committed `991c539`. `LandingApi` repointed off the deleted `GET /landing` to `GET /analytics/public-stats` (wrapped in `stats`) + the shared `PublicCatalogStore` for featured programs; no CMS work involved. New `ios-exam-review-page` at `/assessments/review/:attemptId` consumes the now-fixed `GET /exam/attempts/:attemptId/review` (BE-I-22) — reached from exam history, **not** the result page (see BE-I-32 in [`known-issues.md`](./known-issues.md)). Not runtime-tested against api-dev.
- **Admin follow-ups** — catalog image picker (BE-I-27 narrowed) + exam student preview (`GET /admin/exams/:examId/preview`) — ✅ committed `ad30b66`.
- **Admin contact inbox** (`/admin/contact`, BE-I-26) — 🟢 built & staged, awaiting review (kept from the rolled-back CMS session — independent of CMS).
- **Student dashboard overview → real data** (`DashboardStore` retired) — ✅ committed `4a11ae9`.
- **CMS-ADMIN build** — ⛔ built then rolled back 2026-07-29 at the user's direction before review. `src/` has **no** reference to `/cms`, `AdminCms*`, or `CmsSection*`. See [`../archive/cms-rollback-2026-07-29.md`](../archive/cms-rollback-2026-07-29.md) for what to reuse when rebuilding.

For everything committed before that, see [`../archive/changelog.md`](../archive/changelog.md).

## Immediate next actions

Per the plan-of-record (updated 2026-07-27, still current):

1. **Stage 2 — CMS**, per [`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md): Slices 2–8 (public renderer → home cutover), then 9–10 (admin editor + contact inbox — reuse the rolled-back-session findings), then 11 (hardening).
2. **Blog E2E re-test** (BE-I-21 fixed by backend `30bfff5`) — ⏸ still needs a **live** run (create → edit → translations → publish → public-read against api-dev); blocked on test credentials, not available in-session. Code-reviewed 2026-08-03 instead: `admin/blog.api.ts`'s `create`/`publish`/`translations` calls match the fixed contract (`BE-I-21` resolution notes: response now built from the entity already in hand, no read-after-write race); no FE code change needed, confirmed still true on current HEAD.
3. **`/dashboard/certificates` legacy fixture cleanup** — ✅ verified 2026-08-03: no `ESM_P_*` fixture data remains in `certificates.store.ts` (only historical doc-comments referencing the old names); the three sourceless Overview tiles (average mock score, total learning time, trend delta) are fully removed from `cert-detail.page.ts`, not stubbed. Nothing further to do here.
4. **`complete-account` wizard** — still a stub, confirmed 2026-08-03: `onSubmit()` just navigates to `/dashboard`, no API call wired. Still correctly blocked by **BE-I-25** (no DOB field) — see [`known-issues.md`](./known-issues.md). Not worked around.

## Working rules for new work

- **Never modify `IOS_Backend/`.** Document backend problems in
  [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md); don't fix them.
- **Build one page/slice at a time**, verify (`npm run typecheck && npm run lint && npm run build`, all from `institute of scrum/`), update this file, **stop for review**. **Never commit without the user's explicit "commit."**
- `npx ng build --configuration production` is needed to check prod bundles/budgets — `package.json`'s `build` script defaults to the **development** configuration.
- i18n lives in `src/app/assets/i18n/{en,fr,ar}.json`. Add keys to all three; **Arabic strings still need professional review** across every shipped screen (CLAUDE.md §9) — this is the largest standing cross-cutting debt.
- **Testing** remains deferred per SOW §6.2.14 — nothing is runtime-tested against api-dev; live verification needs real student/admin credentials not available in-session.
