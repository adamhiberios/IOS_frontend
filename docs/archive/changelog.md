# Changelog — Committed Work

> Condensed chronological log of every committed slice of frontend work, with
> commit SHAs. This is a compressed changelog, not the verbatim task log —
> repeated status updates and superseded framing have been collapsed. For
> current state see [`../status/current-status.md`](../status/current-status.md).
> For per-admin-page build detail see
> [`admin-pages-build-log.md`](./admin-pages-build-log.md).

## Phase 1–2 — Backend analysis + real auth infra

- Full backend source analysis (17 controllers / 64 routes / 24 entities /
  auth / RBAC / RLS / WS / errors / i18n) → `docs/reference/backend/`.
- **Legacy mock backend removed, real `/auth/*` API wired** (`e2f7029`): new
  `core/auth/auth.api.ts` (cookie-based refresh via `withCredentials`),
  rewrote `auth.store.ts`, aligned roles to the real backend
  (`student` + 5 `AdminRole`s), deleted `mock-auth.backend.ts` /
  `mock-api.interceptor.ts` / `mock-api.service.ts`.
- Auth routes mapped to real endpoints: login, register (no auto-login),
  forgot-password, new-password (reads `?token=`). New
  `core/http/problem-details.ts` (`problemDetailMessage`/`problemDetailCode`).

## Phase 3 — Admin app (all 12 pages, B1–B8 + core pages)

Admin shell, login, guards built first (`AuthStore.loginAdmin()`,
`adminAuthGuard`/`adminLoginGuard`, `admin-layout.ts`). Then, in build order:
catalog list (`60a072c`) → catalog create/edit/deactivate (`9499fec`) →
users list + student detail (`f1f5013`) → student attempts/access-codes +
active-first sort (`af4e917`) → audit logs (`a9e002d`) → mock questions
(`de8aff8`) → exam assignment (`8877dcd`) → exam authoring list/lifecycle
(`bf1a620`) → exam question editor (`5e11e34`) → exam title translations
(`6fa0bd6`) → catalog translations (`50fc688`) → catalog card fields / B8
(`9b18571`) → exam publish `reasons[]` / B7 (`0db202e`) → lesson-quiz
authoring / B5 (`0d95e6e`, restyle `d1ce3e8`) → promo codes / B4 (`3ea7e28`)
→ admin staff / B3 (`6f09077`) → certificate revocation / B2 (`451af2a`) →
curriculum management / B1 (`7268d26`) → admin dashboard analytics / B6
(`9559ec1`). Full detail per page:
[`admin-pages-build-log.md`](./admin-pages-build-log.md).

## Phase 4 — User-facing app ↔ real backend

**A-items:**
- **Profile** (`f23902e`) — real `/me` data-access, replaced mock store.
- **A1 avatar upload** (`242a11d`) — presigned URL flow, bare `HttpBackend` client for the storage PUT.
- **A3 earned certificates** (`3bed4c1`) — new `features/credentials` at `/dashboard/credentials`.
- **A4 notifications** (`99917c8`) — real feed + navbar unread badge (`core/notifications`).
- **A5 insights** (`0272e27`) — student analytics folded into Dashboard overview only (no standalone page).
- **A6 landing rewire** (`469f429`) — original `GET /landing` wiring (later superseded by BE-I-30 fix, see below).
- **A7 dashboard real-exam history** (`554fbe6`) — `ios-exam-history` component, `GET /exam/attempts`.
- **A2 delete account + data export** (`c659335`) — step-up re-auth delete, GDPR export download.
- **C2 cookie consent** (`6fddf8e`) — `core/consent/`, banner root-mounted, `POST /consent`.
- **Catalog data-access** (`f5954e0`) — public catalog transport layer; marketing-page component overlay deferred/reverted at reviewer's request.
- **Payments data-access** (`468b457`) — logic-only, no page consumes it (still true — see `features/payments` in cross-cutting-findings).
- **Landing navbar auth-aware CTAs** (with `f5954e0`) — hides Login/Register when signed in.

**Blog:**
- **BLOG-PUBLIC rewire** (`1940501`) — `features/insights` off static fallback onto `GET /blog` + `/blog/:slug`.
- **BLOG-ADMIN** (`5404e77`) — new `/admin/blog` page; follow-up refinements added slug kebab-case validation and a Quill-based `ios-rich-text` editor primitive (`ui/rich-text/`).

**Real-exam engine** (`b951242`, 5 slices — REST data-access → IndexedDB drafts
→ `ExamSessionStore` → `ExamSessionWs` Socket.IO → UI rewire + entry pages +
boot sweep). Filed BE-I-22/23/24. Full detail:
[`../reference/pages/assessments-real-exam.md`](../reference/pages/assessments-real-exam.md).
Architect review still pending.

**Learning / courses** (`172f35a`, 2 slices — data-access then pages).
Corrected later by the learning-hub dedup (see
[`../status/current-status.md`](../status/current-status.md)) — the
`/courses` pages this slice added were deleted once the real
`/dashboard/certificates` hub was rewired to consume the same data-access
layer instead.

**Mock-exam runner** (`37b5c57` data-access, `f4752ad` UI rewire, `6d9e406`
history page, `904a478` `/mock` Socket.IO timer). See
[`../reference/pages/certificates-mock-exam.md`](../reference/pages/certificates-mock-exam.md).

**C1 — Admin OTP login** (`ae6ae44`, `core/auth`) — two-step OTP + admin-aware
logout. **Security review still required** before shipping. Refresh routing
kept on the shared `/auth/refresh` (flagged for the review to confirm).

**Email verification** (`9e06730`) — `/auth/verify-email` page + resend flow.
`complete-account` wizard remains a stub (BE-I-25).

**BE-I-29 fix** (`1c2fcdb`, 2026-07-26) — admin lesson form now always sends
`contentText`. Same commit also closed backlog items "admin dashboard
date window" and "admin student detail enrichment" (additive fields mapped).

**Student dashboard overview → real data** (`4a11ae9`, 2026-07-26) —
`DashboardStore` retired as a fixture store; became a pure aggregator over
`CoursesStore`/`PublicCatalogStore`/`MockStore`. Full detail:
[`../reference/pages/dashboard.md`](../reference/pages/dashboard.md).

**Exam-authoring preview** (2026-07-29) — replaced the client-side faux
preview (correct-answer ticks hidden but `#position`/`marks` still shown,
misleadingly close to but not the real student paper) with the real
`GET /admin/exams/:examId/preview` endpoint.

**Catalog image picker** (2026-07-29) — presigned upload for certificate
images, reusing the A1 avatar pattern; `requiredHeaders` echoed in full
(including `x-amz-acl: public-read`); picker hidden on the create form since
the endpoint needs an existing certificate id.

**CMS-ADMIN build + rollback** (2026-07-29) — Slices 9–10 built, verified
green, then rolled back at the user's direction before review. See
[`cms-rollback-2026-07-29.md`](./cms-rollback-2026-07-29.md).

**Admin contact inbox** (2026-07-29) — kept through the CMS rollback
(independent API). 🟢 Built & staged, not yet committed by the user.

**Real-exam answer review UI + BE-I-30 landing repoint** (2026-08-01) —
`ios-exam-review-page` at `/assessments/review/:attemptId`, linked from exam
history (not the result page — BE-I-32). `LandingApi` repointed off the
deleted `GET /landing` to `GET /analytics/public-stats` + the shared
`PublicCatalogStore`. Both 🔵 built, awaiting review, uncommitted as of this
writing.

**SEO — `seo.jsonLd` rendering** (2026-08-03) — new `core/seo/json-ld.service.ts`;
wired on blog detail and (SEO-only, content stays static) the seven catalog
certificate marketing pages. 🔵 Built, awaiting review, uncommitted.

**Learning hub de-duplication** (2026-08-0x, in progress) — see
[`../status/current-status.md`](../status/current-status.md) for the
in-flight detail; not yet committed.

## Reviews outstanding

- **C1 security review** (`core/auth`, `ae6ae44`).
- **Real-exam engine architect review** (`b951242`).

See [`../status/known-issues.md`](../status/known-issues.md) for what these
reviews need to check.
