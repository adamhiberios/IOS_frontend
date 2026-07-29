# Frontend change checklist — backend blockers now fixed

> Derived from the **IOS_Backend** commits of 2026-07-12 → 2026-07-13 (the
> backend team's response to [`backend-blockers-report.md`](./backend-blockers-report.md)).
> Every referenced endpoint is under `/api/v1`. Response envelopes are still
> per-endpoint (BE-I-01): **bare** DTO, `{ data }`, or `{ data, meta.pagination }`
> (cursor) — noted per item. Reuse the established data-access layering
> (`dto → model → mappers → api → store`) and `@core/http` `toPage`/`toHttpParams`/
> `problemDetailMessage`.
> Created 2026-07-13.

## Status (updated 2026-07-27) — ⛔ landing regression + Stage 2 planned

> **Read this first.** Backend HEAD is now **`7160f11`** and it moved three times
> since the 2026-07-25 pass:
>
> - ⛔ **`GET /landing` was deleted** (`66a7632`) — `landing.api.ts:21-25` still
>   calls it, so the landing page **404s today**. Filed **BE-I-30**; the fix is
>   **Slice 1** of [`cms-frontend-plan.md`](./cms-frontend-plan.md).
> - ✅ **BE-I-22 fixed** (`66a7632`) — `GET /exam/attempts/:attemptId/review`.
>   FE follow-up: re-enable the exam result page's review section.
> - ✅ **BE-I-26 fixed** (`2976be0`) — `POST /contact` + `/admin/contact` inbox.
>   The CMS `contact_form` section is now buildable (plan Slices 6 and 10).
> - 🆕 **SEO module** (`43bd2d8`) — `sitemap.xml`/`robots.txt` (edge rewrite, not
>   an FE route) and `seo.jsonLd` on CMS/blog/catalog responses.
> - 🆕 **Catalog image upload** (`66a7632`) — `POST /admin/catalog/:id/image-upload-url`
>   narrows **BE-I-27** to CMS sections + blog bodies.
>
> Also closed on the frontend since 2026-07-25: **E1/BE-I-29** (`1c2fcdb`), the
> **student dashboard overview** rewire (`4a11ae9`) and the admin dashboard
> date-window + student-detail enrichment (`1c2fcdb`). §E below is annotated
> accordingly. **All CMS work now lives in
> [`cms-frontend-plan.md`](./cms-frontend-plan.md)** (11 slices, Stage 2) — §E2/E3
> are kept as the endpoint-level summary only.

## Status (updated 2026-07-25) — **every A/B/C item is DONE, including C1**

Verified against frontend HEAD `904a478` (`feat/real-backend-integration`) and
backend HEAD `72a711c`. Sections A, B, C and D below are ticked with the commit
that shipped each item; the live backlog is in
[`implementation-progress.md` → Remaining tasks](./implementation-progress.md#remaining-tasks-high-level).

**Committed since the 2026-07-22 rescan** — the entire "net-new features" backlog
that the block below still describes as pending:

| Item                             | Commit(s)                                  | Note                                                                 |
| -------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| **Real-exam engine (student)**   | `b951242`                                  | ⚠️ architect review pending; degraded by BE-I-22/23/24               |
| **Learning / courses (student)** | `172f35a`                                  | curriculum → lesson → quiz → complete → progress                     |
| **Mock-exam runner (student)**   | `37b5c57`, `f4752ad`, `6d9e406`, `904a478` | data-access, runner/result UI, history page, `/mock` Socket.IO timer |
| **Email verification**           | `9e06730`                                  | `complete-account` wizard still a stub — **BE-I-25**                 |
| **C1 — Admin OTP login**         | `ae6ae44`                                  | ⚠️ **security review pending** (`core/auth`)                         |

**No longer backend-blocked:** **BE-I-21** (blog create read-after-write) was
fixed by the backend on 2026-07-21 (`30bfff5`, plus the list-query fix `d7a78e6`).
The FE `admin/blog` (`5404e77`) and public blog (`1940501`) need **no code change** —
only an E2E re-test against api-dev.

**🆕 New work discovered on 2026-07-25 — see [§E](#e-new-since-the-checklist-was-written-2026-07-25):**
the backend merged a whole **CMS module** (`3e52625`) with no FE consumer, made
lesson `contentText` **required** (**BE-I-29** — since fixed by `1c2fcdb`), and
added an analytics date window + richer admin student detail (`72a711c` — since
adopted in `1c2fcdb`).

**Still backend-blocked** *(as of 2026-07-27 — narrowed since this block was
written)*: **BE-I-25** (no DOB → `complete-account`) and **BE-I-27/28** (CMS media
upload / draft preview). **BE-I-22** and **BE-I-26** were fixed on 2026-07-26/27 —
see the current status block at the top. Full triage:
[`backend-blockers-report.md`](./backend-blockers-report.md).

---

## Status (2026-07-20 snapshot) — admin pivot COMPLETE

> 📕 **Historical — superseded by the 2026-07-25 status block above.** Kept for the
> commit map. Its two "not yet in the UI" blog items shipped as `1940501`
> (public) and `5404e77` (admin); C1 shipped as `ae6ae44`.

**Done (user-facing):** **A1** avatar upload, **A3** earned-certificates list
(`features/credentials`), **A4** notifications + navbar badge, **A5** student
insights (Dashboard overview) — all committed.

**✅ Admin pages (section B) — ALL BUILT & COMMITTED** on
`feat/real-backend-integration`: **B6** dashboard analytics (`9559ec1`), **B1**
curriculum (`7268d26`), **B2** cert revocation (`451af2a`), **B3** staff
(`6f09077`), **B4** promo codes (`3ea7e28`), **B5** lesson-quiz (`0d95e6e`, restyle
`d1ce3e8`), **B7** publish `reasons[]` (`0db202e`), **B8** catalog card fields
(`9b18571`).

**🆕 New backend surface (post-2026-07-14) — NOT yet in the UI:** **BE-I-11 Blog
module** shipped (`334d0c6`). Two new FE items:

- **Blog-public rewire** — `features/insights` public blog (its `getPosts()`
  currently returns `null`) → `GET /blog` (`{data,meta.pagination}`, cursor) +
  `GET /blog/:slug` (detail + `seo`). Public, localized by `X-Lang`.
- **Blog-admin** (new page) — `admin/blog` CRUD + publish/unpublish/translations
  (content_creator/learning_admin; publish/delete = learning_admin). Same
  data-access + authoring-dialog patterns as the B-pages. See
  [`backend-analysis.md` → "Blog endpoints (BE-I-11)"](./backend-analysis.md).

**Still pending (user-facing):** ~~A6, A7, A2, C2~~ — **all committed 2026-07-22**
(see the current-status block at the top). Only **C1** admin OTP login remains
(LAST — `core/auth`, security review).

**Later BE changes to honour:** exam domain-state conflicts return **409** (not
422/400) — `5c11460`; key off `code`, not status. **Week-9 i18n** (`be902fe`/
`d67d7ff`): backend `SUPPORTED_LOCALES = en/tr/fr/es/ar/de`, and validation errors

- emails now localized by `X-Lang` — app UI stays **en/fr/ar**; the extra backend
  locales are authoring targets only. Audit hardening (`f78e76b`) / health-sentry
  gating (`a0d2409`) / dep bumps (`f639a85`) — no FE impact.

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

### A1. Profile — wire real avatar upload (BE-I-08) — ✅ DONE (`242a11d`)

- [x] New endpoint: `POST /me/avatar-upload-url` `{ contentType }` (one of
      `image/png|image/jpeg|image/webp`) → **bare** `{ uploadUrl, key, expiresInSeconds }`.
- [x] Flow: request presigned URL → browser `PUT`s the file bytes to `uploadUrl`
      **with the exact same `Content-Type`** → then `PATCH /me { avatarUrl: <key or resolved URL> }`.
- [x] Restore the **"Change image profile"** button removed in `edit-profile.page`
      (it was cut for BE-I-08); add a file picker + client-side type/size guard.
- [x] The `PUT` goes to object storage, not the API — **bypass `authInterceptor`
      / `X-Lang`** for that request (use a bare `HttpClient` call or `SKIP_AUTH`), and
      do not send credentials to the storage host.
- [x] Note: image upload is a "Prohibited/permission" area only for _credentials_ —
      a normal file upload is fine, but keep it user-initiated.
- [x] Update `docs/implementation-progress.md` Profile section (drop the BE-I-08
      "avatar is plain URL only" caveat).

### A2. Settings — delete account + data export (BE-I-19 / BE-042) — ✅ DONE (`c659335`)

- [x] `POST /me/delete` `{ password }` (step-up re-auth) — **not** `DELETE /me`.
      On success the account is anonymised-in-place → treat as a forced logout
      (clear session, route to a farewell/login page). Confirm dialog + password field.
- [x] `GET /me/export` — GDPR data export (bare payload). Add a "Download my data"
      action in Settings; trigger a client download of the returned JSON.
- [x] Un-park the Settings "delete account" control (was hidden per BE-I-19).

### A3. Certificates list (BE-I-16) — ✅ DONE (`3bed4c1`, shipped as `features/credentials` at `/dashboard/credentials`)

- [x] `GET /me/certificates` → **`{ data: [...] }`** (no pagination). Item:
      `{ certId (public id, nullable), program, programCode, issuedAt, status:'valid'|'revoked', certificateUrl, qrUrl, verifyUrl }`.
- [x] Build `features/certificates` data-access + the list page (earned certs,
      download PDF / QR / verify links). Keep the existing public
      `GET /verify/:certId` "verify a certificate" tool.
- [x] Remove the ⛔ stub; add the nav item back.

### A4. Notifications (BE-I-18) — ✅ DONE (`99917c8`)

- [x] `GET /notifications?cursor&limit&unreadOnly` → `{ data, meta.pagination }`
      (cursor). Item: `{ id, type, title (localized), body (localized), data (params object), read, createdAt }`.
- [x] `GET /notifications/unread-count` → bare `{ count }`.
- [x] `POST /notifications/:id/read` → `{ data: NotificationItem }` (idempotent).
- [x] `POST /notifications/read-all` → `{ updated: number }`.
- [x] Build `features/notifications` data-access + list page (mark-read,
      mark-all-read, unreadOnly filter) and a **navbar unread badge** (poll
      `unread-count`, or refresh on route change — no WS for notifications).
- [x] `title`/`body` arrive already localized (server renders i18n) — send `X-Lang`
      (already wired); don't re-translate. `data` carries params (e.g. `verifyUrl`)
      for deep-linking.

### A5. Insights (student) (BE-I-20a / BE-I-07) — ✅ DONE (`0272e27`, surfaced on the Dashboard overview; no standalone page per reviewer)

- [x] `GET /insights` (student only; admins 403) → **bare**
      `{ enrolledPrograms, completedLessons, inProgressPrograms, realExam:{attempts,passed,passRate,avgScore,bestScore}, mockExam:{attempts,avgScore}, certificatesEarned }`.
- [x] Rewire `features/insights` (currently targets a removed mock) to this shape.
- [x] Note `passRate` is a fraction (0–1) — format as %.

### A6. Landing dynamic blocks (BE-I-20) — ✅ DONE (`469f429`)

- [x] `GET /landing` (public) → **bare** `{ featuredPrograms: CatalogItem[], stats:{programs, students, certificatesIssued} }`.
- [x] `LandingApi.getPageData()` currently hard-returns `null` (fallback to static).
      Replace with a real fetch; **rework `landing.model`/`landing.dto`**: the new
      payload is `featuredPrograms + stats`, **not** the old `cohortDate /
graduatesCount / insightPosts` shape (those have no backend — keep static or drop).
- [x] This supersedes my planned "Landing featured via `GET /catalog`" — use
      `GET /landing.featuredPrograms` instead (`featuredPrograms` are `CatalogItemDto`,
      same shape my `PublicCatalogStore` already maps).

### A7. Dashboard (student) — ⚠️ PARTLY DONE (`554fbe6` + `0272e27`) — the overview's cards/charts still read the hardcoded `DashboardStore`; see IP task 4

- [x] The plan said "compose, no analytics." Now `GET /insights` gives real
      student aggregates — fold it into the dashboard overview instead of composing
      everything from `/learning/progress` + `/payments/transactions`.
- [x] Real-exam history now exists: `GET /exam/attempts?cursor&limit` →
      `{ data, meta.pagination }`, item `{ id, examTitle, program, score, passed, submittedAt, durationSeconds, status, lateFlag }` (BE-I-17). Add a real-exam
      results widget/list (previously only mock history existed).

---

## B. Admin app — new pages now buildable

### B1. Curriculum (BE-I-13) — ✅ DONE (`7268d26`)

- [x] `GET /admin/certs/:id/curriculum` → `{ data: <modules+lessons, all statuses, full fields incl. translations> }` (content_creator / learning_admin).
- [x] Full module/lesson CRUD already existed (`POST/PATCH/DELETE /admin/modules`,
      `/admin/lessons`); this read unblocks list/pre-fill/reactivate. Build the page.

### B2. Certificate revocation (BE-I-15) — ✅ DONE (`451af2a`)

- [x] `GET /admin/certs/issued?…` → `{ data, meta.pagination }`, item
      `{ id (internal uuid), certId (public id, nullable), userId, studentName, program, programCode, issuedAt, status }` (super_admin / learning_admin).
- [x] `PATCH /admin/certs/issued/:id/revoke` already existed — now the revoke `id`
      is discoverable. Build the list + revoke page.

### B3. Admin staff management (BE-I-03) — ✅ DONE (`6f09077`)

- [x] `/admin/staff` (super_admin only): `POST` create, `GET` list (`ListStaffQuery`),
      `GET /:id`, `PATCH /:id`, `POST /:id/deactivate`. See
      `admin-staff/dto/*` for `CreateStaffDto` / `UpdateStaffDto` / `StaffResponseDto`.
- [x] New feature/page + nav item (super_admin only).

### B4. Promo-code CRUD (BE-I-05) — ✅ DONE (`3ea7e28`)

- [x] `/admin/promo-codes` (super_admin / finance_admin): `POST`, `GET` (list),
      `GET /:id`, `PATCH /:id`, `DELETE /:id`. See `payment/dto/promo-admin.dtos.ts`.
- [x] New feature/page + nav item; gate to super_admin / finance_admin.

### B5. Lesson-quiz authoring (BE-I-06) — ✅ DONE (`0d95e6e`, restyle `d1ce3e8`)

- [x] `/admin/lessons/:lessonId/quizzes` (POST/GET), `/admin/quizzes/:quizId`
      (PATCH/DELETE), `/admin/quizzes/:quizId/questions` (POST),
      `/admin/quizzes/:quizId/questions/:questionId` (PATCH/DELETE). Authoring view
      exposes `correctAnswer`. See `learning/dto/quiz.dtos.ts`.
- [x] Build under the curriculum page (per-lesson quiz editor).

### B6. Admin dashboard metrics (BE-I-07) — ✅ DONE (`9559ec1`) — see §E4 for the new `from`/`to` window

- [x] `GET /admin/dashboard/overview?…` (super_admin / finance_admin) → **bare**
      `{ revenue:{total,currency,last30Days,monthly[]}, transactions:{completed,pending,failed,refunded}, enrollments:{total,last30Days}, students:{total,newLast30Days}, exams:{attempts,passed,passRate,avgScore}, certificates:{issued}, topPrograms[] }`.
- [x] The admin home currently shows "no metrics (BE-I-07)". Wire real widgets
      (revenue chart, KPI tiles) gated to super_admin / finance_admin.

### B7. Exam publish `reasons[]` (BE-I-14) — ✅ DONE (`0db202e`)

- [x] The publish gate now returns structured `reasons[]` in the RFC-7807 body.
      Update `AdminExamQuestionsStore` / exam-authoring to surface **which** checks
      failed instead of the generic "not publishable" message (the `docs` note said
      this was dropped by the exception filter — now available).

### B8. Catalog admin form — card fields (BE-I-04) + `?active` fix — ✅ DONE (`9b18571`)

- [x] `Create/UpdateCertificateDto` now accept `badgeImageUrl`, `track`,
      `level` (enum `CertLevel`), `durationHours`, `syllabusUrl`. Add these fields to
      `admin-catalog-form.page` (were intentionally omitted). Update `catalog.dto/model/mappers`.
- [x] `?active=false` now parses correctly (was flipped to `true`). The admin
      catalog **Inactive** filter now works server-side — re-test; likely no FE code
      change, but remove any client-side workaround if one exists.

---

## C. Auth / infrastructure

### C1. Admin login — two-step OTP — ✅ BUILT (`ae6ae44`) — ⚠️ **SECURITY REVIEW STILL PENDING** (`core/auth`)

- [x] `POST /auth/admin/login` `{ email, password }` now returns **either**
      `LoginResponseDto` (OTP off) **or** `AdminLoginChallengeResponseDto`
      `{ otpRequired: true, challengeId, expiresInSeconds }` (OTP on — default in
      prod/staging). No cookie/tokens on the challenge.
- [x] `POST /auth/admin/login/otp` `{ challengeId, code (6 digits) }` → `LoginResponseDto`
  - sets refresh cookie. Single-use, 5-min expiry, ≤5 attempts.
- [x] Admin login page: after step 1, if `otpRequired`, show a 6-digit OTP entry
      (countdown to `expiresInSeconds`, resend = re-run step 1). `AuthStore.loginAdmin`
      must branch on the response type.
- [x] Handle new statuses: **503** "OTP email could not be sent — retry"; **401**
      invalid/expired/exhausted challenge.
- [x] Verify admin **refresh/logout**: dedicated `POST /auth/admin/refresh` and
      `POST /auth/admin/logout` now exist. Confirm whether admin sessions must use
      these (vs. the shared `/auth/refresh` that branched on token `type`); update
      `AuthApi` if so. Any change here is a `core/auth`/`core/http` change → architect
  - security review (CLAUDE.md §8, §13).

### C2. Cookie consent (BE-042) — ✅ DONE (`6fddf8e`)

- [x] `POST /consent` (public) `{ categories: Record<string,boolean>, policyVersion }`
      — audit trail only (the one backend cookie is strictly-necessary). Add a
      consent banner; record the choice. This is an **"accept terms/consent"** action
      → keep it explicit/user-driven; choose privacy-preserving defaults.

---

## D. Cross-cutting / cleanup

- [x] Update [`backend-blockers-report.md`](./backend-blockers-report.md) — done
      2026-07-25: the end-to-end-resolved items were removed, the file was reopened
      with the seven genuinely-active stoppers (BE-I-22…28) and a triage legend.
- [x] Update [`backend-analysis.md`](./backend-analysis.md) endpoint inventory +
      Backend Issues Report statuses and the `implementation-progress.md` Phase-4
      map — done 2026-07-25 (BE-I-21 → ✅ Resolved; BE-I-26/27/28/29 filed; CMS
      inventory added as §6.9b).
- [x] Response-envelope reminder (BE-I-01) — mapped per endpoint across every
      shipped feature. **New:** the CMS reads are `{ data, meta:{ locale } }`.
- [ ] i18n: every new screen needs en/fr/ar keys; **Arabic across all shipped
      screens still needs professional review** (CLAUDE.md §9) — the largest open
      cross-cutting debt.
- [x] `avatarUrl` handling: plain URL on read; the A1 upload flow is the only write
      path.
- [ ] **Testing** remains deferred per SOW §6.2.14 — nothing built since 2026-07-13
      has been runtime-tested against api-dev (exam/mock/courses need a real
      enrolled student + token).

---

## E. New since the checklist was written (2026-07-25)

Discovered by reconciling against backend HEAD `72a711c`. These are **not**
"unblock" items — three are net-new surfaces and one is a regression the backend
introduced. Detail:
[`implementation-progress.md` → Remaining tasks](./implementation-progress.md#remaining-tasks-high-level)
and [`backend-analysis.md` §6.9b](./backend-analysis.md#69b-latest-backend-sync-2026-07-25b--cms-module-blog-fix-analytics-window).

### E1. BE-I-29 — lesson `contentText` is now required — ✅ DONE (`1c2fcdb`, 2026-07-26)

- [ ] `72a711c` made `contentText` required + non-empty on `CreateLessonDto`
      (`IOS_Backend/src/modules/learning/dto/lesson.dtos.ts:41-49`). The FE omits
      the key when the field is blank
      (`features/admin/data-access/curriculum.mappers.ts:83-94`) → **400 today**.
- [ ] Mark the lesson-content control required in `admin-curriculum.page.ts`
      (`lessonForm`, ~`:526`), add the en/fr/ar validation string, and always send
      `contentText` from `toCreateLessonBody()`. Update on `UpdateLessonDto` is
      optional-but-non-blankable — the current update body already always sends it.

### E2. CMS-PUBLIC — render CMS pages on the marketing site — **now planned as Slices 2–8 of [`cms-frontend-plan.md`](./cms-frontend-plan.md)**

- [ ] `GET /cms/pages/:slug` (public) → `{ data:{ slug, title, locale, direction,
  sections[], seo{…} }, meta:{ locale } }`; PUBLISHED-only (404 otherwise).
- [ ] `GET /cms/globals/:key` (`nav` | `footer` | `announcement`) → `{ data:{ key,
  config, content, locale, direction, fallbackUsed } }`.
- [ ] Build a section renderer for the **16 typed sections** (`hero`,
      `indicator_band`, `feature_cards`, `logo_cloud`, `rich_band`, `level_matrix`,
      `steps_timeline`, `cta_band`, `faq`, `content_columns`, `certifications`\*,
      `journal`\*, `testimonials`, `stats`, `media_embed`, `contact_form`). \* the
      two dynamic ones arrive pre-hydrated (`data.certifications[]` / `data.articles[]`)
      — do **not** refetch catalog/blog for them.
- [ ] Honour `locale`/`direction`/`fallbackUsed` per block and inject the `seo`
      block into `<head>`.
- [x] ~~**Decide first:** `/landing` vs `/cms/pages/home`~~ — **settled by the
      backend on 2026-07-26**: `GET /landing` was deleted (`66a7632`, **BE-I-30**).
      CMS owns static home content, `GET /catalog` owns featured programs,
      `GET /analytics/public-stats` owns the counters.
- [x] ~~**BE-I-26:** `contact_form` has no submission endpoint~~ — **fixed**
      (`2976be0`). Wire `POST /contact`: honeypot field `company` (render visually
      hidden, always send empty), **429** when throttled (default 3 / 60 s), 400 for
      validation, and treat **any 201 as success**. Plan Slice 6.

### E3. CMS-ADMIN — page / section / globals editor — **now planned as Slices 9–10 of [`cms-frontend-plan.md`](./cms-frontend-plan.md)** (+ the new `/admin/contact` inbox)

- [ ] Pages: `POST/GET/PATCH /admin/cms/pages[/:id]`, `PATCH …/translations`,
      `POST …/publish|unpublish` (learning_admin), `DELETE …/:id` (archive;
      `isSystem` → 409 `SYSTEM_PAGE_PROTECTED`). Slug is immutable once PUBLISHED
      (409 `SLUG_LOCKED`) — mirror the blog authoring UX.
- [ ] Sections: `POST /admin/cms/pages/:id/sections`, `PATCH/DELETE
  /admin/cms/sections/:sid`, `PATCH …/translations`, `PUT
  /admin/cms/pages/:id/sections/order` `{ order: uuid[] }` (400
      `SECTION_NOT_IN_PAGE`). `config`/`content` are validated per section type.
- [ ] Globals: `GET /admin/cms/globals/:key` (any admin) · `PATCH` (learning_admin,
      upsert) · `PATCH …/translations`.
- [ ] Publish gate returns 409 `CMS_PAGE_NOT_PUBLISHABLE` with
      `errors[]=[{field:"_root",code:"NOT_PUBLISHABLE",…}]` — surface the reasons
      like B7 does, not a generic message.
- [ ] **BE-I-27 (narrowed):** still no upload for CMS section images or blog
      bodies — pasted URLs, say so in the UI. Catalog certificate images **do** have
      `POST /admin/catalog/:id/image-upload-url` now (`66a7632`) — separate task.
- [ ] **BE-I-28:** no draft preview — structural preview only; do not imply WYSIWYG.

### E4. Backend additions worth adopting (`72a711c`) — ✅ both DONE (`1c2fcdb`)

- [ ] **Admin dashboard date window:** `GET /admin/dashboard/overview` now accepts
      `from`/`to` (ISO), which override `months`. `dashboard.api.ts:27` sends
      `months` only — add a range picker to B6.
- [ ] **Admin student detail:** the response now also carries `certificates[]`,
      `attempts[]` and `exams.{assigned,purchases}`; the FE maps `counts` only
      (`users.model.ts:20-31`). Additive — nothing breaks; optional enrichment.

### E5. Carried-over FE debt (not backend-driven)

- [x] ~~**Student dashboard overview** on hardcoded `DashboardStore`~~ — ✅ done
      (`4a11ae9`, 2026-07-26): `validCertifications` / `monthlyScores` /
      `examSummary` / `learningCard` now come from real learning + mock data.
- [ ] **Legacy `/dashboard/certificates` demo pages** — `certificates.page`,
      `cert-detail.page`, `cert-session.page` read hardcoded `ESM_P_*` fixtures
      (`certificates.store.ts:356-644`), duplicating the real `/dashboard/credentials`
      (A3) and the real mock runner. Rewire or retire — product decision.
- [ ] **Blog E2E re-test** — BE-I-21 is fixed (`30bfff5`); verify create → edit →
      translations → publish → public read against api-dev. No FE change expected.
- [ ] **`complete-account` wizard** — still a stub (`complete-account.page.ts:947`);
      **blocked by BE-I-25** (no DOB field) plus a `ProfileApi` boundary decision.
- [x] ~~**Exam-authoring preview**~~ — ✅ **DONE 2026-07-29**. Worth knowing: the
      page already had a "Preview" toggle, but it re-rendered the *authoring* data
      with the answer ticks hidden while still showing `marks` and positions no
      candidate sees. It now fetches `GET /admin/exams/:examId/preview`, so the
      preview is the paper the exam engine actually serves.

### E6. New on 2026-07-26/27 (backend `66a7632`, `43bd2d8`, `2976be0`)

- [ ] ⛔ **BE-I-30 — landing regression (P0).** `GET /landing` was deleted; repoint
      `LandingApi` (`landing.api.ts:21-25`) to **`GET /analytics/public-stats`**
      (bare `{ stats:{ programs, students, certificatesIssued } }`) and compose
      featured programs from `GET /catalog` via the existing `PublicCatalogStore`.
      Reshape `landing.dto/model/mappers`; keep the static fallback.
      = **Slice 1** of [`cms-frontend-plan.md`](./cms-frontend-plan.md).
- [ ] **Real-exam answer review (BE-I-22 fixed).** Add
      `GET /exam/attempts/:attemptId/review` to `exam.api.ts` and re-enable the
      review section on `exam-result.page.ts` (commented out, not deleted, in
      `b951242`). Owner-only; **422** while the attempt is not terminal; response
      carries `options[].isCorrect`, `selectedOptionId`, `correctOptionId`,
      per-question `isCorrect`, `explanation`.
- [x] ~~**Catalog image picker (BE-I-27 narrowed).**~~ — ✅ **DONE 2026-07-29**
      (`components/cert-image-upload.ts` + `catalog.{dto,model,mappers,api}.ts`).
      `requiredHeaders` echoed in full; storage PUT goes through an
      interceptor-free `HttpClient(HttpBackend)` as A1 does. **Note:** the
      certificate stores `publicUrl` (not the `key`, unlike A1 — the certificates
      bucket is public-read), and uploading needs a **saved** certificate because
      the endpoint 404s an unknown id, so the picker is hidden on the create form.
- [ ] **Render `seo.jsonLd`** on blog and catalog detail pages (`blog.service.ts:550`,
      `catalog.service.ts:461`) into `<script type="application/ld+json">`. CMS pages
      are covered by plan Slice 5.
- [ ] **Infra (not FE):** `GET /sitemap.xml` and `GET /robots.txt` are served under
      `/api/v1` — raise the edge/CDN rewrite to the site root with infra. Non-prod
      `robots.txt` is a blanket `Disallow: /` by design.

---

## Suggested order (updated 2026-07-27)

**✅ Done & committed:** A1–A7, B1–B8, C1, C2, BLOG-PUBLIC, BLOG-ADMIN, the four
net-new student/auth features (real exam `b951242`, courses `172f35a`, mock
`37b5c57`/`f4752ad`/`6d9e406`/`904a478`, email verify `9e06730`), **E1/BE-I-29**
(`1c2fcdb`), **E4** (`1c2fcdb`) and the **dashboard overview rewire** (`4a11ae9`).

**▶ Next:**

1. **E6 — BE-I-30 landing fix** (a live public page is 404-ing).
2. **Stage 2 — CMS**, per [`cms-frontend-plan.md`](./cms-frontend-plan.md):
   Slices 2–8 (public renderer → home cutover), then 9–10 (admin editor + contact
   inbox), then 11 (hardening).
3. **E6 — real-exam answer review UI** (BE-I-22 is fixed).
4. **E5 — blog E2E re-test**; `/dashboard/certificates` legacy pages (rewire or retire).
5. **E6 minor** — ~~catalog image picker~~ ✅, ~~exam-authoring preview~~ ✅ (both
   2026-07-29); **`seo.jsonLd` on blog/catalog detail** remains.

**Gating reviews, not build work:** C1 (`ae6ae44`) needs the **security review**
before shipping; the real-exam engine (`b951242`) needs the **architect review**.

> **i18n note:** the backend supports `en/tr/fr/es/ar/de`, but the app UI ships
> **en/fr/ar**. Translation editors (catalog/exam/blog, and now CMS) author against
> backend locales; keep the UI locale set at en/fr/ar unless the SOW changes.
