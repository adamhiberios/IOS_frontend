# Admin Pages — Detailed Build Log

> Per-page build notes for the 12 admin pages (data-access shapes, decisions,
> i18n namespaces, verification). For the current page inventory and
> cross-page conventions, see
> [`../reference/pages/admin.md`](../reference/pages/admin.md). All items
> below are committed and done.

## Page 12 — Admin dashboard analytics / B6 (`9559ec1`)

Endpoint: `GET /admin/dashboard/overview?months=N` — bare, super_admin/finance_admin only.

- `dashboard.{dto,model,mappers,api,store}.ts` — `formatPassRate` (0–1
  fraction → whole %), `formatMoney(amount,currency,locale)` (Intl currency,
  falls back to a plain 2dp number + code for `"MIXED"`/unknown ISO codes),
  `DASHBOARD_MONTH_OPTIONS = [6,12,24]`.
- `components/admin-revenue-chart.ts` — a **feature-local** apex column
  chart (not the shared `@ui` bar/donut charts, which are hard-wired to the
  student dashboard's 0–100% score axis and would distort currency amounts).
  Wraps the already-bundled `apx-chart` directly.
- `admin-home.page.ts` — metrics block gated to super_admin/finance_admin
  (`canViewMetrics`), only fetches when authorized. 6 KPI tiles, 6M/12M/24M
  window control, revenue chart, top-programs list. No new nav item — enriches
  the existing `/admin` index.
- i18n: `admin.home.metrics.*`.

## Page 4 — Curriculum management / B1 (`7268d26`)

Endpoint: `GET /admin/certs/:id/curriculum` (`{ data }`, all statuses, full
admin fields incl. `translations`); writes reuse existing
`POST/PATCH/DELETE /admin/modules|lessons`.

- `curriculum.dto.ts` — note the lesson per-locale body key is
  **`content_html`** (snake_case) while the canonical field is `contentText`.
- `curriculum.mappers.ts` — draft→body builders omit blank optionals on
  create, send them on update so a cleared field persists; never sends
  `translations` (backend re-mirrors only `en` from the canonical title,
  preserving ar/fr).
- `admin-curriculum.page.ts` — cert picker → module cards (position, title,
  inactive badge, translated-locale chips) containing lessons. Create/edit
  dialogs; per-row Reactivate/Deactivate. Role gates: create/edit/reactivate
  = content_creator/learning_admin; deactivate (soft-delete) = learning_admin.
- **Deferred at the time (since built):** translation editor (module/lesson
  title+body) and lesson-quiz authoring (B5, mounts under this page).
- i18n: `admin.curriculum.*` + `admin.shell.nav.curriculum`.

## Page 9 — Certificate revocation / B2 (`451af2a`)

Endpoints: `GET /admin/certs/issued?userId&certId&cursor&limit`
(`{ data, meta.pagination }`); `PATCH /admin/certs/issued/:id/revoke`
(idempotent, bare `RevokeResult`). Both super_admin/learning_admin.

- Filters are driven by pickers, not raw UUIDs: a certificate select
  (`AdminCatalogApi`, active certs) and a student typeahead
  (`AdminUsersApi.searchStudents`) both map to backend `certId`/`userId`
  params.
- Revoke flips the row's status **in place** (no reload — keyset order stays
  stable), not a re-fetch.
- Kept the backend's newest-first order (no client active-first re-sort —
  that would only reorder loaded pages of an infinite list and mislead; the
  active-first convention is for fully-loaded lists like the curriculum tree).
- **Two bugs found and fixed during review:**
  1. Student-search `<form (ngSubmit)>` had no `[formGroup]`, so Angular
     didn't intercept the submit → native form submission → full page
     reload. Fixed by wrapping the search control in a `studentForm`
     `FormGroup`.
  2. Search sets its **own** `studentsError` (shown under the search box)
     rather than clobbering the main-list `error`, so a failed search
     doesn't blank the table.
- **Documented, not fixed:** local-dev logout ~15 min in — see
  [`../reference/pages/admin.md`](../reference/pages/admin.md#architectural-notes-worth-knowing-before-touching-admin-pages).
- i18n: `admin.issuedCerts.*` + `admin.shell.nav.issuedCerts`.

## Page 10 — Admin staff management / B3 (`6f09077`)

super_admin only. Envelopes: list `{ data, meta.pagination }`; create/detail/
update/deactivate `{ data }`.

- `ASSIGNABLE_STAFF_ROLES` (4) deliberately **excludes** `super_admin`
  (bootstrap-only). `STAFF_PASSWORD_MIN = 12`.
- Create adds email + password ≥12; edit is name/role/locale only
  (email/password not editable). `super_admin` rows show "Protected" instead
  of edit/deactivate in the UI (backend 400s/403s anyway).
- Uses the backdrop-scroll dialog pattern (see
  [`../reference/pages/admin.md`](../reference/pages/admin.md)) so the
  `ios-select` popover isn't clipped.
- i18n: `admin.staff.*` (incl. `roleNames.*`) + `admin.shell.nav.staff`.

## Page 11 — Promo-code management / B4 (`3ea7e28`)

View: super_admin/finance_admin/support_admin. Mutations: super_admin/
finance_admin only (support_admin read-only, UI **and** backend).

- Create body omits blank optionals + `discountValue` for `full_waiver`;
  update body sends `null` to clear (and nulls `discountValue` for
  `full_waiver`); `code` never sent on update (immutable).
- "Applies to" is a certificate checklist — none checked means "all certs".
- i18n: `admin.promo.*` + `admin.shell.nav.promo`.

## Page 4b — Lesson-quiz authoring / B5 (`0d95e6e`, restyle `d1ce3e8`)

Extends B1. Reached from a "Quizzes" link on each curriculum lesson row.
Create/edit quiz + add/edit question = content_creator/learning_admin;
deactivate quiz + delete question = learning_admin only.

- `quiz.mappers.ts` — create omits `options` for free-text; update always
  sends `options` (empty array converts a question to free-text, per the
  backend "supplying options replaces the set" rule).
- Question dialog: MCQ/free-text toggle — MCQ uses a `FormArray` of options
  (≥2) with a radio for the correct one (mirrors the exam-question editor).
- i18n: `admin.quiz.*` + `admin.curriculum.quizzes`.

## Page 5 update — B7: exam publish `reasons[]` (`0db202e`)

The publish gate returns `409 EXAM_NOT_PUBLISHABLE` with the failing checks
in the RFC-7807 `errors[]` (each `{code:'NOT_PUBLISHABLE', message}`) — these
ARE surfaced (an earlier note claiming the exception filter dropped them was
stale/wrong). `publishReasonsFrom(err)` kept feature-local (not added to
`@core/http`, per CLAUDE §13 protected-file rules).

> **Build-script note:** `package.json`'s `build` script runs `ng build
> --configuration development` — use `npx ng build --configuration
> production` to verify prod bundles/budgets.

## Page 2b update — B8: catalog card fields (`9b18571`)

`badgeImageUrl`/`track`/`level`/`durationHours`/`syllabusUrl` added to the
form. `CERT_LEVELS` enum (`foundation`/`practitioner`/`authority`).
`durationHours` is **omitted when blank** on submit (backend coerces
`null → 0`, so omitting preserves the existing value — documented
limitation, not a bug). `?active=false` filter fix (`5133b4e`) needed no FE
workaround removal — none existed.

## Page 2c — Catalog translations (`50fc688`)

`PATCH /admin/catalog/:id/translations`, Arabic + French (English is
canonical). Full **clear** support: a locale with all-blank fields is sent
as `{}` (the backend's clear signal) when it had content.

## Page 5c — Exam title translations (`6fa0bd6`)

`PATCH /admin/exams/:examId/translations`. **Limitation:** blank fields are
omitted from the send, so they **cannot clear** an existing value (the
backend merges per supplied locale) — unlike the catalog translations above.
Available on both draft and published exams (no status lock on translations).

## Page 5b — Exam authoring, question editor (`5e11e34`)

Route `/admin/exams/:examId`. Question cards with an inline add/edit dialog
(dynamic option set, radio picks the correct answer, ≥2 enforced
client-side + backend). A **student-view Preview** toggle originally derived
client-side (hides correctness markers) — later replaced by the real
`GET /admin/exams/:examId/preview` endpoint (2026-07-29, see
[`changelog.md`](./changelog.md)). Question CRUD hidden when the exam is
published (backend 409s `EXAM_LOCKED`).

## Page 5 — Exam authoring, list + lifecycle (`bf1a620`)

First increment — list + lifecycle only; the question editor (above) was the
next increment, so a freshly-created draft initially had no questions and
publishing returned the generic not-publishable error until B7 (`0db202e`)
surfaced `reasons[]`. Role gates: create/edit = content_creator/learning_admin;
publish/unpublish/delete = learning_admin.

## Page 6 — Exam assignment (`8877dcd`)

Three-step flow: pick certificate → search + select student → choose a
specific published exam or auto-assign the next unattempted one → issue a
one-time access code (shown once, copy button, expiry warning). This is the
*issue* side; the *view + revoke* side lives on the student-detail page
(`/admin/users/:id`). `GET /admin/exam?certId=` is published-only (BE-I-09
documents the overlap with the authoring list).

## Page 7 — Mock questions (`de8aff8`)

`GET /admin/mock/certs/:certId/questions` is **not paginated** — returns the
whole bank including inactive. Cards per question with an inline create/edit
dialog (dynamic option set, native radio for the single correct answer, min
2 enforced).

## Page 8 — Audit logs (`a9e002d`)

Read-only, cursor-paginated, `super_admin` only. Per-row details dialog shows
redacted `oldData`/`newData` JSON (`before`/`after`) + actor/record/IP/
timestamp. No mutations — audit logs are append-only.

## Page 3 — Users list + student detail (`f1f5013`)

Searchable, paginated student table → detail view with safe profile
projection + activity counts. Gated to learning_admin/support_admin.

## Page 3b + list sort (`af4e917`)

Extended `AdminUsersApi`: `getAttempts`, `getAccessCodes`,
`revokeAccessCode`. New `student-attempts.ts` (paginated exam history) and
`student-access-codes.ts` (paginated codes with role-gated Revoke, shown only
for non-used codes — backend 409s on used ones) components composed into the
detail page. Also introduced the **active-first sort convention** applied to
the catalog list.

## Page 2 — Catalog list (`60a072c`)

Introduced the reusable `core/http/pagination.ts` (`Page<T>`,
`PagedResponse<T,M>`, `CursorQuery`, `toPage()`, `toHttpParams()`) that every
subsequent admin list reuses. Free-text search + All/Active/Inactive filter.
Admin shell nav made role-filtered.

## Page 2b — Catalog create / edit / deactivate (`9499fec`)

One form for create (`/admin/catalog/new`) and edit
(`/admin/catalog/:id/edit`). **Two runtime bugs found and fixed:**

1. The form read `:id` from a signal `input('')`; with
   `withComponentInputBinding()` an **absent** optional param resolves to
   `undefined`, not the `''` default, so `isEdit`'s `id().length` threw on
   `/new`. Fixed by reading from `route.snapshot.paramMap` instead — this
   became the project-wide route-param convention (see
   [`../reference/conventions/frontend-data-access-patterns.md`](../reference/conventions/frontend-data-access-patterns.md)).
2. `adminAuthGuard` built `returnUrl` from the guard's mount-relative
   `segments`, producing broken redirects (`/admin/catalog` → `returnUrl=/catalog`).
   Fixed to use `router.getCurrentNavigation().extractedUrl` (absolute).

## Admin app structure (foundational, pre-dates the page-by-page build)

`AuthStore.loginAdmin()`, `features/admin/guards/admin-auth.guard.ts`
(`adminAuthGuard` + `adminLoginGuard`, `ADMIN_ROLES` = backend `AdminRole`
set), `admin-login.page.ts`, `admin-layout.ts` (shell: role-growing sidebar
nav, top bar, `<router-outlet>`), `admin-home.page.ts` (initially minimal —
no metrics until B6). `admin.routes.ts` rewritten (login public, shell +
children gated); `/admin` in `app.routes.ts` no longer carries a top-level
guard (gating moved into the feature).
