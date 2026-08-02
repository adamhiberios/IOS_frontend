# Current Status

> Last updated: 2026-08-03, against frontend HEAD `4f9e267` and backend HEAD
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

1. **SEO — render `seo.jsonLd`** (blog article + catalog certificate pages) — ✅ built, awaiting review, uncommitted. Closes backlog items 13a/13b. New `core/seo/json-ld.service.ts` owns a single `<script type="application/ld+json">` tag. Blog: wired via `insights.mappers.ts`/`insight-detail.page.ts`. Catalog: SEO-only `GET /catalog/:id` fetch added to `cert-details-template.ts` — page **content stays static** per user decision; `metaTitle`/`metaDescription` are fetched but not applied (no `Title`/`Meta` service precedent in the app — flagged, not assumed). Not runtime-tested against api-dev.
2. **Learning hub de-duplication** (`/dashboard/certificates` rewired to real data, `/courses` deleted) — 🔵 in progress, uncommitted. Corrects a mistake where `172f35a` built a second `features/courses` hub duplicating the already-designed `/dashboard/certificates` hub. `cert-session.page`, `cert-detail.page`, `certificates.page` now read real `/learning/*` data; `certificates.store.ts` fixture code stripped from 872→493 lines (mock-test fixtures and two `ESM_P_DETAIL_*` snapshots deliberately kept — still consumed, no real source yet, but Overview and Mock-test sections have since been rebuilt on real data too, so this store is nearly empty of fixtures). `/courses` route and pages deleted; `courses/data-access/*` kept (it's the real wiring layer). Not runtime-tested against api-dev.
3. **BE-I-30 landing repoint + real-exam answer review** — 🔵 built, awaiting review, uncommitted. `LandingApi` repointed off the deleted `GET /landing` to `GET /analytics/public-stats` (wrapped in `stats`) + the shared `PublicCatalogStore` for featured programs; no CMS work involved. New `ios-exam-review-page` at `/assessments/review/:attemptId` consumes the now-fixed `GET /exam/attempts/:attemptId/review` (BE-I-22) — reached from exam history, **not** the result page (see BE-I-32 in [`known-issues.md`](./known-issues.md)).

## Recently committed

- **Admin follow-ups** — catalog image picker (BE-I-27 narrowed) + exam student preview (`GET /admin/exams/:examId/preview`) — ✅ committed `ad30b66`.
- **Admin contact inbox** (`/admin/contact`, BE-I-26) — 🟢 built & staged, awaiting review (kept from the rolled-back CMS session — independent of CMS).
- **Student dashboard overview → real data** (`DashboardStore` retired) — ✅ committed `4a11ae9`.
- **CMS-ADMIN build** — ⛔ built then rolled back 2026-07-29 at the user's direction before review. `src/` has **no** reference to `/cms`, `AdminCms*`, or `CmsSection*`. See [`../archive/cms-rollback-2026-07-29.md`](../archive/cms-rollback-2026-07-29.md) for what to reuse when rebuilding.

For everything committed before that, see [`../archive/changelog.md`](../archive/changelog.md).

## Immediate next actions

Per the plan-of-record (updated 2026-07-27, still current):

1. **Stage 2 — CMS**, per [`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md): Slices 2–8 (public renderer → home cutover), then 9–10 (admin editor + contact inbox — reuse the rolled-back-session findings), then 11 (hardening).
2. **Blog E2E re-test** (BE-I-21 fixed by backend `30bfff5`) — create → edit → translations → publish → public-read against api-dev. No FE code change expected.
3. **`/dashboard/certificates` legacy fixture cleanup** — once the in-flight rewire (above) lands, verify no `ESM_P_*` fixtures remain and settle the Overview tiles that have no backend source (average mock score, total learning time, trend delta — currently removed rather than re-sourced).
4. **`complete-account` wizard** — still a stub. Blocked by **BE-I-25** (no DOB field) — see [`known-issues.md`](./known-issues.md).

## Working rules for new work

- **Never modify `IOS_Backend/`.** Document backend problems in
  [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md); don't fix them.
- **Build one page/slice at a time**, verify (`npm run typecheck && npm run lint && npm run build`, all from `institute of scrum/`), update this file, **stop for review**. **Never commit without the user's explicit "commit."**
- `npx ng build --configuration production` is needed to check prod bundles/budgets — `package.json`'s `build` script defaults to the **development** configuration.
- i18n lives in `src/app/assets/i18n/{en,fr,ar}.json`. Add keys to all three; **Arabic strings still need professional review** across every shipped screen (CLAUDE.md §9) — this is the largest standing cross-cutting debt.
- **Testing** remains deferred per SOW §6.2.14 — nothing is runtime-tested against api-dev; live verification needs real student/admin credentials not available in-session.
