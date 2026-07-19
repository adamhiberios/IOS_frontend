# Implementation Progress — IOS LMS Frontend ↔ Real Backend

> **Single source of truth for implementation progress.** Updated continuously.
> Last updated: 2026-07-16.

---

## Overall project status

**Phase 3 (Admin application) — COMPLETE** for every backend surface that existed
at the time. **Phase 4 (user-facing app ↔ real backend) — in progress.** Backend
fully analysed (Phase 1, see [`backend-analysis.md`](./backend-analysis.md)); auth
wired (Phase 2).

> **2026-07-13 — the backend team resolved every blocker** from
> [`backend-blockers-report.md`](./backend-blockers-report.md). All previously-⛔
> user features (Certificates, Notifications, Insights) and the two blocked admin
> pages (Curriculum, Cert revocation) are now buildable, plus new admin pages and
> a two-step admin OTP login. The concrete, endpoint-level task list is in
> **[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md)** — the
> primary "what to build next" reference; this file tracks progress.

## Current phase

**Phase 4 — Wire the user-facing app to the real backend.** All Phase-3 (admin)
work is **committed** on `feat/real-backend-integration` (see "Admin pages
status" below for the per-page commit map). The user-facing screens (landing,
dashboard, courses, assessments, catalog, profile, certificates, notifications,
insights, settings) still target the removed mock endpoints or placeholder data
— they build/lint but 404 at runtime. Phase 4 wires them page-by-page using the
established data-access layering, in the order below. **See the
[Phase 4 plan](#phase-4-plan--user-facing-app-backend-integration) — start
there.**

## Phases at a glance

| Phase | Description                                                             | Status                               |
| ----- | ----------------------------------------------------------------------- | ------------------------------------ |
| 1     | Study backend → `backend-analysis.md`                                   | ✅ Complete                          |
| 2     | Frontend infrastructure (remove mocks, real auth, interceptors, models) | ✅ Complete (auth + HTTP core)       |
| 3     | Admin application, page by page                                         | ✅ Complete (all unblocked surfaces) |
| 4     | **User-facing app ↔ real backend, page by page**                        | 🚧 In progress (blockers cleared)    |

---

## Phase 4 plan — user-facing app backend integration

**Goal:** wire every user-facing screen to the real backend, page-by-page, using
the **same data-access layering** proven in the admin app
(`data-access/<feat>.{dto,model,mappers,api,store}.ts`, signals, cursor
pagination helpers, RFC-7807 error surfacing). Same workflow: **build one page →
`typecheck`+`lint`+`build` clean → update this file → stop for review; commit
only on "commit".**

**Current state of these features:** they were scaffolded against the removed
mock backend and now target non-existent endpoints (`/landing`, `/insights`) or
placeholder/simulated data — they compile but 404 at runtime. Wiring = replace
the placeholder with a real `data-access` layer against the endpoints below.

### Feature → backend map (what to wire, in build order)

| Order | Feature (route)                                | Screens / purpose                               | Backend endpoints (all under `/api/v1`)                                                                                                               | Status                                                    |
| ----- | ---------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **1** | **Profile** (`/profile`)                       | View + edit profile; change password            | `GET /me`, `PATCH /me`, `PATCH /me/password`                                                                                                          | ✅ built (review pending)                                 |
| **1** | **Settings** (`/settings`)                     | Password, language, delete account, data export | `PATCH /me/password` ✅; `POST /me/delete` `{password}` + `GET /me/export` (BE-I-19 ✅)                                                               | ⚠️ partial → now unblocked                                |
| **2** | **Catalog** (`/certifications` + detail)       | Browse certs, cert detail, curriculum outline   | `GET /catalog`, `GET /catalog/:id`, `GET /catalog/:id/outline` (public); Landing "featured" → `GET /landing`                                          | 🚧 data-access built (logic)                              |
| **3** | **Payments / enroll**                          | Checkout (enroll), retake, transaction history  | `POST /payments/checkout`, `POST /payments/retake`, `GET /payments/transactions`                                                                      | 🚧 data-access built (logic)                              |
| **4** | **Dashboard** (`/dashboard`)                   | Enrolled courses + progress, recent activity    | `GET /learning/progress`, `GET /payments/transactions`, `GET /me`, **`GET /insights`** (student aggregates), **`GET /exam/attempts`** (BE-I-07/17 ✅) | ⚠️ compose (+ real analytics)                             |
| **5** | **Courses / Learning** (`/courses`)            | Curriculum tree, lesson viewer, quiz, complete  | `GET /learning/certs/:id/curriculum`, `GET /learning/lessons/:id`, `GET /learning/lessons/:id/quiz`, `POST …/quiz/check`, `POST …/complete`           | ✅ ready (enrollment-gated)                               |
| **6** | **Assessments — real exam** (`/assessments`)   | Access-code entry → exam session → submit       | `POST /exam/{pre-exam-confirmation,validate-access,start}`, `GET/POST /exam/sessions/:id/*`, **`/exam` WebSocket** (heartbeat/timer)                  | ✅ ready — high complexity                                |
| **6** | **Mock exam**                                  | Practice attempts, history, review              | `POST /mock/start`, `GET /mock/history`, `GET /mock/attempts/:id`, `GET /mock/:id`, `POST /mock/:id/{autosave,extend,submit,…}`, **`/mock` WS**       | ✅ ready                                                  |
| **7** | **Certificates** (`/dashboard/credentials`)    | List earned certs; verify                       | `GET /me/certificates` (BE-I-16 ✅) + public `GET /verify/:certId`                                                                                    | ✅ built — A3 (`features/credentials`)                    |
| **7** | **Notifications** (`/dashboard/notifications`) | In-app notifications + unread badge             | `GET /notifications`, `/unread-count`, `POST /:id/read`, `/read-all` (BE-I-18 ✅)                                                                     | ✅ built — A4 (+ core badge)                              |
| **7** | **Insights** (Overview only)                   | Student learning/exam analytics                 | `GET /insights` (BE-I-20a ✅)                                                                                                                         | ✅ built — A5 (dashboard data-access, no standalone page) |

### Build order & rationale

1. **Profile + Settings** — smallest, foundational; `/me` endpoints. Avatar
   upload **is now possible** (BE-I-08 fixed): `POST /me/avatar-upload-url` →
   presigned PUT → `PATCH /me` (checklist A1). Settings gains delete-account +
   data export (A2).
2. **Catalog browse/detail + Landing** — public, simple; the funnel entry. Reuse
   the admin `catalog.dto`/mappers where shapes overlap (public response adds
   `locale`/`direction`/`fallbackUsed`). Landing dynamic uses **`GET /landing`**
   (`featuredPrograms + stats`), not the old `/catalog` improvisation (A6).
3. **Payments / enroll** — depends on catalog. **Do not collect card data in-app**
   (prohibited): `POST /payments/checkout` returns a Stripe URL to redirect to
   (or enrols immediately when the price is $0). Show `GET /payments/transactions`
   for history.
4. **Dashboard** — **real analytics now exists**: fold in `GET /insights`
   (student aggregates) and `GET /exam/attempts` (real-exam history) alongside
   `GET /learning/progress` + `GET /payments/transactions` + `GET /me` (A7).
5. **Courses / Learning** — curriculum tree + lesson viewer + inline quiz
   (`quiz/check` persists nothing) + `POST …/complete` (idempotent). Lesson video
   URL is signed with a short TTL (`meta.videoUrlExpiresInSeconds`).
6. **Assessments (real exam) + Mock exam** — **largest, highest-stakes**; do
   last. Follow the exam-engine discipline in `CLAUDE.md §10` / `docs/08`
   (30 s heartbeat, `serverTick()` timer, IndexedDB answer drafts, idempotent
   `clientSeq`, submit-blocked-until-synced). Two WebSocket namespaces: `/exam`
   and `/mock`.

### Previously blocked — now UNBLOCKED (backend fixes 2026-07-13)

> The backend team resolved every stopper. Details + the endpoint-level task list:
> [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md); status per
> issue: [`backend-blockers-report.md`](./backend-blockers-report.md).

- **Certificates list** (BE-I-16), **Notifications** (BE-I-18), **Insights**
  (BE-I-20) — all now have endpoints; **build them** (checklist A3/A4/A5). No
  longer stubs.
- **Delete account** (BE-I-19), **real-exam attempt history** (BE-I-17),
  **avatar upload** (BE-I-08) — all wireable now (checklist A2/A7/A1).
- **Landing dynamic** — now `GET /landing` (`featuredPrograms + stats`);
  supersedes the "featured via `GET /catalog`" plan (checklist A6).
- **Admin**: Curriculum (BE-I-13) and Certificate revocation (BE-I-15) unblocked;
  new admin pages possible — staff (BE-I-03), promo codes (BE-I-05), lesson-quiz
  authoring (BE-I-06), dashboard metrics (BE-I-07) (checklist B1–B6).
- **Admin login** is now two-step **OTP** (`e97de75`) — a `core/auth` change
  needing security review (checklist C1).

### Cross-cutting reminders for Phase 4

- Keep the four-interceptor HTTP core; send `X-Lang` (locale) and
  `Authorization: Bearer` (already wired). Student endpoints are RLS-scoped
  server-side.
- Lists are cursor/keyset (`@core/http` `pagination.ts`) — reuse `toPage`/
  `toHttpParams`/`Page<T>`.
- Response envelopes are **inconsistent** (BE-I-01): auth/profile/most student
  reads are bare DTOs; lists are `{ data, meta }`. Map per endpoint.
- Every user-visible string → i18n (en/fr/ar); Arabic needs pro review.

---

## For a new session — start here

**Repo / branch.** Frontend project: `institute of scrum/` (Angular 21). Backend
(READ-ONLY, never modify): `IOS_Backend/` (NestJS). All work is on git branch
**`feat/real-backend-integration`** (in the `institute of scrum/` repo). The
deployed API is the source of data — never run the backend locally. Dev API:
`https://api-dev.instituteofscrum.org/api/v1` (already set in `environment*.ts`).

**Read first (in order):** this file (esp. the
[Phase 4 plan](#phase-4-plan--user-facing-app-backend-integration)) →
[`backend-blockers-report.md`](./backend-blockers-report.md) (what's blocked and
why) → [`backend-analysis.md`](./backend-analysis.md) (every endpoint/DTO/role +
Backend Issues Report) → `CLAUDE.md` (frontend rules: standalone components,
signals, OnPush, new control-flow, no `any`, no Observables in components,
`ios-` selector prefix, logical CSS).

**Working rules (from the mission brief):**

- **Never modify `IOS_Backend/`.** Document backend problems in
  `backend-analysis.md` → Backend Issues Report (and surface stoppers in
  `backend-blockers-report.md`); don't fix them.
- **App, page by page (Phase 4 — admin is done).** Build one page, verify,
  **stop for review**. **Never commit without the user's explicit approval** —
  they say "commit". Follow [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md)
  (all backend blockers are now cleared — nothing to skip).
- After each page: update THIS file, then `npm run typecheck && npm run lint &&
npm run build` (all from `institute of scrum/`) must be clean.
- i18n lives in `src/app/assets/i18n/{en,fr,ar}.json`. Add keys to all three;
  Arabic strings added this project still need professional review (CLAUDE.md §9).

**Verify commands** (cwd = `institute of scrum/`):
`npm run typecheck` · `npm run lint` · `npm run build`. Known-benign: 3
pre-existing `prefer-ngsrc` warnings and a raw-size bundle-budget warning
(gzip initial is fine). Live browser testing needs real admin credentials
against the deployed API (not available in-session).

**Established patterns (reuse these — see the committed admin catalog/users):**

- Feature data-access layering: `data-access/<feat>.dto.ts` (wire shapes,
  mirror backend names) → `.model.ts` (frontend types) → `.mappers.ts` →
  `.api.ts` (`@Injectable`, `HttpClient`, `environment.apiBaseUrl`) →
  `.store.ts` (signal store: private writable signals, `.asReadonly()` views,
  action methods; no Observables leak to components).
- Lists use `@core/http` `pagination.ts`: `toPage()`, `toHttpParams()`,
  `Page<T>`, `PagedResponse<T,M>`, `CursorQuery` (backend is cursor/keyset, no
  totals). Pattern: `items/loading/loadingMore/error/nextCursor/hasMore` + a
  `search`/filters; `load()` / `loadMore()`.
- Errors: surface `problemDetailMessage(err)` (`@core/http`) inline; fall back
  to an i18n string. Backend errors are RFC-7807 (`{ detail, title, code }`).
- **Route params:** read from `route.snapshot.paramMap`, NOT a signal
  `input('')` — with `withComponentInputBinding()` an absent optional param is
  `undefined`, not the default (this crashed once). Child-component `[input]`
  bindings from a parent are fine as `input.required<T>()`.
- **RBAC:** hide actions with `auth.hasRole('super_admin') || auth.hasAnyRole([…])`
  (super_admin sees everything); the backend still enforces. Admin nav
  (`components/admin-layout.ts`) is role-filtered — register each new page's
  nav item there.
- **Admin routing** (`features/admin/admin.routes.ts`): `/admin/login` is public
  (`adminLoginGuard`); everything else is under the shell, gated by
  `adminAuthGuard` (unauth → `/admin/login?returnUrl=<absolute>`; non-admin →
  `/forbidden`). Add new pages as children of the `''` (shell) route.
- **Admin lists show active first** (client-side stable sort; backend only sorts
  by `created_at`) — apply to any future list with a status flag.

---

## Completed tasks

- ✅ Full backend source analysis (17 controllers / 64 routes / 24 entities / auth / RBAC / RLS / WS / errors / i18n).
- ✅ `docs/backend-analysis.md` written (incl. Backend Issues Report).
- ✅ `docs/implementation-progress.md` created (this file).
- ✅ **Legacy mock backend removed and real `/auth/*` API wired** (milestone complete):
  - New `core/auth/auth.dto.ts` (real backend response DTOs).
  - New `core/auth/auth.api.ts` (real HTTP auth service; cookie-based refresh via `withCredentials`).
  - Rewrote `core/auth/auth.store.ts` to use `AuthApi` (no in-memory refresh token; register no longer auto-logs-in).
  - Aligned `core/auth/auth.model.ts` + `role.guard.ts` roles to the real backend (`student` + 5 `AdminRole`s).
  - Deleted `mock-auth.backend.ts`, `mock-api.interceptor.ts`, `mock-api.service.ts`; dropped the mock interceptor from `provideAppHttp()`.
  - Removed dead `RegisterUserSeed`; fixed `profile.store` reads of removed fields.
  - Broadened `authInterceptor` public-path regex to cover `/auth/admin/*`.
  - Updated `app.routes.ts` guards; pointed all environments at the deployed dev/prod API.
  - **Verification:** `npm run typecheck` ✓ · `npm run lint` ✓ (0 errors; 3 pre-existing `prefer-ngsrc` warnings, untouched files) · `npm run build` ✓ (pre-existing raw-size budget warning only; gzip initial 91.82 kB).
  - Residual mock references in `src/`: **none**.
  - **Committed** on branch `feat/real-backend-integration` (`e2f7029`).
- ✅ **Auth routes mapped to the real backend** (the existing `features/auth` pages):
  - `/auth/login` → `AuthStore.login` → `POST /auth/login` (already wired) + a
    post-registration "check your email" notice on `?registered=1`.
  - `/auth/register` → `AuthStore.register` → `POST /auth/register` (no auto-login).
  - `/auth/forgot-password` (`reset-password.page`) → `AuthApi.requestPasswordReset`
    → `POST /auth/forgot-password` (was a simulated submit).
  - `/auth/new-password` (`new-password.page`) → `AuthApi.resetPassword` →
    `POST /auth/reset-password`, reading the reset `token` from `?token=` via
    component-input binding (was a simulated submit).
  - Added `AuthApi.resendVerification` (`POST /auth/resend-verification`) for future use.
  - New shared `core/http/problem-details.ts` helper (`problemDetailMessage` /
    `problemDetailCode`) to surface RFC-7807 errors inline; exported from `@core/http`.
  - Added `auth.login.session.registered` i18n key to en/fr/ar.
  - **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓.

## Tasks currently in progress

- **Phase 4 · Profile — built & committed** (`f23902e`). Details below.
- **Phase 4 · Catalog — data-access layer built & committed (logic only).**
  Public catalog data-access layer is done; the reviewer asked to **not** wire it
  into the marketing components yet (logic-only), so the ESM cert-details retrofit
  was reverted. Details + rollout plan below.
- **Landing navbar — auth-aware CTAs** (committed with the catalog data-access).
  `ios-landing-navbar` hides **Login/Register** when the visitor is signed in and
  shows a **Dashboard** link instead (desktop + mobile), via
  `AuthStore.isAuthenticated()`. Added `landing.nav.dashboard` i18n (en/fr/ar).
- **Phase 4 · Payments — data-access layer built (logic only), awaiting review
  (uncommitted).** Public payment flows wired in the data layer; no component
  consumes it yet. Details below.

### Phase 4 · Payments data-access (`features/payments/data-access`) — logic only (uncommitted)

Student payment flows against `@Controller('payments')` (student token; RLS-
scoped). Built as a standalone data-access layer per the "logic only, no
component changes" directive — no page/enroll button is wired yet.

- `payments.dto.ts` — wire shapes: `CreateCheckoutDto`/`CreateRetakeDto`; the
  **discriminated** checkout/retake responses (`free: true` immediate
  enrollment/unlock vs. `free: false` Stripe redirect with `checkoutUrl`/
  `sessionId`); `TransactionItemDto` + `TransactionsResponseDto` (`{ data,
meta.pagination }`).
- `payments.model.ts` — `CheckoutRequest`/`RetakeRequest`; a unified
  `CheckoutResult` (`redirect` | `enrolled` | `unlocked`) the UI acts on;
  `Transaction` + `TRANSACTION_STATUSES`/`isTransactionStatus` (status kept as
  `string` — the backend types it loosely).
- `payments.mappers.ts` — `toCheckoutResult` / `toRetakeResult` (collapse the
  discriminated DTO into `CheckoutResult`), `toTransaction`.
- `payments.api.ts` — `PaymentsApi`: `checkout` (`POST /payments/checkout`),
  `retake` (`POST /payments/retake`), `listTransactions` (`GET
/payments/transactions`, cursor-paged via `toPage`/`toHttpParams`). The client
  never sends an amount — the charge is recomputed server-side.
- `payments.store.ts` — `PaymentsStore`: the **pay action** (`checkout`/`retake`)
  returns the `CheckoutResult` for the caller to act on (the store never
  navigates — redirect is the component's job) with `actionPending`/`actionError`;
  and the **transaction history** list (`load`/`loadMore`, cursor, newest-first,
  same shape as the admin list stores). Clears on `user.logged-out`.
- **i18n:** added `payments.checkoutError` / `payments.transactionsError`
  (en/fr/ar; Arabic pending pro review).
- **Boundary note (for wiring time):** enroll is triggered from the catalog /
  cert-detail pages (landing feature) and transaction history renders on the
  Dashboard — both would import `PaymentsStore`. Per CLAUDE.md §5 features talk
  only through `core/`; whether to route those through a payments page, inject
  the root-provided store directly, or promote it to `core/` is a wiring
  decision to settle when the components are built (deferred).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only). No live consumer yet;
  live check deferred until wired.

### Phase 4 · Catalog retrofit (`/certifications` + `cert-details-*`) — data-access only (uncommitted)

**Scope decision (reviewer):** the user-facing catalog is **static marketing**
(`/certifications` browse + hardcoded `cert-details-*` pages, IOS-branded
slugs like `esm`/`epo`/`esf`). The backend `GET /catalog` is a thin,
UUID-keyed list of _purchasable_ certs (title/description/price/currency/
thumbnail) + an outline-titles endpoint — its demo seed uses Scrum.org codes
(PSM/PSPO/…), and production certs will carry the IOS program codes. Chosen
approach: **retrofit** — overlay the real backend fields the pages actually show
(price, title) onto the existing marketing layout, matched by `programCode`,
keeping the static copy the backend doesn't own and **flagging content gaps**.
Per the reviewer, this increment lands the **data-access layer only**; the
component overlay (the ESM reference retrofit) was reverted and is deferred.

- **`features/landing/data-access/catalog.*`** (new; kept in-feature — no
  cross-feature import of the admin catalog layer):
  - `catalog.dto.ts` — public wire shapes (`CatalogItemDto` incl. `locale`/
    `direction`/`fallbackUsed`; list/detail/outline responses).
  - `catalog.model.ts` — `PublicCertificate`, `CatalogListQuery`, `CourseOutline`
    (module/lesson outline, titles only).
  - `catalog.mappers.ts` — `toPublicCertificate`, `toCourseOutline`, and
    `formatPrice(price, currency, locale)` (Intl currency formatting with a safe
    fallback for unknown codes).
  - `catalog.api.ts` — `PublicCatalogApi`: `list` (`GET /catalog`, cursor-paged,
    reuses `toPage`/`toHttpParams`), `getById`, `getOutline`.
  - `catalog.store.ts` — `PublicCatalogStore`: loads the (small) active catalogue
    once (walks cursor pages, cap 10), indexes by upper-cased `programCode`
    (`byCode()`), exposes `items` for a future browse grid; never throws
    (`error` signal + static fallback on the pages).
- **Component overlay — deferred (reverted).** A reference retrofit of
  `pages/cert-details-esm.page.ts` (overlay `price`/`title` from
  `catalog.byCode('ESM')` with i18n fallback) was built and then **reverted** at
  the reviewer's request (logic-only for now). The intended pattern is recorded
  in the rollout plan below; no marketing component is wired to the catalog yet.
- **i18n:** added top-level `catalog.loadError` (en/fr/ar; Arabic pending pro
  review).
- **Content gaps flagged (stay static — no backend source):** the browse page's
  track grouping + comparison table + FAQ; per-cert audience / key-learning /
  stats / hero imagery / marketing descriptions; `BE-I-04` card fields
  (`track`/`level`/`durationHours`/`syllabusUrl`) aren't in the catalog DTO. The
  `GET /catalog/:id/outline` endpoint is wired in the data-access layer but has
  **no UI home yet** — the current detail design shows "Key Learning" bullets
  (i18n), not a module/lesson curriculum list; surfacing the live outline needs a
  new section (deferred, flag for design).
- **Rollout plan (deferred — component work, needs the go-ahead):** overlay
  `price`/`title` from `catalog.byCode('<CODE>')` (with `certDetails.<code>.*`
  fallback) on each `cert-details-*` page (esm/esm-p/esm-a/epo/epo-p/epo-a/esf);
  retrofit the `all-certifications` browse cards; add a Landing "featured
  certifications" section from `PublicCatalogStore.items`. Pattern: read `byCode`,
  `formatPrice(price, currency, locale)`, fall back to i18n so the page always
  renders even when the backend has no matching cert.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only). The data-access layer
  has no live consumer yet; live check deferred until it's wired.

### Phase 4 · Profile (`/dashboard/profile`) — built, awaiting review (uncommitted)

First user-facing page wired to the real backend. Replaced the mock-seeded
placeholder store with a real data-access layer against the student `/me`
endpoints (bare DTOs, not `{ data }`), reusing the established admin layering.

- **`features/profile/data-access/`** (new layer):
  - `profile.dto.ts` — wire shapes mirroring backend `ProfileResponseDto` /
    `UpdateProfileDto` / `UpdatePasswordDto` / `MessageResponseDto`. `firstName`/
    `lastName`/`email` are absent from the update DTO (LOCKED server-side —
    they appear on issued certificates; `forbidNonWhitelisted` 400s them).
  - `profile.model.ts` — flat `Profile` model (nullable fields stay nullable so
    the UI can render an explicit "Not set"); `UpdateProfilePayload` (editable
    fields only); `ChangePasswordPayload` (`currentPassword` + `newPassword`).
    Replaces the old nested `ProfilePersonal`/`ProfileProfessional` + the
    non-existent `username`/`iosId` mock fields.
  - `profile.mappers.ts` — `toProfile` (1:1) and `toUpdateProfileDto` (blank
    input → explicit `null` so an emptied optional field is cleared server-side).
  - `profile.api.ts` — `ProfileApi`: `getMe` (`GET /me`), `updateMe`
    (`PATCH /me`, returns the updated profile), `changePassword`
    (`PATCH /me/password`).
  - `profile.store.ts` — rewritten to the real API (`firstValueFrom`,
    `problemDetailMessage` errors): `load(force)` / `reload`, `updateProfile`,
    `changePassword`; loading/error + per-action submit-state signals. Clears its
    cache on the `user.logged-out` bus event so the next signed-in user can't
    see the previous user's data (root singleton).
- **Pages wired** (`pages/`):
  - `profile.page.ts` (view) — loading / error+retry / loaded states; renders the
    real fields. The Figma **Username** / **IOS ID** slots have no backend
    equivalent, so they were replaced with real data (**Phone**, **Member since**
    from `createdAt`). Avatar shows the `avatarUrl` image when present, else
    initials. `firstName`/`lastName`/`email` are read-only.
  - `edit-profile.page.ts` — form hydrated from the loaded profile via an
    `effect` (load is async now). Sends only editable fields to `PATCH /me`
    (added an editable **phone**; name/email stay locked/read-only). The
    "Change image profile" button drives the real avatar-upload flow (**A1**,
    see below); name/email stay locked/read-only. Country/city relaxed to
    **optional** (the
    backend does not require them — forcing them blocked saving when a loaded
    field was null); the selects merge the stored value in so an unrelated edit
    never silently drops a free-text value the preset list doesn't contain.
    Inline RFC-7807 submit error.
  - `change-password.page.ts` — wired to `PATCH /me/password`. A wrong current
    password (401) surfaces inline on the old-password field; other failures
    show an inline alert. **A success is treated as a forced logout** — the
    backend revokes all sessions and clears the refresh cookie, so the success
    dialog's "Ok" calls `AuthStore.logout()` and routes to login (dialog copy
    updated to explain the sign-out).
- **i18n:** added `profile.view.{phone,memberSince,notSet,avatarAlt,loadError}`,
  `profile.edit.{phoneLabel,phonePlaceholder,saveError}`,
  `profile.changePassword.{currentPasswordWrong,saveError}`; relabelled
  country/city to "(Optional)"; updated `passwordUpdatedDialog.description`. All
  three locales (en/fr/ar); Arabic still needs pro review (CLAUDE.md §9). Orphaned
  keys (`view.username`, `view.iosId`, `edit.changeImage`, `edit.{country,city}Error`)
  left in place — harmless.
- **Avatars use `NgOptimizedImage`** (`[ngSrc]`, width/height 82) — no new
  `prefer-ngsrc` warnings; the 3 known-benign ones are unchanged (pre-existing
  files).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.24 kB;
  `edit-profile-page` chunk 4.24 kB gzip). Live check needs a real student
  session against the deployed API (no test creds in-session) — deferred.

### Phase 4 · A1 — Profile avatar upload (BE-I-08) — built, awaiting review (uncommitted)

Full page build (data-access + UI) for the presigned avatar-upload flow;
revisits the committed Profile work and clears the BE-I-08 "avatar is plain URL
only" caveat. Endpoint: `POST /me/avatar-upload-url` (bare) → browser `PUT` to
object storage → `PATCH /me { avatarUrl: key }`.

- **`profile.dto.ts`** — `AvatarUploadUrlRequestDto` (`{ contentType }`, one of
  `image/png|image/jpeg|image/webp`) + bare `AvatarUploadUrlResponseDto`
  (`{ uploadUrl, key, expiresInSeconds }`). Updated the `UpdateProfileDto`
  `avatarUrl` note (now set to the storage `key`; backend resolves to a URL on read).
- **`profile.model.ts`** — `AVATAR_CONTENT_TYPES` / `AvatarContentType` /
  `isAvatarContentType`, `AVATAR_MAX_BYTES` (5 MB client guard), `AVATAR_ACCEPT`,
  `AvatarUploadTarget`. Dropped the "no upload endpoint" caveat on `avatarUrl`.
- **`profile.mappers.ts`** — `toAvatarUploadTarget` (1:1).
- **`profile.api.ts`** — three methods: `requestAvatarUploadUrl` (normal client,
  needs bearer + `X-Locale`); `uploadAvatarBytes` — the raw storage `PUT`,
  issued through a **bare `HttpClient` built on `HttpBackend`** so it **bypasses
  the whole interceptor chain** (no `Authorization`/`X-Locale`, no refresh
  cookie) and sends only the exact signed `Content-Type` (`responseType:'text'`
  to avoid a JSON-parse error on the empty storage response); `setAvatar(key)` →
  `PATCH /me { avatarUrl: key }` returning the updated profile.
- **`profile.store.ts`** — `uploadAvatar(file)` action: client-side type/size
  guard → request URL → PUT bytes → `PATCH /me` → adopt the returned profile
  (avatar re-renders). `avatarStatus` (`idle|pending|error`) + `avatarError`
  signals; `resetAvatarStatus()`; cleared on `user.logged-out`.
- **`edit-profile.page.ts`** — restored the **"Change image profile"** button
  (pencil icon) as a real file picker: a `sr-only` `<input type="file"
[accept]="avatarAccept">` driven by the button, `onAvatarSelected` hands the
  file to the store (and clears the input so re-picking the same file re-fires),
  a pending spinner + "Uploading…" label, and an inline `role="alert"` error.
- **i18n:** added `profile.edit.{changeImage,changingImage,avatarTypeError,
avatarSizeError,avatarUploadError}` (en/fr/ar; Arabic pending pro review).
- **Security note:** the object-storage `PUT` is deliberately isolated from the
  API client (bare `HttpBackend`) so no credentials/cookies reach the storage
  host — matches the checklist A1 constraint. This is a normal user-initiated
  file upload, not a credential entry.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.08 kB;
  `edit-profile-page` chunk 4.56 kB gzip). Live check needs a real student
  session + reachable object storage — deferred (no test creds in-session).

### Phase 4 · A3 — Earned certificates list (BE-I-16) — built, awaiting review (uncommitted)

Full page build for the student's earned credentials. Endpoint:
`GET /me/certificates` → **`{ data }`** envelope (no pagination), item
`{ certId (nullable), program, programCode, issuedAt, status:'valid'|'revoked',
certificateUrl, qrUrl, verifyUrl }`.

- **New feature `features/credentials`** (kept separate from the existing
  `features/certificates`, which is the **mock learning hub** at
  `/dashboard/certificates` — enrolled programs / materials / mock-test runner,
  wired later under Courses/Learning). Placement chosen to be non-destructive:
  the earned-credentials list is a distinct, backend-backed page and doesn't
  disturb the still-needed mock feature. **Reviewer decision pending** on whether
  to later fold these together / promote to a primary nav tab.
- **`credentials.{dto,model,mappers,api,store}`** — standard layering:
  - `dto` — `EarnedCertificateDto` (URL fields + `certId` nullable) +
    `EarnedCertificatesResponseDto` (`{ data }`).
  - `model` — `EarnedCertificate`, `EARNED_CERTIFICATE_STATUSES` /
    `isEarnedCertificateStatus`.
  - `mappers` — `toEarnedCertificate` (status guarded: unknown → `revoked`).
  - `api` — `CredentialsApi.list()` → `GET /me/certificates`, unwraps `.data`.
  - `store` — `CredentialsStore` signal store: `items/loading/error/loaded` +
    `isEmpty`, `load(force)`/`reload`; cleared on `user.logged-out` (certs are PII).
- **`pages/credentials.page.ts`** (`/dashboard/credentials`) — loading / error+retry
  / empty / list states; each row shows program, code chip, issue date
  (`DatePipe`), a valid/revoked status badge, and per-row **Download PDF / QR /
  Verify** links (each rendered only when its URL is present; `target=_blank
rel=noopener noreferrer`). Reuses the dashboard navbar + footer shell.
- **Routing/nav:** mounted at `/dashboard/credentials` (dashboard.routes); added a
  **"My credentials"** item to **both** the user-menu dropdown and the primary
  dashboard tab bar (`badge-check` icon), per reviewer request — matching how
  "Certificates" already appears in both. The primary bar is now 5 tabs
  (Overview · My certificates · My credentials · Profile · Settings).
- **No pre-existing verify tool to preserve:** searched — there is no public
  "verify a certificate" page today (the `verify` hits are email/exam-access
  verification), so the public `GET /verify/:certId` link simply lives on each
  row via `verifyUrl`.
- **i18n:** new top-level `credentials.*` namespace + `dashboard.menu.credentials`
  (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.x kB;
  `credentials-page` chunk 2.82 kB gzip). Live check needs a real student session
  with earned certs — deferred (no test creds in-session).

### Phase 4 · A4 — Notifications (BE-I-18) — built, awaiting review (uncommitted)

Full rewrite of `features/notifications` (was mock-driven) against the real
in-app notification API, plus a shell **unread badge**. Endpoints:
`GET /notifications?cursor&limit&unreadOnly` (`{ data, meta.pagination }`),
`GET /notifications/unread-count` (bare `{ count }`), `POST /notifications/:id/read`
(`{ data }`, idempotent), `POST /notifications/read-all` (`{ updated }`).

- **`core/notifications` (new)** — `NotificationBadgeStore` (root singleton):
  holds the unread `count` + `hasUnread`, `refresh()` (fetches
  `/unread-count`), `setCount`/`decrement`, cleared on `user.logged-out`. Lives
  in `core` because the **navbar (a layout) can't import a feature** (eslint
  boundary rule); exported via `@core/notifications`.
- **`features/notifications/data-access`** — rewrote `notification.model.ts`
  (`Notification` now carries backend-**localized** `title`/`body`, `type`,
  `data` params, `read`, `createdAt`; `notificationIcon(type)` cosmetic-icon
  map w/ bell fallback; `notificationLink(data)` deep-link extractor); new
  `notifications.dto.ts`, `notifications.mappers.ts`, `notifications.api.ts`
  (`list` cursor-paged via `toPage`/`toHttpParams`, `markRead`, `markAllRead`),
  and rewrote `notifications.store.ts` (cursor list + `unreadOnly` filter +
  `markRead`/`markAllRead`; syncs the core badge; feature-scoped).
- **`components/notification-card.ts`** — rewritten: renders localized
  title/body as-is, unread dot + bolder title, per-row **Mark as read**, and a
  **View** deep-link when `data` has one; emits `markRead(id)`.
- **`pages/notifications.page.ts`** — rewritten: **All / Unread** filter,
  **Mark all read**, cursor **Load more**, loading skeleton / error+retry /
  empty (filter-aware) states. Replaced the old client-side sort (backend
  orders the feed).
- **Navbar badge** — `dashboard-navbar.ts` injects the core badge store, shows a
  count pill (caps at "9+") on the bell, and `refresh()`es on init. A fresh
  navbar is created per dashboard page, so the count refreshes on every
  dashboard navigation (no WS, per A4).
- **i18n:** new `notifications.*` keys (filter/markRead/markAllRead/view/loadMore/
  retry/errors/emptyUnread) + `dashboard.notifications.labelWithCount` (en/fr/ar;
  Arabic pending pro review). Old `notifications.items.*` + `sort*` keys left as
  harmless orphans.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; `notifications-page`
  chunk 3.73 kB gzip). Live check needs a real student session — deferred.

### Phase 4 · A5 — Student learning insights (BE-I-20a) — built, awaiting review (uncommitted)

Student learning + exam analytics from bare `GET /insights` (student only;
admins 403): `{ enrolledPrograms, completedLessons, inProgressPrograms,
realExam:{attempts,passed,passRate,avgScore,bestScore}, mockExam:{attempts,avgScore},
certificatesEarned }`.

- **Naming collision (like A3/credentials):** the existing `features/insights` is
  the **public blog** (article posts w/ slugs at `/insights`), NOT student
  analytics. Per reviewer direction, there is **no standalone insights page** and
  the aggregates live **on the Dashboard overview only** (not My-Certificates).
  The public blog is left untouched.
- **`features/dashboard/data-access/insights.*`** — single-feature (dashboard-only)
  data-access: `insights.{dto,model,mappers,api,store}`. `StudentInsights` model,
  `toStudentInsights`, `StudentInsightsApi.get()` (bare `GET /insights`),
  `StudentInsightsStore` (root singleton: `load(force)`/`reload`, cleared on
  `user.logged-out`; single fetch reused across navigations, and ready for the A7
  dashboard composition). `formatPassRate()` renders the **0–1 `passRate` fraction
  as a %**.
- **Overview page** (`/dashboard`) — the mock 3-stat row was **replaced** with a
  real insights section: 4 KPI tiles (enrolled / in-progress programs, completed
  lessons, certificates earned) + real-exam and mock-exam stat cards; loading /
  error+retry states. Mock charts + learning card kept (A7 reconciles the rest).
- **No standalone route/nav:** `/dashboard/insights` and its dropdown item were
  **not** added (the earlier standalone `features/learning-insights` page was
  removed). avgScore/bestScore shown as plain numbers (backend units unspecified);
  only `passRate` is %-formatted.
- **Blog collision fix:** the public blog's `InsightsApi.getPosts()` used to call
  `GET /insights` in prod — now the student-analytics endpoint. Changed it to
  always return `null` (static fallback) so blog visitors don't fire a doomed /
  unauthorized request. Flagged inline for a future dedicated blog API.
- **i18n:** new top-level `studentInsights.*` namespace (en/fr/ar; Arabic pending
  pro review). Kept separate from the blog's `insights.*`. (`dashboard.menu.insights`
  keys remain as harmless orphans — no nav item now.)
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only). Live check needs a
  real student session — deferred.

## Auth-route → backend endpoint map

| Frontend route           | Page                    | Backend call                                                                    |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------- |
| `/auth/login`            | `login.page`            | `POST /auth/login`                                                              |
| `/auth/register`         | `register.page`         | `POST /auth/register`                                                           |
| `/auth/forgot-password`  | `reset-password.page`   | `POST /auth/forgot-password`                                                    |
| `/auth/new-password`     | `new-password.page`     | `POST /auth/reset-password`                                                     |
| `/auth/complete-account` | `complete-account.page` | **Not yet wired** — profile wizard; maps to `PATCH /me` after login (deferred). |
| (app boot / 401)         | `AuthStore`             | `POST /auth/refresh` · `POST /auth/logout`                                      |

## Remaining tasks (high level)

- Real API service per feature (`data-access/*.api.ts`) mapped to backend DTOs:
  catalog, learning, exam (+`/exam` WS), mock (+`/mock` WS), payments,
  certificates, profile, admin (users, audit, authoring).
- Cursor-pagination helper for `{ data, meta.pagination }` responses.
- Typed models/DTOs generated from the backend (interfaces; no `any`).
- Rewire the existing user-facing stores (landing, dashboard, insights,
  notifications, profile, certificates) that currently target non-existent mock
  endpoints — **or** scope them out per the backend Issues Report.
- **Phase 3 — Admin panel, page by page** (Login first), stopping for review
  after each page.

---

## Backend analysis status

✅ **Complete.** See [`backend-analysis.md`](./backend-analysis.md). Derived
exclusively from backend source (Swagger ignored). Backend is READ-ONLY and was
not modified.

## Frontend infrastructure status

🚧 **In progress.**

- HTTP core (interceptors auth → locale → retry → error) real-backend-ready.
  **Mock interceptor removed.**
- Auth core **fully wired to the real `/auth/*` API** (login, register, refresh,
  logout, forgot-password, reset-password, resend-verification; cookie-based
  refresh; RBAC in the real role space). All existing `features/auth` pages mapped.
- Feature API services (catalog, learning, exam, mock, payments, certificates,
  profile, admin): not yet built (Phase 2 continuation).

## Admin pages status

✅ **All previously-built admin pages remain built & committed.** The two pages
that were backend-blocked are **now unblocked** (Curriculum — BE-I-13;
Certificate revocation — BE-I-15), and **four new admin pages** are now possible
(staff, promo codes, lesson-quiz authoring, dashboard metrics). See
[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md) §B.

| #   | Admin page                                                | Status                        | Backend                                                                               |
| --- | --------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Admin Login** (`/admin/login`)                          | ✅ Built — ⚠️ needs OTP step  | `POST /auth/admin/login` (+ `login/otp`) — now two-step OTP (`e97de75`, checklist C1) |
| 2   | **Catalog — certificates list** (`/admin/catalog`)        | ✅ Built & committed          | `GET /admin/catalog`                                                                  |
| 2b  | **Catalog — create / edit / deactivate**                  | ✅ Built — ⚠️ add card fields | `GET/POST/PATCH/DELETE /admin/catalog` (BE-I-04 fields now writable, checklist B8)    |
| 2c  | **Catalog — title/description translations** (ar/fr)      | ✅ Built & committed          | `PATCH /admin/catalog/:id/translations`                                               |
| 3   | **Users — list + student detail** (`/admin/users`)        | ✅ Built & committed          | `GET /admin/users`, `GET /admin/users/:id`                                            |
| 3b  | **Users — attempts / access codes / revoke**              | ✅ Built (review pending)     | `/admin/users/:id/attempts`, `.../access-codes`, `.../revoke`                         |
| 4   | **Curriculum (modules/lessons)**                          | ✅ Built (review pending)     | `GET /admin/certs/:id/curriculum` (all statuses) + existing module/lesson CRUD (B1)   |
| 4b  | **Lesson-quiz authoring**                                 | 🆕 Now possible — build       | `/admin/lessons/:id/quizzes`, `/admin/quizzes/*` (BE-I-06, checklist B5)              |
| 5   | **Exam authoring — list + lifecycle** (`/admin/exams`)    | ✅ Built & committed          | `GET/POST /admin/certs/:id/exams`, `PATCH/DELETE/publish/unpublish /admin/exams/:id`  |
| 5b  | **Exam authoring — question editor** (`/admin/exams/:id`) | ✅ Built — ⚠️ show reasons[]  | `GET /admin/exams/:id`, `…/questions*`; publish `reasons[]` now available (B7)        |
| 5c  | **Exam title translations** (ar/fr)                       | ✅ Built & committed          | `PATCH /admin/exams/:id/translations`                                                 |
| 6   | **Exam assignment** (`/admin/exam`)                       | ✅ Built & committed          | `GET /admin/exam`, `POST /admin/exam/assign`                                          |
| 7   | **Mock questions** (`/admin/mock`)                        | ✅ Built & committed          | `GET/POST/PATCH/DELETE /admin/mock*`                                                  |
| 8   | **Audit logs** (`/admin/audit-logs`)                      | ✅ Built & committed          | `GET /admin/audit-logs`                                                               |
| 9   | **Certificate revocation**                                | ✅ Built (review pending)     | `GET /admin/certs/issued` + `PATCH /admin/certs/issued/:id/revoke` (B2)               |
| 10  | **Admin staff management**                                | ✅ Built (review pending)     | `/admin/staff` (super_admin, BE-I-03, checklist B3)                                   |
| 11  | **Promo codes**                                           | ✅ Built (review pending)     | `/admin/promo-codes` (super/finance admin, BE-I-05, checklist B4)                     |
| 12  | **Dashboard metrics** (`/admin` home)                     | ✅ Built (review pending)     | `GET /admin/dashboard/overview` (super/finance admin, BE-I-07, checklist B6)          |

**Page 12 — Admin dashboard analytics / B6 (uncommitted, awaiting review):**

First item of the admin-first pivot (2026-07-16). Enriches the admin home
(`pages/admin-home.page.ts`, previously "no metrics — BE-I-07") with the
platform-wide overview. Endpoint: `GET /admin/dashboard/overview?months=N` —
**bare** DTO (no envelope), super_admin / finance_admin only (finance-sensitive;
every other role 403s).

- **`features/admin/data-access/dashboard.*`** — standard layering:
  - `dashboard.dto.ts` — wire shapes mirroring backend `DashboardOverviewDto`
    (`revenue{total,currency,last30Days,monthly[]}`, `transactions`,
    `enrollments`, `students`, `exams`, `certificates`, `topPrograms[]`).
  - `dashboard.model.ts` — frontend types + helpers: `formatPassRate` (0–1
    fraction → whole-% ), `formatMoney(amount,currency,locale)` (Intl currency,
    falls back to a plain 2dp number + code for the `"MIXED"` sentinel or unknown
    ISO codes — never a misleading symbol), `MIXED_CURRENCY`,
    `DASHBOARD_MONTH_OPTIONS = [6,12,24]` / `DashboardMonths`.
  - `dashboard.mappers.ts` — `toDashboardOverview` (1:1).
  - `dashboard.api.ts` — `AdminDashboardApi.getOverview(months?)` → bare GET,
    `months` via `toHttpParams` (omitted when undefined).
  - `dashboard.store.ts` — `AdminDashboardStore` (root singleton): `overview/
loading/error/months/loaded` signals; `load(force)`/`reload`; `setMonths()`
    re-fetches on window change; cleared on `user.logged-out` (finance data).
- **Chart** — `features/admin/components/admin-revenue-chart.ts`
  (`ios-admin-revenue-chart`): a **feature-local** apex column chart for the
  monthly-revenue series with a currency-aware Y axis + tooltip. **Not** the
  shared `@ui` `ios-bar-chart`/`ios-donut-chart` — those are hard-wired to the
  student dashboard's fixed 0–100 % score axis + mock-test labels, so they'd
  distort currency amounts. It wraps the already-bundled `apx-chart` directly (no
  new chart library — honours the "reuse apexcharts" intent).
- **Page** (`admin-home.page.ts`) — keeps the signed-in-as / role cards for
  **all** admins; the metrics block is gated to super_admin / finance_admin
  (`canViewMetrics`) and only fetches when authorized (no doomed 403). Renders:
  6 KPI tiles (revenue total + last-30d, transactions w/ pending/failed/refunded
  breakdown, enrollments, students, exam attempts + pass-rate %, certificates
  issued), a **6M/12M/24M** revenue-window segmented control (drives `?months`),
  the revenue chart, and a top-programs list (program + code chip + revenue +
  enrollments). Loading / error+retry / loaded states.
- **No new nav item / route** — this enriches the existing `/admin` index page,
  so the "Home" nav entry is unchanged (still visible to any admin; only the
  metrics section is role-gated).
- **i18n:** new `admin.home.metrics.*` namespace (en/fr/ar; Arabic pending pro
  review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial
  96.20 kB). Live check needs a real super_admin/finance_admin session against
  the deployed API — deferred (no admin creds in-session). **Committed by the
  user.**

**Page 4 — Curriculum management / B1 (uncommitted, awaiting review):**

Second admin-pivot item. New page `/admin/curriculum` for managing a
certificate's modules + lessons. Read: `GET /admin/certs/:id/curriculum` →
**`{ data }`** envelope (all statuses, full admin fields incl. `active`,
timestamps, `translations`). Writes reuse the existing `POST/PATCH/DELETE
/admin/modules|lessons` CRUD (`learning-admin.controller.ts`).

- **`features/admin/data-access/curriculum.*`** — standard layering:
  - `curriculum.dto.ts` — `AdminCurriculumDto` (`{ certId, programCode, title,
modules[] }`), `AdminModuleDto` (w/ nested `lessons[]`), `AdminLessonDto`;
    write bodies `Create/Update{Module,Lesson}Body`. Note the lesson per-locale
    body key is **`content_html`** (snake_case) while the canonical field is
    `contentText`.
  - `curriculum.model.ts` — frontend types + `ModuleDraft`/`LessonDraft` (no
    `active` — activation is a separate toggle), `translatedLocales()` (non-`en`
    locales with content, for the indicator chips), `activeFirstByPosition()`
    (stable sort: active first, then position).
  - `curriculum.mappers.ts` — `toAdminCurriculum/Module/Lesson`; draft→body
    builders (omit blank optionals on create; send them on update so a cleared
    field persists; never send `translations` — the backend re-mirrors only `en`
    from the canonical title, preserving ar/fr).
  - `curriculum.api.ts` — `AdminCurriculumApi`: `getCurriculum` + module/lesson
    create/update/deactivate (`DELETE` = soft-delete `active=false`). Writes
    resolve to `void` (store refetches the whole tree).
  - `curriculum.store.ts` — `AdminCurriculumStore` (root singleton): cert picker
    (via `AdminCatalogApi`, active certs), selected cert + its curriculum,
    `modules` computed (active-first, each with lessons active-first), and
    module/lesson save / reactivate / deactivate actions with a shared
    `actionPendingId` (`module:<id>` / `lesson:<id>`) + `actionError`.
- **Page** (`admin-curriculum.page.ts`) — mirrors the exam-authoring idioms: cert
  picker → module cards (position, title, inactive badge, translated-locale chips,
  description) each containing its lessons (position, title, duration/video meta,
  inactive badge). Create/edit dialogs for modules and lessons; per-row
  **Reactivate**/**Deactivate**; "Add lesson" per module. Position fields
  pre-fill the next slot. Role gates: create/edit/reactivate =
  content_creator/learning_admin; **deactivate** (soft-delete `DELETE`) =
  learning_admin (mirrors exam-authoring's `canManage`/`canPublish` split;
  backend still enforces). Loading / error+retry / empty states.
- **Deferred (flagged):** the **translation editor** (per-locale module/lesson
  title + body — read-through only for now, shown as indicator chips; matches how
  catalog/exam translations were separate increments) and **lesson-quiz
  authoring** (B5, mounts under this page).
- **Routing/nav:** child route `/admin/curriculum` under the admin shell; nav item
  gated to content_creator/learning_admin.
- **i18n:** new `admin.curriculum.*` namespace + `admin.shell.nav.curriculum`
  (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.23 kB;
  `admin-curriculum-page` chunk 5.23 kB gzip). Live check needs a real
  content_creator/learning_admin session — deferred (no admin creds in-session).
  **Committed** (`7268d26`).

**Page 9 — Certificate revocation / B2 (uncommitted, awaiting review):**

Third admin-pivot item. New page `/admin/issued-certs` listing issued
certificates and revoking them. Read: `GET /admin/certs/issued?userId&certId&
cursor&limit` → **`{ data, meta.pagination }`** (cursor, newest-first). Revoke:
`PATCH /admin/certs/issued/:id/revoke` (idempotent, bare `RevokeResult`). Both
super_admin / learning_admin.

- **`features/admin/data-access/issued-certs.*`** — standard layering:
  - `issued-certs.dto.ts` — `IssuedCertificateItemDto` (`id` internal uuid +
    `certId` public serial nullable + student/program/`issuedAt`/`status`),
    `IssuedCertificatesResponseDto = PagedResponse<…>`, bare `RevokeResultDto`
    (`{ certId, isActive, revoked }`).
  - `issued-certs.model.ts` — `IssuedCertificate`, `ISSUED_CERT_STATUSES` /
    `isIssuedCertStatus`, `IssuedCertFilters` (`userId`/`certId`, both UUIDs),
    `RevokeResult`.
  - `issued-certs.mappers.ts` — `toIssuedCertificate` (status guarded: unknown →
    `revoked`, fail-closed), `toRevokeResult`.
  - `issued-certs.api.ts` — `AdminIssuedCertsApi`: `list` (cursor-paged via
    `toPage`/`toHttpParams`), `revoke`.
  - `issued-certs.store.ts` — `AdminIssuedCertsStore`: cursor list
    (`items/loading/loadingMore/error/hasMore/filters`, `load`/`loadMore`) + a
    `revoke(id)` action that flips the row's status to `revoked` **in place** (no
    reload — keyset order is stable) with `revokePendingId`/`revokeError`.
    **Filters are driven by pickers, not raw UUIDs:** a certificate select
    (`loadCerts` via `AdminCatalogApi`, active certs) → `selectCert`, and a
    student search-and-pick (`searchStudents`/`selectStudent`/`clearStudent` via
    `AdminUsersApi`) → both map to the backend `certId`/`userId` params. Cleared
    on `user.logged-out` (rows carry student PII).
- **Page** (`admin-issued-certs.page.ts`) — table (student, program + code,
  serial, issued date, valid/revoked badge) with a **certificate `ios-select`**
  ("All certificates" default) and a **student typeahead** (search → results
  list → selected chip with clear), cursor **Load more**, and a per-row
  **Revoke** guarded by a confirm dialog. Revoke gated to super_admin /
  learning_admin (`canRevoke`); revoked rows show no action. Loading /
  error+retry / empty states.
- **Note:** kept the backend's newest-first order (no client active-first
  re-sort — that would only reorder loaded pages of an infinite list and mislead;
  the active-first convention is for fully-loaded lists like the curriculum tree).
  Step-up re-auth for revoke (CLAUDE.md §8) is a backend/auth concern (C1), not
  wired here.
- **Two bugs surfaced during review:**
  1. **Search reloaded the page / lost the filter (fixed).** The student-search
     `<form (ngSubmit)>` had **no `[formGroup]`**, so Angular didn't intercept the
     submit and the browser did a native form submission → full page reload. Fixed
     by wrapping the search control in a `studentForm` FormGroup and binding
     `[formGroup]` + `formControlName` (mirrors the working exam-assign search).
  2. **Logout ~15 min into a local-dev session (documented, NOT fixed).** `ng serve`
     runs on **`localhost:4200`** but the API is **`api-dev.instituteofscrum.org`**
     — cross-site. The httpOnly refresh cookie is **`SameSite=Lax`**, so it's not
     sent on the cross-site `POST /auth/refresh` XHR; the in-memory access token
     lasts **15 min** (`accessTtlSec = 900`), and once it expires the next request
     401s → cookie-less refresh 401s → `handleRefreshFailure()` → logout. Not a B2
     bug (any admin action after token expiry does it); real deployments are fine
     (frontend + API same-site). A dev-proxy fix was prototyped then **reverted at
     the user's request** — for now, re-login when the 15-min token lapses, or
     serve the frontend same-site as the API. In-scope B2 fix retained: the student
     search sets its **own** `studentsError` (shown under the search box) instead of
     clobbering the main-list `error`, so a failed search no longer blanks the table.
- **Routing/nav:** child route `/admin/issued-certs`; nav item gated to
  learning_admin (super_admin sees all).
- **i18n:** new `admin.issuedCerts.*` namespace + `admin.shell.nav.issuedCerts`
  (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial
  96.22 kB). Live check needs a real super_admin/learning_admin session —
  deferred (no admin creds in-session).

**Page 10 — Admin staff management / B3 (uncommitted, awaiting review):**

Fourth admin-pivot item. New page `/admin/staff` — **super_admin only** — to
list / create / edit / deactivate admin staff (BE-I-03). Envelopes: list is
`{ data, meta.pagination }` (cursor); create/detail/update/deactivate are
`{ data }`.

- **`features/admin/data-access/staff.*`** — standard layering:
  - `staff.dto.ts` / `staff.model.ts` — `StaffMember` (`id/email/firstName/
lastName/role/locale/active/createdAt`), `STAFF_ROLES` (5) +
    `ASSIGNABLE_STAFF_ROLES` (4 — **`super_admin` excluded**, it's bootstrap-only),
    `STAFF_LOCALES`, `STAFF_PASSWORD_MIN = 12`, `isEditableStaff` (false for a
    super_admin target), `Create/UpdateStaffPayload`.
  - `staff.mappers.ts` — `toStaffMember`, draft→body builders (email lower-cased,
    fields trimmed).
  - `staff.api.ts` — `AdminStaffApi`: `list` (cursor via `toPage`/`toHttpParams`,
    filters `search`/`role`/`active`), `create`, `update`, `deactivate` (dedicated
    `POST :id/deactivate`).
  - `staff.store.ts` — `AdminStaffStore`: cursor list + `search`/`role`/`active`
    filters, create/update/deactivate + reactivate (`PATCH { active: true }`),
    shared `actionPendingId`/`actionError`; each write refetches. Cleared on
    `user.logged-out`.
- **Page** (`admin-staff.page.ts`) — table (name, email, role, locale,
  active badge) with search + role + status filters and cursor **Load more**;
  a create/edit dialog (create adds email + password ≥12; edit is name/role/
  locale, email/password not editable — validators dropped in edit mode);
  per-row deactivate (confirm) / reactivate. Pickers use **`ios-select`**; the
  create/edit dialog uses the **backdrop-scroll pattern** (the `fixed` overlay
  scrolls via `overflow-y-auto` + a `min-h-full` flex wrapper; the card itself has
  no `max-h`/`overflow`) so the select's absolute popover isn't clipped inside the
  dialog (an earlier native-`<select>` swap was reverted — design preference). **`super_admin` protection is
  honoured in the UI:** that role is absent from the assignable options, and
  super_admin rows show "Protected" instead of edit/deactivate (backend 400s/403s
  anyway). Whole page gated to super_admin (route + nav + backend).
- **Errors:** surfaces `problemDetailMessage` (e.g. 409 duplicate email, 400
  invalid, 403 super_admin target) inline in the dialog.
- **Routing/nav:** child route `/admin/staff`; nav item gated to super_admin.
- **i18n:** new `admin.staff.*` namespace (incl. `roleNames.*`) +
  `admin.shell.nav.staff` (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.20 kB;
  `admin-staff-page` chunk 4.63 kB gzip). Live check needs a real super_admin
  session — deferred (no admin creds in-session).

**Page 11 — Promo-code management / B4 (uncommitted, awaiting review):**

Fifth admin-pivot item. New page `/admin/promo-codes` (BE-I-05). View allowed for
super_admin / finance_admin / support_admin; **mutations (create/edit/retire/
reactivate) are super_admin / finance_admin only** (support_admin read-only, in
the UI and backend). List is `{ data, meta.pagination }` (cursor); create/update/
delete are `{ data }`.

- **`features/admin/data-access/promo.*`** — standard layering:
  - `promo.dto.ts` / `promo.model.ts` — `PromoCode` (`code`, `discountType`,
    `discountValue|null`, `applicableCertIds|null`, `maxUses|null`, `usageCount`
    read-only, `expiresAt|null`, `active`, `createdAt`), `DISCOUNT_TYPES`
    (`percentage`/`full_waiver`), `PROMO_PERCENT_MIN/MAX`, `isExpired`,
    `Create/UpdatePromoPayload`.
  - `promo.mappers.ts` — create body omits blank optionals + `discountValue`
    for full_waiver; update body sends `null` to clear (and nulls `discountValue`
    for full_waiver); `code` never sent on update (immutable).
  - `promo.api.ts` — `AdminPromoApi`: `list` (cursor, `active`/`expired` filters),
    `create`, `update`, `retire` (DELETE → soft-delete active=false).
  - `promo.store.ts` — `AdminPromoStore`: cursor list + filters, create/update/
    retire + reactivate (`PATCH { active: true }`), `actionPending`/`actionError`,
    plus active-cert options (`loadCerts`) for the "applies to" picker; cleared on
    `user.logged-out`.
- **Page** (`admin-promo-codes.page.ts`) — table (code, discount, applies-to,
  uses `usageCount/max`, expires, active/retired badge + an "expired" hint) with
  status + expiry filters and cursor **Load more**. Create/edit dialog: code
  (create-only, read-only in edit), discount type (`ios-select`), **percent value
  shown only for `percentage`** (validated 0.01–100), max-uses (optional int),
  expiry (`datetime-local` → ISO), and an **"applies to" certificate checklist**
  (none checked = all certs). Retire behind a confirm dialog; reactivate inline.
  Manage actions gated to super_admin/finance_admin (`canManage`). Uses the
  backdrop-scroll dialog pattern so the `ios-select` popover isn't clipped.
- **Routing/nav:** child route `/admin/promo-codes`; nav item gated to
  finance_admin + support_admin (super sees all).
- **i18n:** new `admin.promo.*` namespace + `admin.shell.nav.promo` (en/fr/ar;
  Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.25 kB;
  `admin-promo-codes-page` chunk 5.59 kB gzip). Live check needs a real
  super_admin/finance_admin session — deferred (no admin creds in-session).

**Page 2c — Catalog translations (uncommitted, awaiting review):**

- Completes the catalog form's deferred translations piece (`catalog.model.ts`
  had noted them as out of scope). Adds per-locale **title + description**
  authoring via `PATCH /admin/catalog/:id/translations`. App locales beyond
  English: ar + fr (English is the canonical title/description on the main form).
- `catalog.{dto,model,mappers}`: the admin detail now carries raw `translations`
  (`AdminCertificateDetail`, `CertificateLocaleFields`); `AdminCatalogApi.getById`
  returns the detail model and `updateTranslations` is added.
- `pages/admin-catalog-form.page.ts` (edit mode): a **Translations** button opens
  a dialog with Arabic + French title/description, pre-filled from existing
  translations. Full **clear** support (unlike the exam variant): a locale with
  all-blank fields is sent as `{}` (the backend's clear signal) when it had
  content, so translations can be removed; the local state updates in place
  without a reload. Added `admin.catalog.translations.*` i18n (en/fr/ar; Arabic
  pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓. Live check needs a
  real content_creator/learning_admin session — deferred.

**Page 5c — Exam title translations (committed `6fa0bd6`):**

- Small extension to the exam question editor. Adds per-locale exam **title**
  authoring via `PATCH /admin/exams/:examId/translations`. The app supports
  en/ar/fr, so the editor offers **Arabic + French** title fields (English is the
  canonical `title` field); students see the localized title with English fallback.
- `exam-authoring.{dto,model,mappers}` now carry the exam's `translations`
  (flattened to `locale → title`); `AdminExamAuthoringApi.updateTranslations`;
  `AdminExamQuestionsStore.saveTranslations` (sends only non-empty locales — the
  backend merges per supplied locale, so a **blank field preserves** the existing
  value and can't clear it; documented limitation).
- UI: a **Translations** button in the exam header opens a dialog (canonical
  English shown read-only + ar/fr inputs pre-filled from existing translations).
  Available on both draft and published exams (the backend has no status lock on
  translations). Added `admin.examQuestions.translations*` i18n (en/fr/ar; Arabic
  pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓ (`admin-exam-
questions-page` chunk 5.11 kB gzip). Live check needs a real
  content_creator/learning_admin session — deferred.

**Page 5b — Exam authoring, question editor (committed `5e11e34`):**

- Second increment — makes a draft publishable. Extends the exam-authoring
  data-access with detail/question shapes (`ExamDetail`, `ExamQuestion`,
  `QuestionDraft` in `.dto`/`.model`/`.mappers`), 4 new `AdminExamAuthoringApi`
  methods (`getExam`, `addQuestion`, `updateQuestion`, `deleteQuestion`), and a
  dedicated `AdminExamQuestionsStore` (loads one exam's authoring view, owns the
  question CRUD; DRAFT-only).
- `pages/admin-exam-questions.page.ts` (route `/admin/exams/:examId`, `examId`
  from route snapshot) — exam header (title/status/meta/count), question cards
  (position, marks, type, options with the correct answer marked), an inline
  **add/edit dialog** with a dynamic option set (radio picks the single correct
  answer; ≥2 enforced client-side + by the backend), delete (confirm), and a
  **student-view Preview** toggle (hides correct markers; derived client-side —
  the `/preview` endpoint wasn't needed). Question CRUD is hidden when the exam
  is published (backend 409s `EXAM_LOCKED`); a banner explains to unpublish first.
- Exam list page now links each row to its question editor (`Questions`).
- Role gate: content_creator/learning_admin (super_admin bypass). Added
  `admin.examQuestions.*` (42 keys) + `admin.examAuthoring.questions` i18n
  (en/fr/ar; Arabic pending pro review). Reuses the `required`-validator wrapper.
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓ (known budget
  warning; `admin-exam-questions-page` chunk 4.60 kB gzip). Live check needs a
  real content_creator/learning_admin session — deferred.

**Page 5 — Exam authoring, list + lifecycle (committed `bf1a620`):**

- First increment of the largest content surface. `features/admin/data-access/`
  exam-authoring layer: `exam-authoring.dto.ts`, `exam-authoring.model.ts`
  (`AdminExam`, `ExamDraft`, `ExamStatus`/`isExamStatus`), `exam-authoring.mappers.ts`,
  `exam-authoring.api.ts` (`AdminExamAuthoringApi`: `listExams(certId)` → `GET
/admin/certs/:certId/exams` (all statuses + `questionCount`, ordered by
  examOrder); `create`/`update` meta; `publish`/`unpublish`/`remove`),
  `exam-authoring.store.ts` (cert picker via `AdminCatalogApi`, selected cert,
  exams, save + lifecycle actions).
- `pages/admin-exam-authoring.page.ts` — pick a certificate → table of its exams
  (order, title, status badge, questionCount, duration, pass %) → create/edit
  draft **metadata** (title, order 1–6, duration, passing score) in a dialog,
  **publish** / **unpublish**, and **delete** an unused draft (confirm). Role
  gates: create/edit = content_creator/learning_admin; publish/unpublish/delete =
  learning_admin (backend-enforced). A draft with 0 questions shows an "add
  questions to publish" hint.
- **Scope note:** this increment is list + lifecycle only. The **question editor**
  (`/admin/exams/:id/questions*`, `/preview`) is the next increment — until then a
  freshly-created draft has no questions and publishing it returns the backend's
  generic not-publishable error.
- **Backend note (BE-I-14, logged):** the publish gate's structured `reasons[]`
  are dropped by the exception filter, so we can only show the generic message,
  not which checks failed.
- Uses the `required`-validator wrapper (as on the mock page) — the mixed
  string/number control set trips the type-aware `unbound-method` rule otherwise.
- Nav item **Exam authoring** gated to content_creator/learning_admin; route
  `/admin/exams` (distinct from `/admin/exam` assignment). Added
  `admin.examAuthoring.*` (42 keys) + `admin.shell.nav.examAuthoring` i18n
  (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning; `admin-exam-authoring-page`
  chunk 4.37 kB gzip). Live check needs a real content_creator/learning_admin
  session — deferred.

**Page 6 — Exam assignment (committed `8877dcd`):**

- `features/admin/data-access/` exam-assign layer: `exam-assign.dto.ts` (wire),
  `exam-assign.model.ts` (`PublishedExam`, `IssuedAccessCode`),
  `exam-assign.mappers.ts`, `exam-assign.api.ts` (`AdminExamAssignApi`:
  `listPublishedExams(certId)` → `GET /admin/exam?certId=` — published only,
  ordered by `examOrder`; `assign(body)` → `POST /admin/exam/assign`, omitting
  `examId` for auto-assign), `exam-assign.store.ts` (`AdminExamAssignStore` —
  orchestrates cert options (via `AdminCatalogApi`), published exams, **student
  search** (via `AdminUsersApi`), the exam target, and the assign action; holds
  the one-time code until dismissed).
- `pages/admin-exam-assign.page.ts` — three-step flow: pick a certificate →
  search + select a student → choose a specific published exam or **auto-assign**
  the next unattempted one → **issue a one-time access code** shown once in a
  dialog (copy button, expiry, warning). Loading/empty/error states per step.
- **Cohesion:** this is the _issue_ side of the exam-access story whose _view +
  revoke_ already live on the student-detail page (`/admin/users/:id`).
- Nav item **Exam assignment** gated to `learning_admin` (super_admin bypass).
  Route `/admin/exam` added under the shell. Added `admin.exam.*` (28 keys) +
  `admin.shell.nav.exam` i18n (en/fr/ar; Arabic pending pro review).
- **Backend notes reused:** `GET /admin/exam?certId=` is published-only (BE-I-09
  documents the overlap with `/admin/certs/:certId/exams`); auto-assign 404s when
  a cert has no published exams, 403 when the student's pool is exhausted, 409
  when they already hold an unused code — all surfaced inline via RFC-7807.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only). Live check needs a
  real `learning_admin` session against the deployed API — deferred.

**Page 7 — Mock questions (committed `de8aff8`):**

- `features/admin/data-access/` mock layer: `mock.dto.ts` (wire; the authoring
  view **exposes** `isCorrect`), `mock.model.ts` (`MockQuestion`,
  `MockQuestionDraft`, `MockQuestionType`/`isMockQuestionType`), `mock.mappers.ts`,
  `mock.api.ts` (`AdminMockQuestionsApi`: `list(certId)` → `GET
/admin/mock/certs/:certId/questions` — **not paginated**, returns the whole
  bank incl. inactive; `create`/`update`/`softDelete`), `mock.store.ts`
  (`AdminMockQuestionsStore` — owns the cert-picker options (loaded via the
  sibling `AdminCatalogApi`), the selected cert, that cert's question bank, and
  the save/deactivate/reactivate actions; active-first sort).
- `pages/admin-mock-questions.page.ts` — pick a certificate (`ios-select`), then
  manage its bank: cards per question (position, type, active badge, options with
  the correct answer marked), an inline **create/edit dialog** with a dynamic
  option set (native radio picks the single correct answer; add/remove options,
  min 2 enforced client-side, exactly-one-correct enforced by the radio + backend),
  role-gated **Deactivate** (confirm dialog) / **Reactivate**. Loading / empty /
  error+retry states. Business logic in the store; component owns only forms +
  dialog state.
- **Note (lint):** a module-level `required` validator wraps `Validators.required`
  as a call — the `FormArray` in this component degrades form-builder overload
  inference enough that the type-aware `unbound-method` rule loses the bare
  `Validators.required` reference (see the comment in the page).
- Nav item **Mock questions** gated to `content_creator` / `learning_admin`
  (super_admin sees all). Route `/admin/mock` added under the shell. Added
  `admin.mock.*` (40 keys) + `admin.shell.nav.mock` i18n (en/fr/ar; Arabic
  pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings in untouched files) · build ✓ (only the known raw-size budget warning;
  `admin-mock-questions-page` chunk 4.93 kB gzip). Live check needs a real
  content_creator/learning_admin session against the deployed API — deferred.

**Page 8 — Audit logs (committed `a9e002d`):**

- `features/admin/data-access/` audit layer: `audit.dto.ts` (wire; mirrors the
  backend `AuditLogItemDto` — `id` is a serial int, `oldData`/`newData` arrive
  redacted server-side), `audit.model.ts` (`AuditLogEntry`, `AuditLogFilters`,
  `AuditLogQuery`; `AUDIT_ACTIONS`/`isAuditAction` for `INSERT|UPDATE|DELETE`;
  `action` kept as `string` because the backend types it loosely), `audit.mappers.ts`,
  `audit.api.ts` (`AdminAuditLogsApi.list` → `GET /admin/audit-logs`, reuses
  `toHttpParams`/`toPage`), `audit.store.ts` (`AdminAuditLogsStore` — signal store:
  items, loading/loadingMore, error, cursor, a `filters` object + `setFilters`;
  no mutations — audit logs are append-only).
- `pages/admin-audit-logs.page.ts` — read-only, cursor-paginated table (When /
  Action badge / Table / Record / Actor / IP) with the four backend filters
  (`tableName`, `actorId`, `recordId` free-text; `action` via `ios-select`,
  Apply/Clear), loading / empty / error+retry / inline load-more-error states,
  and a per-row **details dialog** showing the redacted `oldData`/`newData`
  JSON (`before`/`after`) plus actor / record / IP / timestamp. Business logic
  lives in the store; the component only binds signals + drives filters.
- Nav item **Audit logs** gated to `super_admin` (the only role the backend
  allows; `admin-layout` nav filter already grants super_admin everything).
  Route added as a child of the admin shell. Added `admin.audit.*` (32 keys) +
  `admin.shell.nav.audit` i18n (en/fr/ar; Arabic still needs pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings in untouched files) · build ✓ (only the known raw-size budget warning;
  gzip initial 96.13 kB). Live check needs a real `super_admin` session against
  the deployed API (no test creds in-session) — deferred.

**Page 3 — Users list + student detail (uncommitted, awaiting review):**

- `features/admin/data-access/` users layer: `users.dto.ts`, `users.model.ts`,
  `users.mappers.ts`, `users.api.ts` (`AdminUsersApi.list` → `GET /admin/users`,
  `getDetail` → `GET /admin/users/:id`), `AdminUsersStore` (list signal store,
  reuses the pagination helper; search + load-more).
- `pages/admin-users-list.page.ts` — searchable, paginated student table; each
  row links to the detail view.
- `pages/admin-user-detail.page.ts` — safe profile projection + activity counts
  (purchases / exam attempts / certificates earned); `userId` from route snapshot.
- Nav item **Students** gated to `learning_admin` / `support_admin`; added
  `admin.users.*` + `admin.userDetail.*` i18n (en/fr/ar).
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓. Live check needs a
  real admin session against the deployed API.

**Page 3b + list sort (uncommitted, awaiting review):**

- **Active-first sort:** admin list convention — active rows shown before
  inactive. Applied to the catalog list (client-side stable sort in the store,
  since `GET /admin/catalog` only sorts by `created_at`). The students list has
  no active flag, so it's unaffected; future lists with a status follow this.
- `AdminUsersApi` extended: `getAttempts`, `getAccessCodes`, `revokeAccessCode`;
  matching DTOs/models/mappers.
- `components/student-attempts.ts` — paginated exam-attempt history (score,
  pass/fail, late flag, submitted); `[userId]` input, load-more.
- `components/student-access-codes.ts` — paginated access codes (status badge,
  expiry) with a **role-gated Revoke** (`learning_admin`) behind a confirm dialog;
  Revoke shown only for non-used codes (backend 409s on used ones).
- Both composed into the student detail page.
- Added `admin.userDetail.*` attempts/codes/revoke i18n (en/fr/ar).
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓.

**Page 2 — Catalog list (uncommitted, awaiting review):**

- Reusable `core/http/pagination.ts` — `Page<T>`, `PagedResponse<T,M>`,
  `CursorQuery`, `toPage()`, `toHttpParams()` (the list plumbing every admin
  table reuses). Exported from `@core/http`.
- `features/admin/data-access/` catalog layer: `catalog.dto.ts` (wire),
  `catalog.model.ts`, `catalog.mappers.ts`, `catalog.api.ts`
  (`AdminCatalogApi.list` → `GET /admin/catalog`), `catalog.store.ts` (signal
  store: items, loading/loadingMore, error, cursor, search + active filter).
- `pages/admin-catalog-list.page.ts` — table with free-text search, All/Active/
  Inactive filter, loading / empty / error+retry / inline load-more-error states,
  cursor "Load more". Business logic in the store; component only binds signals.
- Admin shell nav now **role-filtered** (`super_admin` sees all); Catalog nav
  item gated to `content_creator` / `learning_admin`. Added `admin.catalog.*` i18n.
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓. Live check needs
  a real admin session (deployed API, no test creds) — deferred.

**Page 2b — Catalog create / edit / deactivate (uncommitted, awaiting review):**

- Extended `AdminCatalogApi`: `getById`, `create` (`POST`), `update` (`PATCH`),
  `softDelete` (`DELETE`). Added `CertificateWritePayload` + detail DTO.
- `AdminCatalogStore.deactivate()` (+ `actionPendingId` / `actionError` signals):
  soft-deletes then refreshes the current page; surfaces 403/errors inline.
- `pages/admin-catalog-form.page.ts` — one form for **create** (`/admin/catalog/new`)
  and **edit** (`/admin/catalog/:id/edit`, `id` from the route param). Fields mirror
  `CreateCertificateDto` exactly (BE-I-04 extras + translations intentionally out);
  validation, load/submit states, RFC-7807 errors.
- List page: **New certificate** button, per-row **Edit** link, role-gated
  **Deactivate** action with a confirm dialog. `canManage` (content_creator /
  learning_admin) and `canDeactivate` (learning_admin) gate the UI; the backend
  still enforces. Added `admin.catalog.form.*` + action/confirm i18n (en/fr/ar).
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓.
- **Runtime bugs fixed** (reported on the live dev server):
  - Catalog form read its `:id` from a signal `input('')`, but with
    `withComponentInputBinding()` an **absent** optional param resolves to
    `undefined` (not the `''` default), so `isEdit`'s `id().length` threw on the
    `/new` route. Now read from `route.snapshot.paramMap`. Same pattern hardened
    in the auth `new-password` page (`token()` read).
  - `adminAuthGuard` built `returnUrl` from the guard's `segments`, which are
    **relative** to the `/admin` mount, so a redirect from `/admin/catalog`
    produced `returnUrl=/catalog` and login landed on a non-existent route
    ("sometimes goes to /catalog"). Now uses `router.getCurrentNavigation()
.extractedUrl` (absolute), so post-login returns to the exact admin URL.

**Admin app structure created this milestone:**

- `AuthStore.loginAdmin()` → `POST /auth/admin/login`; `logout({ redirectTo })`
  so admin sign-out returns to `/admin/login`.
- `features/admin/guards/admin-auth.guard.ts` — `adminAuthGuard` (unauth →
  `/admin/login`; non-admin → `/forbidden`) + `adminLoginGuard` (signed-in admin
  → `/admin`). `ADMIN_ROLES` = backend `AdminRole` set.
- `features/admin/pages/admin-login.page.ts` — staff sign-in, reuses the auth
  shell + design-system primitives; inline RFC-7807 error via submit state.
- `features/admin/components/admin-layout.ts` — admin shell (sidebar nav that
  grows page-by-page, top bar with signed-in staff + sign-out, `<router-outlet>`).
- `features/admin/pages/admin-home.page.ts` — minimal landing (real session info;
  no metrics — backend has no analytics endpoints, BE-I-07).
- `admin.routes.ts` rewritten (login public, shell + children gated); `/admin`
  in `app.routes.ts` no longer carries a top-level guard (gating moved into the
  feature). Added `admin.*` i18n namespace (en/fr/ar).
- **Verification:** typecheck ✓ · lint ✓ (0 errors) · build ✓. Live browser
  check deferred — port 4200 held by an existing dev server, and a full login
  test needs real staff credentials against the deployed API.

---

## Discovered backend issues

Full list + resolution status in [`backend-analysis.md` → Backend Issues Report](./backend-analysis.md#backend-issues-report).

**Most issues were RESOLVED by the backend on 2026-07-13** (BE-I-03/04/05/06/07/08/
13/14/15/16/17/18/19/20). Only behavioural notes still apply to the frontend:

- **BE-I-01 / BE-I-12** No global response envelope; validation + domain errors both return HTTP 400 with `code` → map per endpoint, branch on `code`.
- **BE-I-02** Refresh cookie is `SameSite=Lax` (not `Strict`); `Secure` only in prod/staging.
- **BE-I-09 / BE-I-10 / BE-I-11** Info-only (duplicate exam-list endpoints; `/health` routing; dead `BlogArticle`).

## Open questions for reviewer

1. **Register flow:** the real backend `POST /auth/register` does **not** return a
   session — the student must verify their email before logging in. The mock
   auto-logged-in. I've changed `AuthStore.register` to create the account then
   route to `/auth/login` with a "check your email" flag (no auto-login). OK?
2. **Environments:** `environment.*.ts` are marked "explicit direction only" in
   CLAUDE.md §13. The task explicitly gave dev/prod URLs, so I updated
   dev/default → `https://api-dev.instituteofscrum.org/api/v1` and prod →
   `https://api.instituteofscrum.org/api/v1`. I also repointed the placeholder
   `test`/`uat` (`*.ios-lms.example`) to the **dev** host to avoid dead URLs —
   confirm, or give real test/uat hosts.
3. **User-facing app scope:** landing/dashboard/insights/notifications/profile
   currently rely on mock endpoints the real backend does not expose. Removing
   the mock makes those screens 404 at runtime (they still build/lint). Should I
   (a) leave them until wired page-by-page, or (b) prioritise wiring the ones
   with real backend equivalents (catalog, profile)? Current plan: (a), and focus
   on the Admin app next per the mission.
4. **Password-reset link target:** the backend password-reset email links to the
   **backend-hosted** page (`APP_BASE_URL/reset-password?token=`), not the SPA
   `/auth/new-password`. The SPA page is now correctly wired to
   `POST /auth/reset-password`, but for the SPA flow to run end-to-end the reset
   email must point at `…/auth/new-password?token=` (a backend/infra config
   choice — backend is read-only). Confirm which page should own the reset UX.
5. **Arabic i18n:** I added `auth.login.session.registered` and the whole
   `admin.*` namespace to `ar.json` (en/fr too). Per CLAUDE.md §9 shipped Arabic
   must be professionally reviewed — please have these strings reviewed.

## Blockers

- None blocking Phase 2. Phase 3 (admin panel) is intentionally gated on
  finishing Phase 2 infrastructure + your review.

---

## Decisions made during implementation

- **Roles:** Frontend `AppRole` redefined to the real backend space —
  `student | super_admin | learning_admin | content_creator | finance_admin |
support_admin` — replacing the mock `learner | instructor | admin | support`.
  A student's session `roles = ['student']`; an admin's `roles = [<AdminRole>]`.
- **Refresh:** switched from an in-memory refresh token to the real
  **httpOnly refresh cookie**. `AuthApi` calls `/auth/*` with `withCredentials:
true`; `/auth/refresh` works for both student and admin tokens (the backend
  branches on the token's `type` claim). App boot silently attempts `/auth/refresh`.
- **Login mapping:** the login form's `identifier` maps to the backend `email`.
- **Route guards:** "any authenticated" branches (dashboard/courses/assessments)
  now use `authGuard`; `/admin` is gated to the five admin roles.
- **Auth interceptor:** public-path regex broadened to also skip `/auth/admin/*`.
- **Password-reset pages** call `AuthApi` directly (stateless, no session) and
  manage their own local submit/error state — the shared
  `problemDetailMessage()` helper renders RFC-7807 errors inline.

## Next recommended step

**Done so far (Phase 4):** Profile (`f23902e`), public Catalog data-access +
auth-aware landing nav, and Payments data-access (logic-only) — all earlier. Then
the checklist A-items: **A1** avatar upload (`242a11d`), **A3** credentials
(`3bed4c1`), **A4** notifications (`99917c8`) — committed; **A5** insights — built,
**staged not committed**.

**Build mode is full page builds** (data-access + wired screen, one item at a time,
stop for review, **commit only on explicit approval**). The plan is driven by
[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md) — every backend
blocker is fixed. Progress against its §"Suggested order":

1. ✅ **Profile avatar upload** (checklist A1) — committed (`242a11d`); cleared the
   BE-I-08 caveat, restored the "Change image" button + presigned PUT flow.
2. ✅ **Earned certificates list** (A3) — committed (`3bed4c1`) as the new
   `features/credentials` page at `/dashboard/credentials` (`GET /me/certificates`).
3. ✅ **Notifications** (A4) — real feed + mark-read/read-all + All/Unread filter
   - navbar unread badge (core `NotificationBadgeStore`).
4. ✅ **Insights** (A5) — `features/dashboard/data-access/insights.*` store;
   aggregates surfaced on the **Overview page only** (no standalone page, per
   reviewer). Public blog left untouched. **Staged, not yet committed.**

**▶ PIVOT (2026-07-16): admin pages next, not A6/A7.** Per the user, switch to the
**admin pages that exist in the backend but aren't in the UI** — analytics first.
Build order (see [checklist "Suggested order"](./frontend-unblock-checklist.md)):

5. ✅ **B6 — Admin dashboard analytics** (`GET /admin/dashboard/overview`,
   super/finance admin) — **built (uncommitted, awaiting review)**: KPI tiles +
   monthly-revenue chart + top-programs list on the admin home, 6M/12M/24M
   window, role-gated. Full page build (data-access + wired screen). See "Page 12
   — Admin dashboard analytics / B6" under "Admin pages status" below.
6. ✅ **B1 — Curriculum management** (`GET /admin/certs/:id/curriculum` + module/
   lesson CRUD) — **built (uncommitted, awaiting review)**: new `/admin/curriculum`
   page — cert picker → module/lesson tree with create/edit/reactivate/deactivate,
   active-first. Translation editor + lesson-quiz authoring (B5) deferred. See
   "Page 4 — Curriculum management / B1" below.
7. ✅ **B2 — Certificate revocation** (`GET /admin/certs/issued` + existing revoke)
   — **built (uncommitted, awaiting review)**: new `/admin/issued-certs` page —
   cursor list + confirm-guarded revoke, super/learning admin. See "Page 9 —
   Certificate revocation / B2" below.
   7b. ✅ **B3 — Admin staff management** (`/admin/staff`, super_admin) — **built
   (uncommitted, awaiting review)**: list/create/edit/deactivate staff, super_admin
   rows protected. See "Page 10 — Admin staff management / B3" below.
   7c. ✅ **B4 — Promo codes** (`/admin/promo-codes`, super/finance admin) — **built
   (uncommitted, awaiting review)**: CRUD + retire/reactivate, cert-scoping
   checklist, support_admin read-only. See "Page 11 — Promo-code management / B4".
   7d. ⏭️ **Next: B5 lesson-quiz authoring** (under the B1 curriculum page) → small
   **B7/B8** (see "Admin pages status" table below).
8. **Then user-facing:** A6 Landing, A7 Dashboard fold-in (`GET /exam/attempts`),
   A2 Settings delete/export, C2 cookie consent.
9. **Admin OTP login** (C1) — last; it's a `core/auth` change needing security review.

Still to wire regardless: **Courses/Learning** (`/learning/*`) and **Assessments/
Mock** (exam + mock, incl. `/exam` and `/mock` WebSockets — highest complexity;
note exam domain conflicts are now **409**), plus the deferred catalog/payments overlays.

**Decision (resolved 2026-07-16):** **full page builds** — each admin item builds
the data-access layer AND wires the screen end to end, one item at a time, then
stops for review. B6 was built this way.
