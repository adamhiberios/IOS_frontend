# Frontend change checklist — backend blockers now fixed

> Derived from the **IOS_Backend** commits of 2026-07-12 → 2026-07-13 (the
> backend team's response to [`backend-blockers-report.md`](./backend-blockers-report.md)).
> Every referenced endpoint is under `/api/v1`. Response envelopes are still
> per-endpoint (BE-I-01): **bare** DTO, `{ data }`, or `{ data, meta.pagination }`
> (cursor) — noted per item. Reuse the established data-access layering
> (`dto → model → mappers → api → store`) and `@core/http` `toPage`/`toHttpParams`/
> `problemDetailMessage`.
> Created 2026-07-13.

## Status (updated 2026-07-16) — pivot to admin pages

**Done (user-facing):** **A1** avatar upload (committed), **A3** earned-certificates
list → new `features/credentials` at `/dashboard/credentials` (committed), **A4**
notifications feed + navbar unread badge (committed), **A5** student insights →
surfaced on the **Dashboard overview only** via `features/dashboard/data-access/
insights.*` (no standalone page; **A5 staged, not yet committed**).

**Now prioritized — Admin pages (section B), backend-ready but not in the UI:**
build in this order — **B6 analytics dashboard** → **B1 Curriculum** → **B2 Cert
revocation** → **B3 Staff** → **B4 Promo codes** → **B5 lesson-quiz** → small
fixes **B7/B8**. See the reworked "Suggested order" at the bottom.

**Still pending (user-facing, after admin):** **A6** Landing rewire (`GET /landing`),
**A7** Dashboard fold-in (`GET /exam/attempts` + richer `/insights` composition),
**A2** Settings delete/export, **C2** cookie consent, **C1** admin OTP login (last).

**Later BE changes to honour (post-2026-07-13):** exam domain-state conflicts now
return **409** (not 422/400) — `5c11460`; still key off `code`, not status. Audit
capture hardened (`f78e76b`, no FE impact); `/health` debug-sentry gated to dev
(`a0d2409`, no FE impact).

## Backend commits mapped to blockers

| Commit    | What shipped                                                    | Blockers cleared        |
| --------- | --------------------------------------------------------------- | ----------------------- |
| `a36ddfd` | Wave 1 FE-unblock reads + publish `reasons[]`                   | BE-I-13, 14, 15, 16, 17 |
| `1515dff` | Analytics: admin dashboard, student insights, public landing    | BE-I-07, BE-I-20        |
| `181cd9f` | In-app notification feed                                        | BE-I-18                 |
| `10965cb` | Admin staff CRUD (super_admin)                                  | BE-I-03                 |
| `cb10205` | Admin lesson-quiz authoring CRUD                                | BE-I-06                 |
| `1b603f1` | Promo-code admin CRUD                                           | BE-I-05                 |
| `e4b347c` | Avatar presigned-upload URL + catalog card fields               | BE-I-08, BE-I-04        |
| `65bf4e8` | GDPR: data export, account deletion, cookie consent             | BE-I-19 (+ BE-042)      |
| `e97de75` | Two-step admin login with emailed OTP                           | (new — admin auth flow) |
| `5133b4e` | Catalog `?active` parse fix (`false` no longer flips to `true`) | (behavioural)           |

---

## A. User-facing (Phase 4) — highest priority (aligns with current work)

### A1. Profile — wire real avatar upload (BE-I-08) — revisits committed work

- [ ] New endpoint: `POST /me/avatar-upload-url` `{ contentType }` (one of
      `image/png|image/jpeg|image/webp`) → **bare** `{ uploadUrl, key, expiresInSeconds }`.
- [ ] Flow: request presigned URL → browser `PUT`s the file bytes to `uploadUrl`
      **with the exact same `Content-Type`** → then `PATCH /me { avatarUrl: <key or resolved URL> }`.
- [ ] Restore the **"Change image profile"** button removed in `edit-profile.page`
      (it was cut for BE-I-08); add a file picker + client-side type/size guard.
- [ ] The `PUT` goes to object storage, not the API — **bypass `authInterceptor`
      / `X-Lang`** for that request (use a bare `HttpClient` call or `SKIP_AUTH`), and
      do not send credentials to the storage host.
- [ ] Note: image upload is a "Prohibited/permission" area only for _credentials_ —
      a normal file upload is fine, but keep it user-initiated.
- [ ] Update `docs/implementation-progress.md` Profile section (drop the BE-I-08
      "avatar is plain URL only" caveat).

### A2. Settings — delete account + data export (BE-I-19 / BE-042)

- [ ] `POST /me/delete` `{ password }` (step-up re-auth) — **not** `DELETE /me`.
      On success the account is anonymised-in-place → treat as a forced logout
      (clear session, route to a farewell/login page). Confirm dialog + password field.
- [ ] `GET /me/export` — GDPR data export (bare payload). Add a "Download my data"
      action in Settings; trigger a client download of the returned JSON.
- [ ] Un-park the Settings "delete account" control (was hidden per BE-I-19).

### A3. Certificates list (BE-I-16) — build the page (was ⛔ blocked)

- [ ] `GET /me/certificates` → **`{ data: [...] }`** (no pagination). Item:
      `{ certId (public id, nullable), program, programCode, issuedAt, status:'valid'|'revoked', certificateUrl, qrUrl, verifyUrl }`.
- [ ] Build `features/certificates` data-access + the list page (earned certs,
      download PDF / QR / verify links). Keep the existing public
      `GET /verify/:certId` "verify a certificate" tool.
- [ ] Remove the ⛔ stub; add the nav item back.

### A4. Notifications (BE-I-18) — build the feature (was ⛔ blocked)

- [ ] `GET /notifications?cursor&limit&unreadOnly` → `{ data, meta.pagination }`
      (cursor). Item: `{ id, type, title (localized), body (localized), data (params object), read, createdAt }`.
- [ ] `GET /notifications/unread-count` → bare `{ count }`.
- [ ] `POST /notifications/:id/read` → `{ data: NotificationItem }` (idempotent).
- [ ] `POST /notifications/read-all` → `{ updated: number }`.
- [ ] Build `features/notifications` data-access + list page (mark-read,
      mark-all-read, unreadOnly filter) and a **navbar unread badge** (poll
      `unread-count`, or refresh on route change — no WS for notifications).
- [ ] `title`/`body` arrive already localized (server renders i18n) — send `X-Lang`
      (already wired); don't re-translate. `data` carries params (e.g. `verifyUrl`)
      for deep-linking.

### A5. Insights (student) (BE-I-20a / BE-I-07) — build the page (was ⛔ blocked)

- [ ] `GET /insights` (student only; admins 403) → **bare**
      `{ enrolledPrograms, completedLessons, inProgressPrograms, realExam:{attempts,passed,passRate,avgScore,bestScore}, mockExam:{attempts,avgScore}, certificatesEarned }`.
- [ ] Rewire `features/insights` (currently targets a removed mock) to this shape.
- [ ] Note `passRate` is a fraction (0–1) — format as %.

### A6. Landing dynamic blocks (BE-I-20) — rewire (currently returns null)

- [ ] `GET /landing` (public) → **bare** `{ featuredPrograms: CatalogItem[], stats:{programs, students, certificatesIssued} }`.
- [ ] `LandingApi.getPageData()` currently hard-returns `null` (fallback to static).
      Replace with a real fetch; **rework `landing.model`/`landing.dto`**: the new
      payload is `featuredPrograms + stats`, **not** the old `cohortDate /
graduatesCount / insightPosts` shape (those have no backend — keep static or drop).
- [ ] This supersedes my planned "Landing featured via `GET /catalog`" — use
      `GET /landing.featuredPrograms` instead (`featuredPrograms` are `CatalogItemDto`,
      same shape my `PublicCatalogStore` already maps).

### A7. Dashboard (student) — reconsider composition (BE-I-07 now partially exists)

- [ ] The plan said "compose, no analytics." Now `GET /insights` gives real
      student aggregates — fold it into the dashboard overview instead of composing
      everything from `/learning/progress` + `/payments/transactions`.
- [ ] Real-exam history now exists: `GET /exam/attempts?cursor&limit` →
      `{ data, meta.pagination }`, item `{ id, examTitle, program, score, passed, submittedAt, durationSeconds, status, lateFlag }` (BE-I-17). Add a real-exam
      results widget/list (previously only mock history existed).

---

## B. Admin app — new pages now buildable

### B1. Curriculum (BE-I-13) — the remaining blocked admin page

- [ ] `GET /admin/certs/:id/curriculum` → `{ data: <modules+lessons, all statuses, full fields incl. translations> }` (content_creator / learning_admin).
- [ ] Full module/lesson CRUD already existed (`POST/PATCH/DELETE /admin/modules`,
      `/admin/lessons`); this read unblocks list/pre-fill/reactivate. Build the page.

### B2. Certificate revocation (BE-I-15) — the other remaining blocked admin page

- [ ] `GET /admin/certs/issued?…` → `{ data, meta.pagination }`, item
      `{ id (internal uuid), certId (public id, nullable), userId, studentName, program, programCode, issuedAt, status }` (super_admin / learning_admin).
- [ ] `PATCH /admin/certs/issued/:id/revoke` already existed — now the revoke `id`
      is discoverable. Build the list + revoke page.

### B3. Admin staff management (BE-I-03) — new page

- [ ] `/admin/staff` (super_admin only): `POST` create, `GET` list (`ListStaffQuery`),
      `GET /:id`, `PATCH /:id`, `POST /:id/deactivate`. See
      `admin-staff/dto/*` for `CreateStaffDto` / `UpdateStaffDto` / `StaffResponseDto`.
- [ ] New feature/page + nav item (super_admin only).

### B4. Promo-code CRUD (BE-I-05) — new page

- [ ] `/admin/promo-codes` (super_admin / finance_admin): `POST`, `GET` (list),
      `GET /:id`, `PATCH /:id`, `DELETE /:id`. See `payment/dto/promo-admin.dtos.ts`.
- [ ] New feature/page + nav item; gate to super_admin / finance_admin.

### B5. Lesson-quiz authoring (BE-I-06) — extends curriculum

- [ ] `/admin/lessons/:lessonId/quizzes` (POST/GET), `/admin/quizzes/:quizId`
      (PATCH/DELETE), `/admin/quizzes/:quizId/questions` (POST),
      `/admin/quizzes/:quizId/questions/:questionId` (PATCH/DELETE). Authoring view
      exposes `correctAnswer`. See `learning/dto/quiz.dtos.ts`.
- [ ] Build under the curriculum page (per-lesson quiz editor).

### B6. Admin dashboard metrics (BE-I-07) — enrich the admin home

- [ ] `GET /admin/dashboard/overview?…` (super_admin / finance_admin) → **bare**
      `{ revenue:{total,currency,last30Days,monthly[]}, transactions:{completed,pending,failed,refunded}, enrollments:{total,last30Days}, students:{total,newLast30Days}, exams:{attempts,passed,passRate,avgScore}, certificates:{issued}, topPrograms[] }`.
- [ ] The admin home currently shows "no metrics (BE-I-07)". Wire real widgets
      (revenue chart, KPI tiles) gated to super_admin / finance_admin.

### B7. Exam publish `reasons[]` (BE-I-14) — small fix

- [ ] The publish gate now returns structured `reasons[]` in the RFC-7807 body.
      Update `AdminExamQuestionsStore` / exam-authoring to surface **which** checks
      failed instead of the generic "not publishable" message (the `docs` note said
      this was dropped by the exception filter — now available).

### B8. Catalog admin form — card fields (BE-I-04) + `?active` fix

- [ ] `Create/UpdateCertificateDto` now accept `badgeImageUrl`, `track`,
      `level` (enum `CertLevel`), `durationHours`, `syllabusUrl`. Add these fields to
      `admin-catalog-form.page` (were intentionally omitted). Update `catalog.dto/model/mappers`.
- [ ] `?active=false` now parses correctly (was flipped to `true`). The admin
      catalog **Inactive** filter now works server-side — re-test; likely no FE code
      change, but remove any client-side workaround if one exists.

---

## C. Auth / infrastructure

### C1. Admin login — two-step OTP (new) — **touches `core/auth`** (needs security review)

- [ ] `POST /auth/admin/login` `{ email, password }` now returns **either**
      `LoginResponseDto` (OTP off) **or** `AdminLoginChallengeResponseDto`
      `{ otpRequired: true, challengeId, expiresInSeconds }` (OTP on — default in
      prod/staging). No cookie/tokens on the challenge.
- [ ] `POST /auth/admin/login/otp` `{ challengeId, code (6 digits) }` → `LoginResponseDto`
  - sets refresh cookie. Single-use, 5-min expiry, ≤5 attempts.
- [ ] Admin login page: after step 1, if `otpRequired`, show a 6-digit OTP entry
      (countdown to `expiresInSeconds`, resend = re-run step 1). `AuthStore.loginAdmin`
      must branch on the response type.
- [ ] Handle new statuses: **503** "OTP email could not be sent — retry"; **401**
      invalid/expired/exhausted challenge.
- [ ] Verify admin **refresh/logout**: dedicated `POST /auth/admin/refresh` and
      `POST /auth/admin/logout` now exist. Confirm whether admin sessions must use
      these (vs. the shared `/auth/refresh` that branched on token `type`); update
      `AuthApi` if so. Any change here is a `core/auth`/`core/http` change → architect
  - security review (CLAUDE.md §8, §13).

### C2. Cookie consent (BE-042) — new banner

- [ ] `POST /consent` (public) `{ categories: Record<string,boolean>, policyVersion }`
      — audit trail only (the one backend cookie is strictly-necessary). Add a
      consent banner; record the choice. This is an **"accept terms/consent"** action
      → keep it explicit/user-driven; choose privacy-preserving defaults.

---

## D. Cross-cutting / cleanup

- [ ] Update [`backend-blockers-report.md`](./backend-blockers-report.md): move
      BE-I-03/05/06/07/08/13/14/15/16/17/18/19/20 out of "blocked" (now resolved);
      keep only anything still open (e.g. `BE-I-11` BlogArticle, if still dead).
- [ ] Update [`backend-analysis.md`](./backend-analysis.md) endpoint inventory +
      Backend Issues Report statuses, and `implementation-progress.md` Phase-4 map
      (Certificates / Notifications / Insights flip from ⛔ to buildable; Curriculum /
      Cert-revocation admin pages unblocked).
- [ ] Response-envelope reminder (BE-I-01) — map per endpoint: bare
      (`/insights`, `/landing`, `/me/*`, avatar-url, unread-count), `{ data }`
      (`/me/certificates`, admin curriculum, notification read), `{ data, meta.pagination }`
      (notifications list, `/exam/attempts`, issued-certs).
- [ ] i18n: every new screen needs en/fr/ar keys; Arabic still needs pro review
      (CLAUDE.md §9).
- [ ] `avatarUrl` handling: keep it a plain URL on read; the upload flow (A1) is
      the only new write path.

---

## Suggested order (updated 2026-07-16 — admin-first)

**✅ Done:** A1, A3, A4, A5 (A5 staged, not committed). See the Status section at top.

**▶ Now — Admin app (section B), all backend-ready:**

1. **B6 — Admin dashboard analytics** (`GET /admin/dashboard/overview`) — wire the
   admin home KPIs + revenue chart; gate to super_admin / finance_admin. Full DTO
   shape in [`backend-analysis.md` → "Endpoints added"](./backend-analysis.md). A
   chart lib is already in the bundle (apexcharts) — reuse the admin patterns.
2. **B1 — Curriculum** (`GET /admin/certs/:id/curriculum`) — list/edit modules +
   lessons (all statuses, full fields); existing module/lesson CRUD already wired.
3. **B2 — Certificate revocation** (`GET /admin/certs/issued` + existing revoke).
4. **B3 — Admin staff** (`/admin/staff`, super_admin only).
5. **B4 — Promo codes** (`/admin/promo-codes`, super/finance admin).
6. **B5 — Lesson-quiz authoring** (under the B1 curriculum page).
7. **B7 / B8 — small fixes** — surface exam publish `reasons[]`; add catalog card
   fields (`badgeImageUrl`/`track`/`level`/`durationHours`/`syllabusUrl`) + re-test
   the `?active=false` filter.

**Then — remaining user-facing:** A6 Landing rewire, A7 Dashboard fold-in
(`GET /exam/attempts` + `/insights`), A2 Settings delete/export, C2 cookie consent.

**Last — C1 Admin OTP login** (`core/auth` change; architect + security review).
