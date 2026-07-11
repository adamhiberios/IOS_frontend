# Implementation Progress — IOS LMS Frontend ↔ Real Backend

> **Single source of truth for implementation progress.** Updated continuously.
> Last updated: 2026-07-11.

---

## Overall project status

**Phase 2 (Frontend infrastructure) — in progress.** The backend has been fully
analysed (Phase 1 complete, see [`backend-analysis.md`](./backend-analysis.md)).
Current work: removing the legacy mock backend and wiring the real deployed API,
starting with authentication.

## Current phase

**Phase 2 — Infrastructure & mock removal.**
Milestone in flight: _Remove mock backend + wire real Auth API_.

## Phases at a glance

| Phase | Description                                                                           | Status                              |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------- |
| 1     | Study backend → `backend-analysis.md`                                                 | ✅ Complete                         |
| 2     | Frontend infrastructure (remove mocks, real API services, auth, interceptors, models) | 🚧 In progress                      |
| 3     | Admin application, page by page (starting with Login)                                 | ⛔ Not started (blocked on Phase 2) |

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

## Tasks currently in progress

- (none — awaiting review before starting the Admin app)

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
  logout; cookie-based refresh; RBAC in the real role space).
- Feature API services (catalog, learning, exam, mock, payments, certificates,
  profile, admin): not yet built (Phase 2 continuation).

## Admin pages status

⛔ **Not started.** The `features/admin` folder currently contains only an empty
`admin.routes.ts`. Admin build begins after infrastructure, page by page, with a
review gate after each page. First page: **Admin Login**.

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

## Next recommended step

Finish the mock-removal milestone, verify `npm run typecheck` / `build` / `lint`
are green, update this file, then **stop for review** before building the first
Admin page (Admin Login).
