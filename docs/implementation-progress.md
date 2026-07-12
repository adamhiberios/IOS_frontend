# Implementation Progress — IOS LMS Frontend ↔ Real Backend

> **Single source of truth for implementation progress.** Updated continuously.
> Last updated: 2026-07-12.

---

## Overall project status

**Phase 3 (Admin application) — in progress.** Backend fully analysed (Phase 1,
see [`backend-analysis.md`](./backend-analysis.md)); infrastructure done (Phase 2:
mock backend removed, real `/auth/*` wired). Now building the Admin app page by
page against the deployed API.

## Current phase

**Phase 3 — Admin application (page by page).** All work below is **committed**
on `feat/real-backend-integration`. Done & committed: Admin Login, full Catalog
CRUD, complete student oversight (list, detail, attempts, access codes + revoke),
admin-list active-first sort, **Audit logs** (`a9e002d`), and **Mock questions**
(`/admin/mock`, committed `de8aff8`). **Just built (uncommitted, awaiting review):
Exam assignment** (`/admin/exam`). **Next page to build:** Exam authoring
(`/admin/certs/:id/exams*` — the larger multi-view content surface: list all
statuses + question CRUD + publish). Curriculum is blocked by BE-I-13;
Certificate revocation lacks an issued-cert list endpoint.

## Phases at a glance

| Phase | Description                                                                           | Status                             |
| ----- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| 1     | Study backend → `backend-analysis.md`                                                 | ✅ Complete                        |
| 2     | Frontend infrastructure (remove mocks, real API services, auth, interceptors, models) | 🚧 Auth done; feature APIs pending |
| 3     | Admin application, page by page (starting with Login)                                 | 🚧 In progress                     |

---

## For a new session — start here

**Repo / branch.** Frontend project: `institute of scrum/` (Angular 21). Backend
(READ-ONLY, never modify): `IOS_Backend/` (NestJS). All work is on git branch
**`feat/real-backend-integration`** (in the `institute of scrum/` repo). The
deployed API is the source of data — never run the backend locally. Dev API:
`https://api-dev.instituteofscrum.org/api/v1` (already set in `environment*.ts`).

**Read first (in order):** this file → [`backend-analysis.md`](./backend-analysis.md)
(every endpoint/DTO/role, + the **Backend Issues Report**) → `CLAUDE.md`
(frontend rules: standalone components, signals, OnPush, new control-flow, no
`any`, no Observables in components, `ios-` selector prefix, logical CSS).

**Working rules (from the mission brief):**

- **Never modify `IOS_Backend/`.** Document backend problems in
  `backend-analysis.md` → Backend Issues Report; don't fix them.
- **Admin app, page by page.** Build one page, verify, **stop for review**.
  **Never commit without the user's explicit approval** — they say "commit".
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

- **Exam assignment** (`/admin/exam`) — built & verified, **uncommitted**,
  awaiting review. See "Page 6" below. (Mock questions committed as `de8aff8`.)

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

🚧 **In progress — Login + Catalog + student oversight + Audit logs + Mock questions committed; Exam assignment awaiting review.**

| #   | Admin page                                         | Status                    | Backend                                                       |
| --- | -------------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| 1   | **Admin Login** (`/admin/login`)                   | ✅ Built & committed      | `POST /auth/admin/login`                                      |
| 2   | **Catalog — certificates list** (`/admin/catalog`) | ✅ Built & committed      | `GET /admin/catalog`                                          |
| 2b  | **Catalog — create / edit / deactivate**           | ✅ Built & committed      | `GET/POST/PATCH/DELETE /admin/catalog`                        |
| 3   | **Users — list + student detail** (`/admin/users`) | ✅ Built & committed      | `GET /admin/users`, `GET /admin/users/:id`                    |
| 3b  | **Users — attempts / access codes / revoke**       | ✅ Built (review pending) | `/admin/users/:id/attempts`, `.../access-codes`, `.../revoke` |
| 4   | Curriculum (modules/lessons)                       | ⬜                        | `/admin/modules`, `/admin/lessons`                            |
| 5   | Exam authoring                                     | ⬜                        | `/admin/certs/:id/exams*`                                     |
| 6   | **Exam assignment** (`/admin/exam`)                | ✅ Built (review pending) | `GET /admin/exam`, `POST /admin/exam/assign`                  |
| 7   | **Mock questions** (`/admin/mock`)                 | ✅ Built & committed      | `GET/POST/PATCH/DELETE /admin/mock*`                          |
| 8   | **Audit logs** (`/admin/audit-logs`)               | ✅ Built & committed      | `GET /admin/audit-logs`                                       |
| 9   | Certificate revocation                             | ⬜                        | `/admin/certs/issued/:id/revoke`                              |

**Page 6 — Exam assignment (uncommitted, awaiting review):**

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

Full list in [`backend-analysis.md` → Backend Issues Report](./backend-analysis.md#backend-issues-report).
Highlights that constrain the frontend:

- **BE-I-02** Refresh cookie is `SameSite=Lax` (not `Strict` as frontend docs assume); `Secure` only in prod/staging.
- **BE-I-03** No admin-user management API.
- **BE-I-04** Certificate card fields (`badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl`) not writable via DTOs.
- **BE-I-05** No promo-code admin CRUD. **BE-I-06** No lesson-quiz authoring. **BE-I-07** No dashboard/analytics endpoints. **BE-I-08** No upload-URL endpoint for avatars/images.
- **BE-I-01 / BE-I-12** No global response envelope; validation + domain errors both return HTTP 400 with `code`.

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

**Exam assignment is built & verified** (`/admin/exam`) — **uncommitted** per
"don't commit till I agree". Cert → student-search → exam-target → one-time-code
flow, reusing the established layering and closing the exam-access loop with the
student-detail access-codes view. On approval: commit, then continue. Suggested
next page: **Exam authoring** (`/admin/certs/:id/exams*`) — the larger, richest
content surface (list all statuses + create-draft + question CRUD +
publish/unpublish), best built as its own multi-increment effort. Avoid
**Curriculum** (BE-I-13: no admin read) and **Certificate revocation** (no
issued-cert list endpoint) until the backend gaps are addressed.
