# Implementation Progress — IOS LMS Frontend ↔ Real Backend

> **Single source of truth for implementation progress.** Updated continuously.
> Last updated: 2026-07-29, against frontend HEAD `4f9e267` and backend HEAD
> `7160f11`. This session: **CMS-ADMIN was built and then rolled back** (only the
> `/admin/contact` inbox was kept, staged), and the two remaining non-CMS admin
> backlog items — **catalog image picker** and **exam student preview** — were
> built. See the first three entries below.

---

### Learning hub de-duplicated — `/dashboard/certificates` wired to real data, `/courses` removed — 🔵 in progress (uncommitted)

**Correcting a mistake in `172f35a`.** That commit added `features/courses` with
three pages — `CoursesIndexPage`, `CurriculumPage`, `LessonPage` — over the real
`/learning/*` endpoints. But a designed learning hub already existed at
`/dashboard/certificates` (`certificates.page` / `cert-detail.page` /
`cert-session.page`), running on hardcoded `ESM_P_*` fixtures. The result was two
parallel hubs for the same job — and they cross-linked each other, which is how
it surfaced. The nav (`dashboard-navbar`, `user-menu-dropdown`) always pointed at
`/dashboard/certificates`, so that is the surface that should have been rewired.

**Done so far:**

- **`cert-session.page.ts`** → `GET /learning/lessons/:id`. Two forced departures
  from the fixture design: the sidebar lists **sibling lessons, not chapters** (a
  lesson is one `contentHtml` blob — there is no chapter structure to navigate),
  and navigation now **changes the URL**, since a lesson is addressable and a
  chapter wasn't. `contentHtml` renders via `[innerHTML]` through Angular's
  sanitizer — never `bypassSecurityTrust*`.
- **Route `:code/session/:materialId` → `:code/session/:lessonId`.** ⚠️ **Breaking
  for old links.** Backend lessons have no slug, so fixture URLs like
  `/dashboard/certificates/ESF/session/session-1-a` no longer resolve — they were
  returning `Validation failed (uuid is expected)` from `ParseUUIDPipe`.
- **`cert-detail.page.ts`** — the Learning Materials list is built from the real
  curriculum, so each row's id is a **lesson UUID**. `:code` (a program code) is
  resolved to a `certId` via `GET /learning/progress`, which doubles as the
  enrolment gate. This was the source of the UUID error above: the page was
  emitting fixture slugs into a route that now expects UUIDs.
- **`certificates.page.ts`** — lists **only real enrolments**. It previously
  rendered a hardcoded `[ESM_P_HEADER]`, which is why it showed certifications
  the student had never enrolled in. The fixture "All certifications" grid (six
  cards with invented scores) was **removed** rather than left showing fake data;
  a genuine browse-all section would come from `PublicCatalogStore`.
- **`/courses` deleted** — `courses/pages/*` and `courses.routes.ts` removed, the
  route dropped from `app.routes.ts`. **`courses/data-access/*` is kept**: that
  layer *is* the real `/learning/*` wiring and is what the certificates pages now
  consume. Inbound links repointed: `cert-progress-card`, `dashboard.store`
  `ctaRoute`, and the three mock pages. Note the dashboard links used `certId`
  while the hub route takes a **program code** — `ValidCertification.code` and
  `CourseProgress.programCode` supplied it.

**Data deliberately omitted rather than invented** (visible gaps, flagged):

- Per-lesson `currentPage` / `totalPages` are `0` — there is no page tracking
  anywhere in the API. `completionPercent` collapses to the boolean `completed`.
- `hasCertificate` is `false` on every row — issuance lives behind
  `GET /me/certificates`, which progress cannot answer.
- `family` / `badgeAsset` **are** derived, reusing `resolveCertFamily` /
  `resolveBadgeAsset` from the dashboard rewire (`4a11ae9`) so both surfaces show
  the same artwork for the same programme.

- **`ESM_P_*` learning fixtures stripped** — `certificates.store.ts` is down from
  **872 → 493 lines**. Removed: `ESM_P_MATERIALS`, `INTRO_PARAGRAPHS`,
  `SHORT_PLACEHOLDER`, `ESM_P_SESSION_1_CHAPTERS`, `ESM_P_SESSIONS`, `ALL_CERTS`,
  `ESM_P_HEADER`, `EPO_A_HEADER`, the `translateActionLabel` helper, and the
  store members they fed (`enrolledCerts`, `allCerts`, `sessions`,
  `sessionByMaterialId`, `openSession`, `setActiveChapter`, `activeChapterId`).
  `CertificatesState` lost `enrolledCerts`/`allCerts`/`sessions` and `CertDetail`
  lost `learningMaterials`.
  **Deliberately kept** (still consumed, no real source yet): the mock-test
  fixtures and the two `ESM_P_DETAIL_*` snapshots that back the detail page's
  Overview charts and mock section. The store is now **detail-page only** — its
  header says so.

- **Overview section rebuilt on real data.** It was the last fixture-driven thing
  a student actually saw, and it was worse than stale: it read
  `ESM_P_DETAIL_*`, so **`/dashboard/certificates/PSM` showed ESM's numbers** —
  same completion %, same charts, same certificate card, on every certificate.
  The breadcrumb had the same bug (`detail()?.code` rendered "ESM-P" on `/PSM`),
  as did the header's "Start Final Test" CTA, which gated on fixture completion
  and so appeared identically everywhere.

  Replaced with three tiles that are all real and all **this** certificate's,
  from `GET /learning/progress`: **completion %**, **lessons completed / total**,
  **lessons remaining** — plus a progress bar and a "continue where you left off"
  card that deep-links to the first incomplete lesson (and flips to the final-exam
  CTA once everything is done).

  **Removed rather than re-sourced**, because nothing backs them: average mock
  score, total learning time, trend delta, the weekly line chart, the exam donut,
  and the certificate award card. Average score and the charts *could* come from
  mock history (precedent: `4a11ae9`), but they belong to the mock-test section,
  not a learning-progress overview — worth revisiting there rather than
  reinstating here. Total time and trend have no backend source at all.

- **Mock test section rebuilt on real data (2026-08-02).** The last fixture
  surface on this page: `ESM_P_MOCK_TEST_STATS`/`ESM_P_MOCK_TEST_HISTORY` — a
  fixed `{5 attempts, 95% best, 46% avg, 10h40m}` and 7 hardcoded rows — were
  shown identically under every certificate, same as the Overview bug above.
  The cert banner at the top of the tab had the same problem one level up:
  both Materials and Mock test rendered `detail()!.certificationCard`, always
  ESM-P's title/badge/completion regardless of which cert was open.

  Replaced with `certificationCard()` — one real computed built from
  `CoursesStore.progress()`, now shared by both tabs — and
  `realMockStats()` / `realMockHistory()`, built by filtering
  `MockStore.history()` (`GET /mock/history`, global across all certs — there
  is no `certId` filter server-side) down to this cert's **submitted**
  attempts. `totalTimeMinutes` is derived from `submittedAt − startedAt` per
  attempt (the backend doesn't return a duration field). `status` maps from
  the advisory `readyForFinal` flag — the closest real equivalent to
  "passed". `issuer`/`isEarned`/`issuedDate`/`expiryDate` on the card follow
  the same "don't invent it" rule as `certificates.page.ts`'s
  `hasCertificate: false` — real issuance data lives behind
  `GET /me/certificates`, which this page doesn't consume.

  **Two functional bugs found and fixed alongside the data, both silent —
  neither ever surfaced in the fixture UI because there was no real attempt
  to click through to:**
  - **"Start mock test" did nothing.** `onStartTest()` navigated to
    `:code/mock-test` with `{ count, time }` query params. The real runner
    (`mock-test.page.ts`) only ever reads `?certId=` (start) or `?attemptId=`
    (resume) — it has no `count`/`time` params to read, because
    `POST /mock/start` doesn't accept them (the backend samples its own
    question set and duration). Without `certId` the runner never called
    `store.start()` and sat on "no active attempt" forever. Fixed by passing
    `certId` instead; `MockTestSettings` and its dialog are left in place
    (harmless, gates the click) but are now documented as collecting values
    the backend has no knob for.
  - **"Show details" on a history row started a new exam** (user-reported).
    It reused the cert-card's `dialogOpen.set(true)` handler — same button,
    same effect — so clicking a past attempt silently launched a fresh one
    instead of showing its answers. `MockTestAttempt` had no field to carry
    the real attempt id back out, because the type predates any real
    attempt existing. Added `attemptId` to `MockTestAttempt`, added a
    `viewAttempt` output to `CertMockTest` fired with that id, and wired it in
    `cert-detail.page.ts` to navigate to `:code/mock-test/result?attemptId=`
    (`MockExamResultPage`, already built for this — `GET /mock/attempts/:id`).

  `MockTestQuestion`/`MockTestOption` (the fixture's local question bank)
  were also removed from `certificates.model.ts` — dead once the mock-test
  fixtures went, and never consumed by the real runner, which samples
  questions from the backend via `MockStore.questions()`
  (`mock.model.ts`'s `MockQuestion`, a separate real type).

  **With this, `CertificatesStore` no longer has any fixture-backed
  `CertDetail` snapshot left to hold.** `certificates.store.ts` is down to a
  single `activeSection` signal (the side-nav's job); everything else the
  detail page needs now comes straight from `CoursesStore` / `MockStore`.
  Removed from `certificates.model.ts`: `CertDetail`, `CertDetailStats`,
  `SessionChapter`, `CertSessionData` (dead since the session-viewer rewire,
  never cleaned up), the `@shared` chart-type re-exports (`MonthlyScore` /
  `WeeklyScore` / `ExamSummary` / `ScoreFilterYear` / `ScoreFilterWeek` — no
  in-feature consumer left), and `CertificatesState.selectedDetail`.
  `CertListCard`/`CertExamResult` were **kept** — `cert-grid-card.ts` (see
  below) still imports them.

**Still open on this rewire:**
- **`cert-grid-card.ts` is now orphaned** — its only consumer was the fixture
  "All certifications" grid. Left in place rather than deleted: it is the
  designed component a real browse-all section (from `PublicCatalogStore`) would
  reuse. Delete it if that section isn't planned.

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 known `prefer-ngsrc`
  warnings) · production build ✓, initial gzip **104.24 kB** (unchanged).
- **Not runtime-tested against api-dev** — needs an enrolled student session
  with at least one submitted mock attempt to see non-empty stats/history.

---

### BE-I-30 landing repoint + real-exam answer review — 🔵 built, awaiting review (uncommitted)

Closes backlog items **0** and **11**. Neither involves CMS.

**1 · BE-I-30 — landing repointed off the deleted `GET /landing`.**

> **Correction to how this was recorded.** Every prior entry said "the landing
> page 404s". It didn't: `f3c425d` had commented out both consumers
> (`store.stats()` and `store.featuredPrograms()`) in the page template, so the
> only symptom was one failing background request per page load, silently
> absorbed. Worth fixing, but it was never a broken screen — the P0 framing
> carried through several documents was wrong.

- `landing.{api,dto,model,mappers}.ts` — `LandingApi` now calls
  `GET /analytics/public-stats` (**wrapped in `stats`**, neither bare nor
  `{ data }`). Counters run through a coercion helper so a malformed field
  renders `0`, not `NaN`, on a public page.
- **Featured programs come from the shared `PublicCatalogStore`**, not a second
  bespoke mapper — the catalog is already loaded for `/certifications`, so this
  reuses that cache. `LandingData.featuredPrograms` was deleted rather than
  re-homed: a second model for the same rows is what drifts.
- The count shown is a **frontend choice now** (`FEATURED_PROGRAM_LIMIT = 3`,
  first N of the catalog's own newest-first order). The deleted endpoint made
  that choice server-side and nothing replaced it; real curation needs a backend
  "featured" flag, not a heuristic here. Flagged in the constant's docs.
- `load()` uses **`Promise.allSettled`**, so a catalog outage can't blank the
  counters and a stats outage can't blank the featured strip. Each source keeps
  its own fallback; `load()` never throws.
- **No CMS work.** Plan Slice 1 is satisfied; the Slice 8 CMS home cutover is
  untouched and still not started.

**2 · Real-exam answer review (BE-I-22, fixed by backend `66a7632`).**

- `exam.{dto,model,mappers,api}.ts` + new `ios-exam-review-page` at
  `/assessments/review/:attemptId`: per-question paper with the answer key, the
  student's pick, right/wrong marking, and unanswered questions called out.
- The 403 / 404 / **422** contract maps to specific copy. 422 matters — it means
  the attempt is still in progress, which would otherwise read as a broken link.
- `ExamReviewOption` is the **only** place `isCorrect` exists in the real-exam
  domain; the live-runner `ExamOption` still omits it, so the answer key cannot
  reach the runner by type.
- **It is not on the result page, and can't be — see BE-I-32 (filed).** That
  route is keyed by `sessionId`; the review endpoint takes an `attemptId` that
  `ScoreResult` never returns. It is reached from the dashboard's exam history,
  which has the id. The workaround of fetching `GET /exam/attempts` and taking
  the newest row was rejected: wrong under retakes and concurrent attempts, and
  not a guess worth making on a page that reveals the answer key.
- **i18n:** `assessments.review.*` (13 keys + 4 failure modes) +
  `studentInsights.examHistory.{review,actions}`, en/fr/ar, trees verified
  identical. Arabic machine-drafted, **pending professional review**.

- **Verification:** `npm run typecheck` ✓ · `npm run lint` ✓ (0 errors; 3 known
  `prefer-ngsrc` warnings) · `ng build --configuration production` ✓, initial
  gzip **104.16 kB**.
- **Not runtime-tested against api-dev** — needs a real student session with a
  terminal attempt. Unverified live: the review payload shape and the 422 path.

> **Session note (2026-08-01):** an accidental `git cherry-pick 172f35a` left
> unresolved conflicts in the three i18n files, two `features/courses` pages and
> this document. It was **aborted** at the user's request after taking a full
> working-tree snapshot; no work was lost and no conflict markers remain.

---

### Admin follow-ups — catalog image picker + exam student preview — ✅ committed (`ad30b66`)

Closes backlog items **12** and **10**. Both are admin-side, both were unblocked,
and neither touches CMS.

**1 · Catalog image picker (item 12, BE-I-27 narrowed by backend `66a7632`).**
The B8 catalog form took pasted URLs for `thumbnailUrl` / `badgeImageUrl`; it now
also uploads.

- `catalog.{dto,model,mappers,api}.ts` — `POST /admin/catalog/:id/image-upload-url`
  (**bare** response) → presigned PUT → persist `publicUrl`.
- **Reuses the A1 avatar pattern** (`242a11d`): an interceptor-free
  `HttpClient(HttpBackend)` for the storage PUT, so no `Authorization`, `X-Lang`
  or refresh cookie reaches the storage host and no extra header invalidates the
  signature. **Difference from A1, deliberate:** every `requiredHeaders` entry is
  echoed rather than just `Content-Type` — the signature also covers
  `x-amz-acl: public-read`, so dropping it fails the upload. And the certificate
  stores the returned **`publicUrl`**, not the `key` as the avatar flow does,
  because the certificates bucket is public-read.
- `components/cert-image-upload.ts` — writes **through the existing
  `FormControl`**, so uploading is an alternative way to fill the same field and
  the form's save path is untouched. It does **not** PATCH the certificate; the
  form's own save does, so upload-then-cancel can't half-commit.
- **Upload needs an existing certificate** — the endpoint 404s an unknown id, so
  on the *create* form the picker is hidden and the field says to save first,
  rather than offering an action that cannot work.
- Content type is checked client-side against the four the backend will sign, so
  an unsupported file is an instant message instead of a round trip.

**2 · Exam student preview (item 10, `GET /admin/exams/:examId/preview`).**

> **This replaced a preview that was quietly misleading.** The page already had a
> "Preview" toggle, but it re-rendered the *authoring* data with the correct-answer
> ticks hidden — while still showing `#position` and `marks`, which no candidate
> ever receives. It looked like the student paper without being it. The toggle now
> fetches the real endpoint and renders from that, so what an author checks before
> publishing is what the exam engine will actually serve.

- `exam-authoring.{dto,model,mappers,api}.ts` + `exam-questions.store.ts` —
  preview kept as **separate state**, not derived from the authoring view:
  deriving would mean stripping `isCorrect` client-side and trusting that
  stripping, rather than reading what the server serves.
- The preview types **omit `isCorrect` entirely**, so leaking a correct answer
  into the preview UI is a compile error rather than something review has to
  catch. The mapper copies options field-by-field instead of spreading, so a
  backend regression that re-included the flag would be dropped here.
- Refetched on each entry, so an author who just edited a question sees it.

- **i18n:** 8 new `admin.catalog.form.image*` keys + 6 `admin.examQuestions.preview*`
  keys, en/fr/ar, key sets verified identical. Arabic machine-drafted, **pending
  professional review** (CLAUDE.md §9).
- **Verification:** `npm run typecheck` ✓ · `npm run lint` ✓ (0 errors; the same
  3 known `prefer-ngsrc` warnings — the new preview `<img>` carries a scoped,
  reasoned suppression rather than adding a 4th, since `NgOptimizedImage` is for
  pre-sized layout-critical images, not an arbitrary operator-supplied URL that
  may not resolve) · `ng build --configuration production` ✓, initial gzip
  **104.13 kB, unchanged**.
- **Not runtime-tested against api-dev** — needs admin credentials. Unverified
  live: the presigned PUT actually succeeding with the echoed headers (the part
  most likely to bite), and the preview payload shape on a published exam.

---

### Stage 2 · CMS-ADMIN — ⛔ BUILT THEN ROLLED BACK (2026-07-29). Only the contact inbox survives.

**Status: the CMS admin surface is NOT built. Do not read the CMS rows elsewhere
in this file or in `cms-frontend-plan.md` as done.**

Slices 9 and 10 of [`cms-frontend-plan.md`](./cms-frontend-plan.md) were built in
one session on 2026-07-29 (page list/editor, the shared 16-type section registry,
the descriptor-driven section editor, and the globals editor), verified green
(typecheck / lint / production build), and then **rolled back at the user's
direction before review**. Every CMS file was deleted and every CMS edit to a
shared file reverted; `src/` contains **no** reference to `/cms`, `AdminCms*`, or
`CmsSection*`. The backend CMS module is once again entirely unconsumed, exactly
as it was at frontend HEAD `4f9e267`.

**What was kept from that session — and why it is separable.** The
**`/admin/contact` inbox** (BE-I-26, plan Slice 10) never depended on the CMS
code: it talks to its own `/admin/contact` endpoints, has its own data-access
layer, and shares nothing with the CMS files beyond a route and a nav entry.
It is **staged and ready to commit** — see the entry below.

**Rebuilding note for whoever picks CMS up again.** Three findings from the
rolled-back attempt are worth not rediscovering; they are properties of the
*backend*, not of the deleted code:

1. **`GET /admin/cms/pages/:id` and `GET /admin/cms/globals/:key` are bare** —
   no `{ data }` wrapper — while every write on the same controller *is*
   wrapped, and `DELETE` returns only `{ id, status }`
   (`cms-admin.controller.ts:90-101` vs `:82-84`). Map per endpoint (BE-I-01).
2. **`SLUG_LOCKED` / `SYSTEM_PAGE_PROTECTED` / `SECTION_NOT_IN_PAGE` are not
   error `code`s** — they are message prefixes on plain Nest exceptions, so they
   flatten to generic codes and cannot be branched on as the plan assumes. Filed
   as **BE-I-31**; the finding stands whether or not any FE code consumes it.
3. **Reorder (`PUT /pages/:id/sections/order`) is `learning_admin` only** —
   narrower than the `content_creator`-allowed section edits it reorders.

**Still true and still the top priority:** **Slice 1 / BE-I-30** — `GET /landing`
was deleted and the public landing page 404s in production. It is untouched by
all of the above.

---

### Stage 2 · Admin contact inbox (`/admin/contact`, BE-I-26) — 🟢 built & staged, awaiting review

Kept from the 2026-07-29 session after the CMS rollback. Consumes the
contact-submission API the backend shipped in `2976be0` → `7160f11`, which had
**no frontend consumer at all** until now. Independent of the CMS work.

- **`features/admin/data-access/contact.{dto,model,mappers,api,store}.ts`** —
  standard layering, blog/users as the precedent. Envelopes are per-endpoint
  again (BE-I-01): the list is `{ data, meta.pagination }`, detail and
  status-update are `{ data }`, and **`DELETE` is bare** `{ id, deleted }`
  (`contact-admin.controller.ts:60-110`).
- **`features/admin/pages/admin-contact.page.ts`** — cursor list with a status
  filter, detail dialog with the full message, triage transitions, and delete.
  Route `/admin/contact` + a nav item filtered to `support_admin` /
  `learning_admin`.
- **Triage model.** `new → read → archived`, with `spam` as a **side branch that
  keeps the row** — the backend's own comment says it exists so an admin can flag
  what the honeypot missed *without* deleting it, for abuse-pattern review. `new`
  is the server's initial state and is not offered as a manual target.
- **Two deliberate choices, flagged for review:**
  - **Opening a message does not auto-mark it read.** That would be a silent
    write on a mere glance, and with several admins triaging one inbox it hides
    who actually handled a message. Marking read is an explicit action.
  - **The delete confirmation names it as irreversible GDPR erasure.** Every
    other admin list in this app soft-deletes; this endpoint is a hard delete by
    design (the point is removing the submitter's email and free-text message),
    so the UI has to make that difference obvious rather than reuse the usual
    "are you sure?" copy.
- **PII handling.** The store is cleared on `user.logged-out` — rows carry
  submitter email and message text and must not outlive the session in memory.
  The `ipHash` is shown only inside a collapsed "technical details" block, with a
  note that the raw IP is never stored (the backend keeps a sha256 only).
- **i18n:** new `admin.contact.*` (35 keys) + `admin.shell.nav.contact`, en/fr/ar,
  key trees verified identical. Arabic machine-drafted, **pending professional
  review** (CLAUDE.md §9).
- **Verification:** `npm run typecheck` ✓ · `npm run lint` ✓ (0 errors; 3 known
  `prefer-ngsrc` warnings) · `ng build --configuration production` ✓. Initial
  gzip **104.13 kB** — the page is lazy, confirmed by checking that no chunk
  referenced from `index.html` contains the contact code. Status-transition logic
  exercised by a throwaway harness, then removed (no test runner; SOW §6.2.14).
- **Not runtime-tested against api-dev** — needs admin credentials. Unverified
  live: cursor paging past page 1, the status `PATCH`, and the hard delete.

---

> **2026-07-26 — resumed from the 2026-07-25 backlog (§"Next recommended
> step" items 13–14).** Two things were true on pickup that this doc hadn't
> caught up with yet:
>
> - **Item 13 (BE-I-29) was already fixed** — `1c2fcdb` ("feat(admin): fix
>   some bugs and do adam requests", by a teammate, ahead of this doc's
>   recorded HEAD) made `contentText` required end-to-end: `CreateLessonBody`
>   (`curriculum.dto.ts`), `toCreateLessonBody()` (`curriculum.mappers.ts`),
>   and the `lessonForm` validator + a new `ios-rich-text` editor
>   (`admin-curriculum.page.ts`). No further work needed — verified, not
>   re-done. **The same commit also closed backlog items 8 and 9**
>   (`AdminDashboardApi.getOverviewByDateRange(from, to)` +
>   `AdminDashboardStore.setDateRange`; `StudentDetail.certificates[] /
>   attempts[] / exams{assigned,purchases}` mapped in `users.model.ts`).
> - **Item 14 — student dashboard overview → real data — done this session**
>   (`4a11ae9`). See the new entry below.
>
> Backlog table below updated accordingly. Remaining open items: CMS-PUBLIC/
> CMS-ADMIN (2–3), blog E2E re-test (5), `complete-account` wizard (6, blocked
> by BE-I-25), legacy `/dashboard/certificates` demo (7), exam-authoring
> preview (10). Two reviews still outstanding: C1 security review, real-exam
> engine architect review.

### Phase 4 · Student dashboard overview → real data (checklist item 14) — ✅ committed (`4a11ae9`)

Retired the last hardcoded student-facing store. `DashboardStore`
(`features/dashboard/data-access/dashboard.store.ts`) no longer ships the
three canned "empty / one-cert / two-certs" datasets — it's now a pure
aggregator (no server state of its own) over three already-real stores:

- **`validCertifications`** ← `CoursesStore.progress()` (`GET
  /learning/progress`) joined with `PublicCatalogStore.byCode()` for the
  catalog title. The backend has no per-course "family"/"badge" field, so
  `resolveCertFamily()` / `resolveBadgeAsset()` (new, `dashboard.model.ts`)
  derive them deterministically from `programCode` (`ESM*` → esm,
  `EPO*` → epo, else esf; `-P`/`-A` suffix → practitioner/authority artwork)
  — reuses the existing `assets/badge/*.svg` set, no new assets.
- **`monthlyScores` / `examSummary`** (bar + donut charts) ← `MockStore.
history()` (`GET /mock/history`), bucketed client-side by month/pass-fail.
  **Correction, not a new build:** these charts were always meant to show
  *mock*-exam data (`dashboard.charts.mockTestScores` i18n key existed
  already) — the old mock data just fabricated numbers under a generic
  label. **Documented caveat:** `MockStore.history()` holds only the latest
  cursor page (20 items) — there's no monthly-aggregation endpoint, so the
  chart reflects recent attempts, not a guaranteed-complete year. Same
  trade-off already accepted for the real-exam history list (A7).
- **`learningCard`** — derived from the least-complete in-progress
  enrolment (continue vs. start copy); `null` when nothing is in progress.
  New i18n keys `dashboard.learning.{continueHeading,startHeading,
  lessonsProgress,ctaContinue}` (en/fr/ar; Arabic pending pro review, per
  the existing project convention).
- **Footer visibility** now keyed off a real `hasActivity` computed (any
  cert progress or mock history) instead of the removed `demoMode` toggle.
- `ios-cert-progress-card`'s "Show details" link now routes to the real
  `/courses/:certId` curriculum page instead of the legacy
  `/dashboard/certificates` demo (task 7 below — untouched, still mocked).

**Not touched:** the KPI tiles and real-exam history list were already real
(`StudentInsightsStore` / `ExamAttemptsStore`, A5/A7) — this slice only
covers what `overview.page.ts:307`'s `store.*` calls still faked.

- **Verification:** `npm run typecheck` ✓ · `npm run lint` ✓ on all touched
  files (4 pre-existing errors surfaced in `admin-audit-logs.page.ts` —
  unrelated, introduced by `1c2fcdb`, not touched by this change) ·
  `ng build --configuration production` ✓ (initial gzip ~103.8 kB, same
  known raw-size budget warning).
- **Committed** on `feat/real-backend-integration` (`4a11ae9`).

---

> **2026-07-25 — every primary Phase-4 student + auth surface is committed.**
> On `feat/real-backend-integration`: **real-exam engine** (`b951242`),
> **learning/courses** (`172f35a`), **mock-exam** data-access (`37b5c57`) + runner/
> result (`f4752ad`) + history page (`6d9e406`) + server-authoritative `/mock`
> Socket.IO timer (`904a478`), **email verification** (`9e06730`), and **C1 admin
> OTP login** (`ae6ae44` — ⚠️ security review still pending). Everything the
> 2026-07-22 rescan listed as "BE-ready, FE-missing" is now built.
>
> **⛔ 2026-07-27 — the landing page is broken.** `66a7632` **deleted
> `GET /landing`**; `features/landing/data-access/landing.api.ts:21-25` still calls
> it, so the shipped landing page (A6, `469f429`) 404s against the current backend.
> Filed as **BE-I-30**; the fix is **Slice 1 of
> [`cms-frontend-plan.md`](./cms-frontend-plan.md)** — repoint to
> `GET /analytics/public-stats` + `GET /catalog`.
>
> **What changed on the backend while we were building** (HEAD `7160f11`; recorded
> in [`backend-analysis.md` §6.9b](./backend-analysis.md#69b-latest-backend-sync-2026-07-25b--cms-module-blog-fix-analytics-window)
> and [§6.9c](./backend-analysis.md#69c-latest-backend-sync-2026-07-27--️-get-landing-removed-exam-review-contact-seo)):
>
> - **BE-I-21 is fixed** (`30bfff5`) — blog authoring is unblocked E2E; only a
>   re-test is owed.
> - **BE-I-22 is fixed** (`66a7632`) — `GET /exam/attempts/:attemptId/review`
>   returns the answer key for terminal attempts. **FE follow-up:** re-enable the
>   result page's review section (commented out, not deleted, in `b951242`).
> - **BE-I-26 is fixed** (`2976be0`) — public `POST /contact` + an
>   `/admin/contact` inbox. Unblocks the CMS `contact_form` section.
> - **A whole new CMS module** (`3e52625`) — public `GET /cms/pages/:slug` +
>   `/cms/globals/:key`, admin `admin/cms/*`, 16 typed section types. **No FE
>   consumer at all** — this is Stage 2; see
>   [`cms-frontend-plan.md`](./cms-frontend-plan.md).
> - **SEO module** (`43bd2d8`) — `GET /sitemap.xml`, `GET /robots.txt`, and
>   `seo.jsonLd` now embedded in CMS/blog/catalog responses.
> - **`contentText` is now required on lesson create** (`72a711c`) — the admin
>   curriculum form breaks against it today (**BE-I-29**, FE fix owed).
> - Catalog gained `POST /admin/catalog/:id/image-upload-url`; admin dashboard
>   gained `from`/`to`; admin student detail gained
>   `certificates[]`/`attempts[]`/`purchases[]` (all additive).
>
> Build script is on dev config (`f5e8caa`) — use
> `npx ng build --configuration production` to verify prod bundles/budgets.

## Overall project status

**Phase 3 (Admin application) — COMPLETE**, including the full section-B admin
pivot (B1–B8). **Phase 4 (user-facing app ↔ real backend) — feature-complete for
the planned scope**, pending reviews: the architect review of the real-exam engine
and the **security review of C1** (`core/auth`). What remains is (a) the
newly-arrived CMS surface, (b) the `complete-account` wizard (blocked by
**BE-I-25**), (c) the **BE-I-29** lesson-`contentText` fix, and (d) two legacy
mock-data pockets (student dashboard `DashboardStore`, the `/dashboard/certificates`
demo pages). Backend fully analysed (Phase 1, see
[`backend-analysis.md`](./backend-analysis.md)); auth wired (Phase 2).

> **2026-07-13 — the backend team resolved every blocker** from
> [`backend-blockers-report.md`](./backend-blockers-report.md). All previously-⛔
> user features (Certificates, Notifications, Insights) and the two blocked admin
> pages (Curriculum, Cert revocation) are now buildable, plus new admin pages and
> a two-step admin OTP login. The concrete, endpoint-level task list is in
> **[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md)** — the
> primary "what to build next" reference; this file tracks progress.

## Current phase

**Phase 4 — Wire the user-facing app to the real backend — the planned scope is
DONE.** All Phase-3 (admin) work and all Phase-4 A/B/C items are **committed** on
`feat/real-backend-integration` (per-page commit maps below), as are the four
net-new student/auth features from the 2026-07-22 rescan (real exam, courses,
mock, email verify) and C1. The old statement that "the user-facing screens still
target removed mock endpoints" is **no longer true** — the surviving mock data is
narrow and enumerated in [Remaining tasks](#remaining-tasks-high-level).

**Stage 2 — CMS surface + landing rewire.** Planned slice-by-slice in
[`cms-frontend-plan.md`](./cms-frontend-plan.md) (11 slices). **Slice 1 is
urgent**: `GET /landing` was deleted on 2026-07-26 (**BE-I-30**) and the landing
page 404s until it is repointed to `GET /analytics/public-stats` + `GET /catalog`.

## Phases at a glance

| Phase | Description                                                             | Status                                                               |
| ----- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | Study backend → `backend-analysis.md`                                   | ✅ Complete                                                          |
| 2     | Frontend infrastructure (remove mocks, real auth, interceptors, models) | ✅ Complete (auth + HTTP core)                                       |
| 3     | Admin application, page by page                                         | ✅ Complete (all unblocked surfaces)                                 |
| 4     | **User-facing app ↔ real backend, page by page**                        | ✅ Planned scope complete (2026-07-25) — reviews + 4 follow-ups open |
| 5     | **Stage 2 — CMS surface + landing rewire** — plan: [`cms-frontend-plan.md`](./cms-frontend-plan.md) | ⬜ Not started (11 slices; Slice 1 = P0 landing fix, BE-I-30) |

---

## Phase 4 plan — user-facing app backend integration

**Goal:** wire every user-facing screen to the real backend, page-by-page, using
the **same data-access layering** proven in the admin app
(`data-access/<feat>.{dto,model,mappers,api,store}.ts`, signals, cursor
pagination helpers, RFC-7807 error surfacing). Same workflow: **build one page →
`typecheck`+`lint`+`build` clean → update this file → stop for review; commit
only on "commit".**

**Current state of these features (corrected 2026-07-25):** the original text here
— "scaffolded against the removed mock backend, they compile but 404 at runtime" —
is **no longer true**. Every row in the map below is wired to a live endpoint; the
map is kept as the plan-of-record with each row's shipping commit. The only
placeholder data left in the user-facing app is the student dashboard overview's
`DashboardStore` and the legacy `/dashboard/certificates` demo pages (both in
[Remaining tasks](#remaining-tasks-high-level)).

### Feature → backend map (what to wire, in build order)

| Order | Feature (route)                                | Screens / purpose                               | Backend endpoints (all under `/api/v1`)                                                                                                               | Status                                                                                                                                                                                                         |
| ----- | ---------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Profile** (`/profile`)                       | View + edit profile; change password            | `GET /me`, `PATCH /me`, `PATCH /me/password`                                                                                                          | ✅ built (review pending)                                                                                                                                                                                      |
| **1** | **Settings** (`/settings`)                     | Password, language, delete account, data export | `PATCH /me/password` ✅; `POST /me/delete` `{password}` + `GET /me/export` (BE-I-19 ✅)                                                               | ⚠️ partial → now unblocked                                                                                                                                                                                     |
| **2** | **Catalog** (`/certifications` + detail)       | Browse certs, cert detail, curriculum outline   | `GET /catalog`, `GET /catalog/:id`, `GET /catalog/:id/outline` (public); Landing "featured" → **`GET /catalog`** (the old `GET /landing` was deleted — BE-I-30)        | ✅ live data wired (`2bcac6b`, 2026-07-26); landing featured still routes through the dead `/landing` call — Slice 1 |
| **3** | **Payments / enroll**                          | Checkout (enroll), retake, transaction history  | `POST /payments/checkout`, `POST /payments/retake`, `GET /payments/transactions`                                                                      | 🚧 data-access built (logic)                                                                                                                                                                                   |
| **4** | **Dashboard** (`/dashboard`)                   | Enrolled courses + progress, recent activity    | `GET /learning/progress`, `GET /payments/transactions`, `GET /me`, **`GET /insights`** (student aggregates), **`GET /exam/attempts`** (BE-I-07/17 ✅) | ⚠️ **partial** — insights (`0272e27`) + attempts (`554fbe6`) are real, but the overview's cards/charts still come from the hardcoded `features/dashboard/data-access/dashboard.store.ts` (see Remaining tasks) |
| **5** | **Courses / Learning** (`/courses`)            | Curriculum tree, lesson viewer, quiz, complete  | `GET /learning/certs/:id/curriculum`, `GET /learning/lessons/:id`, `GET /learning/lessons/:id/quiz`, `POST …/quiz/check`, `POST …/complete`           | ✅ built & committed (`172f35a`)                                                                                                                                                                               |
| **6** | **Assessments — real exam** (`/assessments`)   | Access-code entry → exam session → submit       | `POST /exam/{pre-exam-confirmation,validate-access,start}`, `GET/POST /exam/sessions/:id/*`, **`/exam` WebSocket** (heartbeat/timer)                  | ✅ built & committed (`b951242`) — architect review pending; degraded by BE-I-22/23/24                                                                                                                         |
| **6** | **Mock exam**                                  | Practice attempts, history, review              | `POST /mock/start`, `GET /mock/history`, `GET /mock/attempts/:id`, `GET /mock/:id`, `POST /mock/:id/{autosave,extend,submit,…}`, **`/mock` WS**       | ✅ built & committed (`37b5c57`, `f4752ad`, `6d9e406`, WS `904a478`)                                                                                                                                           |
| **7** | **Certificates** (`/dashboard/credentials`)    | List earned certs; verify                       | `GET /me/certificates` (BE-I-16 ✅) + public `GET /verify/:certId`                                                                                    | ✅ built — A3 (`features/credentials`)                                                                                                                                                                         |
| **7** | **Notifications** (`/dashboard/notifications`) | In-app notifications + unread badge             | `GET /notifications`, `/unread-count`, `POST /:id/read`, `/read-all` (BE-I-18 ✅)                                                                     | ✅ built — A4 (+ core badge)                                                                                                                                                                                   |
| **7** | **Insights** (Overview only)                   | Student learning/exam analytics                 | `GET /insights` (BE-I-20a ✅)                                                                                                                         | ✅ built — A5 (dashboard data-access, no standalone page)                                                                                                                                                      |

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

**Read first (in order):** this file — esp. the
[Backend ↔ Frontend reconciliation (2026-07-22)](#backend--frontend-reconciliation-full-rescan-2026-07-22)
for the current what's-done / what's-left matrix and the
[Phase 4 plan](#phase-4-plan--user-facing-app-backend-integration) →
[`backend-analysis.md`](./backend-analysis.md) (every endpoint/DTO/role +
Backend Issues Report) → `CLAUDE.md` (frontend rules: standalone components,
signals, OnPush, new control-flow, no `any`, no Observables in components,
`ios-` selector prefix, logical CSS).

**State (2026-07-25):** whole admin app (B1–B8), all user-facing rewire A-items
(A1–A7, BLOG-PUBLIC/ADMIN, C2), **and** the four net-new student/auth features —
real-exam engine (`b951242`), learning/courses (`172f35a`), mock-exam
(`37b5c57`/`f4752ad`/`6d9e406`/`904a478`), email verification (`9e06730`) — plus
**C1 admin OTP** (`ae6ae44`) are committed on `feat/real-backend-integration`.
**Open:** the C1 security review, the architect review of the exam engine, the
brand-new **CMS** surface, **BE-I-29** (lesson `contentText`), the
`complete-account` wizard (blocked by **BE-I-25**), and the two mock-data pockets
listed under [Remaining tasks](#remaining-tasks-high-level).

**Working rules (from the mission brief):**

- **Never modify `IOS_Backend/`.** Document backend problems in
  `backend-analysis.md` → Backend Issues Report (and surface stoppers in
  `backend-blockers-report.md`); don't fix them.
- **App, page by page (Phase 4 — admin is done).** Build one page, verify,
  **stop for review**. **Never commit without the user's explicit approval** —
  they say "commit". Follow [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md)
  — its §E lists the current open items. **Not** everything is unblocked: check
  [`backend-blockers-report.md`](./backend-blockers-report.md) §1 before starting
  anything that touches `complete-account` (BE-I-25) or the CMS (BE-I-26/27/28).
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

## Task log (all committed — see "Remaining tasks" for what is still open)

> **Heading corrected 2026-07-25.** Everything below this line is **committed** on
> `feat/real-backend-integration`; the per-entry "(uncommitted / awaiting review)"
> labels were stale and have been replaced with the commit sha that shipped each
> slice. Two items still carry an open **review** (not an open build): C1
> (`ae6ae44`, security) and the real-exam engine (`b951242`, architect).

- **Phase 4 · Profile — committed** (`f23902e`). Details below.
- **Phase 4 · Catalog — data-access layer committed (`f5954e0`), logic only.**
  The reviewer asked to **not** wire it into the marketing components yet, so the
  ESM cert-details retrofit was reverted. The marketing-page retrofit is still an
  open item. Details + rollout plan below.
- **Landing navbar — auth-aware CTAs** (committed with the catalog data-access,
  `f5954e0`). `ios-landing-navbar` hides **Login/Register** when the visitor is
  signed in and shows a **Dashboard** link instead (desktop + mobile), via
  `AuthStore.isAuthenticated()`. Added `landing.nav.dashboard` i18n (en/fr/ar).
- **Phase 4 · Payments — data-access layer committed (`468b457`), logic only.**
  Public payment flows wired in the data layer; no component consumes it yet.
  Details below.

### Phase 4 · ⭐ Real-exam engine — Slice 1: REST data-access (`features/assessments/data-access`) — ✅ committed (`b951242`)

First of five sub-slices for the student real-exam engine (the highest-stakes
surface — CLAUDE §10 / `08-exam-engine.md`). **Architect review required before
the runner ships (Slice 5).** Built as a standalone data-access layer per the
"logic only, no component behaviour changes" directive — no page consumes it yet
(it tree-shakes out of the bundle until Slice 3+ wires the store).

**Key finding — docs 08/09 are aspirational; the live backend differs.** The
spec (`08-exam-engine.md`, internally titled "09"; there is **no** separate 09
file) describes a richer engine than `IOS_Backend/src/modules/exam` implements.
The reconciliation that shaped this slice (full table in the session plan):

- **Answers are a flat `Record<questionId, optionId>` map**, single-select only
  (`mcq` | `true_false`) — no per-answer op, no discriminated `AnswerValue`
  union, no essay type.
- **`clientSeq` is NOT on the wire.** Autosave/submit post the whole current
  answers map (last-write-wins). `clientSeq` becomes a frontend-internal
  ordering/dedupe key for the IndexedDB draft rows (Slice 2) only.
- **No post-submission answer key / per-question correctness** (BE-I-22, filed
  this session + email drafted for the backend team). Real-exam result page will
  show score/passed only; the "Review Correct Answers" section is disabled
  (commented, not deleted) until the backend adds a review endpoint.
- **No draft encryption** — `POST /start` issues no per-session key; spec §7 is
  out. Drafts hold only `{ questionId, optionId }` (no PII) → plaintext IDB is
  policy-compliant.
- **WS is Socket.IO** (namespace `/exam`, `join_session` → `timer_tick`(30s) /
  `warning`(600s,300s) / `session_expired`), not the spec's raw-WS/ping-pong —
  handled in Slice 4 (adds `socket.io-client`, approved; installed when consumed).

**Files (all new except the model split):**

- `exam.dto.ts` — verbatim wire shapes: `ValidateAccess`/`StartExam`/`Answers`
  requests; `ValidateAccessResponseDto`, `StartExamResponseDto` (options carry
  only `{ id, optionText }` — `isCorrect` stripped server-side),
  `SessionStatusResponseDto`, `AutosaveResponseDto`, `ScoreResultDto`,
  `PreExamConfirmation*`. All bare DTOs (BE-I-01).
- `exam.model.ts` — **replaced** the old demo types with the real domain model:
  `ExamQuestion`/`ExamOption` (no correct answer), `AnswerValue`/`AnswerMap`,
  `AnswerOp` (frontend-only `clientSeq`), `SessionStatus`/`SyncStatus`,
  `TestSessionStatus`, `ExamAccessPreview`, `ExamSessionStart`,
  `ExamSessionSnapshot`, `ExamScoreResult`, `PreExamConfirmation`. Carries the
  reconciliation note as the file header.
- `exam-demo.model.ts` — **temporary**: the old display-only demo types +
  `DEMO_EXAM_QUESTIONS`, moved out verbatim so the placeholder runner/result
  pages keep compiling. The two page imports were repointed here (mechanical, no
  behaviour change). **Delete in Slice 5** when the pages are rewired.
- `exam.mappers.ts` — dto ↔ domain; narrows `questionType`/`TestSessionStatus`
  strings to the domain unions; sorts start questions by `position`.
- `exam.api.ts` — `ExamApi` (`@Injectable`, `HttpClient`, `environment.apiBaseUrl`):
  `confirmPreExam`, `validateAccess`, `start`, `getSession`, `autosave`, `submit`,
  `lateSubmit`. Observables only; error contract (403/404/409 per endpoint)
  documented in the class JSDoc for the store to branch on via `problemDetailCode`.
- **i18n:** none this slice (no user-facing strings yet).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.13 kB;
  known raw-size budget warning only). No live consumer yet; live check deferred
  until the store/UI slices wire it.
- **Next:** Slice 2 — `ExamDraftStore` (native IndexedDB, no dep) + in-memory
  fake; then Slice 3 store, Slice 4 Socket.IO WS, Slice 5 UI rewire + routing.

### Phase 4 · ⭐ Real-exam engine — Slice 2: IndexedDB draft layer (`features/assessments/data-access`) — ✅ committed (`b951242`)

Second sub-slice. The offline answer buffer (spec §5, `08-exam-engine.md`). Pure
logic + a test fake; nothing consumes it yet (tree-shaken out of the bundle —
initial gzip still 103.13 kB). No dependency added — native IndexedDB, wrapped by
hand.

**Files (new):**

- `exam-draft.store.ts` — the `ExamDraftStore` **interface**, the
  `EXAM_DRAFT_STORE` **DI token** (root factory → `IdbExamDraftStore`), and the
  native-IndexedDB implementation. DB `ios-exam-drafts` / store `pendingAnswers`,
  composite key `[sessionId, questionId]`, index `bySession`. Methods: `put`
  (upsert-if-newer), `markSynced` (ack only on exact `clientSeq` match),
  `loadPending` (unsynced, ascending `clientSeq`), `deleteSession`,
  `pruneOlderThan` (returns count). Dependency-free constructor so the boot sweep
  can `new` it outside DI. Handles `onblocked`/missing-`indexedDB` by rejecting
  (store degrades to a non-blocking banner per spec §9, wired in Slice 3).
- `exam-draft.store.fake.ts` — `InMemoryExamDraftStore`, the spec §12 test fake;
  identical semantics, injectable clock (`now`) for deterministic prune tests.

**Design decisions (reconciliation with spec §5.2 — documented in the file header):**

- **Key is `[sessionId, questionId]`, not the spec's `(sessionId, questionId,
clientSeq)`.** The live backend has no per-answer endpoint (bulk last-write-wins
  map), so only the latest answer per question matters locally. `clientSeq` is a
  monotonic **guard field**: `put` applies only when strictly newer; `markSynced`
  acks only when the stored `clientSeq` still matches (a fresh edit that lands
  mid-flush stays pending). This is the mechanism that makes the debounced bulk
  autosave (Slice 3) safe.
- **No encryption** (spec §7): `POST /start` issues no per-session key, and rows
  hold only `{ sessionId, questionId, optionId }` + bookkeeping (no tokens/PII),
  so plaintext IDB is policy-compliant. No `payload`/`iv` columns.
- **7-day boot sweep — capability now, wiring deferred to Slice 5.**
  `pruneOlderThan` is implemented, but it is **not** yet wired into app boot: an
  eager `app.config.ts` import would drag the exam draft code into the app shell
  and break the zero-initial-cost guarantee (CLAUDE §7 / spec §11). Slice 5 will
  run the sweep on exam-route activation (or via a lazy app-initializer that
  dynamic-imports the store into its own chunk) — settled with the routing work.

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.13 kB;
  known raw-size budget warning only). No live consumer yet.
- **Next:** Slice 3 — `ExamSessionStore` (signals; `setAnswer` optimistic → IDB →
  debounced bulk autosave; `resume`; `flushQueue`; `submit`/`lateSubmit`;
  `canSubmit`). Timer via `getSession` poll initially so the slice runs without WS.

### Phase 4 · ⭐ Real-exam engine — Slice 3: `ExamSessionStore` (`features/assessments/data-access`) — ✅ committed (`b951242`)

Third sub-slice — the signal store that owns exam-session state and the answer
sync queue (spec §4/§5). Pure logic; no page consumes it yet (tree-shaken —
initial gzip still 103.13 kB). **Architect review required before the runner
ships (Slice 5).**

**Files:**

- `exam-session.store.ts` (new) — `ExamSessionStore`, **route-scoped**
  (`@Injectable()`, no `providedIn`; provided at `/run/:sessionId` in Slice 5 so
  it's destroyed on route exit). Single writer of the session signals; injects
  `ExamApi` + `EXAM_DRAFT_STORE`.
  - **State/derived:** `sessionId`, `certId`, `questions`, `answers`,
    `sessionStatus`, `syncStatus`, `remainingSeconds`, `expiresAt`, `score`,
    `error`, `draftError`; computed `answeredCount`, `hasPending`, `progress`,
    and `canSubmit` (`in-exam`|`reviewing` && !pending && synced).
  - **`hydrateFromStart(start, ctx)`** — seed from a fresh `POST /start` (carried
    via router nav state) and persist the session snapshot for reload survival.
  - **`resume(sessionId)`** — rehydrate after reload: questions from the IDB
    snapshot (BE-I-23), answers/time/status from `GET /exam/sessions/:id` when
    online, overlaid with local pending drafts; monotonic `seq` continues above
    the loaded drafts.
  - **`setAnswer`** — optimistic signal update → durable IDB `put` → enqueue →
    debounced (~1 s) **bulk autosave**. IDB failure sets a non-blocking
    `draftError` but keeps syncing to the server (spec §9).
  - **`flushQueue`** (private) — posts the whole answers map once, acks exactly
    the in-flight ops (answers landing mid-flush stay queued), 409 → `markExpired`,
    network/5xx → `syncStatus='error'`, retried on the next trigger / `online` event.
  - **`submit` / `lateSubmit`** — send the full answers map; on success set
    `score`, status `submitted`, delete drafts. Submit **409** (already submitted)
    and late-submit **403** (grace closed → backend already auto-submitted) are
    treated as terminal with `score=null` (the result page reads the score from
    `GET /exam/attempts`).
  - **`applyServerTick` / `markExpired` / `enterReview` / `backToQuestions`** —
    hooks the Socket.IO WS (Slice 4) and the runner UI (Slice 5) drive.
- `exam-draft.store.ts` / `.fake.ts` (extended) — added a second object store
  `sessionMeta` (keyPath `sessionId`) with `putSessionMeta` / `loadSessionMeta`;
  `deleteSession` and `pruneOlderThan` now cover it too.
- `exam.model.ts` (extended) — `PersistedExamSession` (question snapshot + meta).

**Decisions (flag for architect review):**

- **Local question snapshot in IndexedDB (BE-I-23, filed this session).**
  `GET /exam/sessions/:id` returns no questions and `POST /start` can't be
  replayed, so reload-resume (incl. offline, spec §8 step 7) is impossible without
  a local copy. The runner now persists `PersistedExamSession` at start. This
  stretches CLAUDE §8's "IndexedDB for answer drafts only" — the snapshot carries
  no correct-answer flag and no PII, and drafts are meaningless without the
  questions they answer. Reducible to answers-only if the backend adds questions
  to the session read.
- **`clientSeq` collision resolver simplified.** Spec §9 uses `Date.now()` + a
  counter; this store uses a pure per-session monotonic integer (no clock), so
  intra-session collisions are impossible and there's no local-clock dependency.
- **Bulk-map submit is self-complete.** `submit` sends the entire answers map, so
  it's correct even if a pending op wasn't autosaved; the `canSubmit` "synced"
  gate is a UX guarantee (server has the latest), not a correctness requirement.
- **Offline remaining-time estimate** from the persisted `expiresAt` is a display
  seed only (local clock), replaced by the first authoritative WS tick (spec §6.3).

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.13 kB;
  known raw-size budget warning only). No live consumer yet.
- **Next:** Slice 4 — `ExamSessionWs` (Socket.IO client; adds `socket.io-client`):
  `join_session` → `applyServerTick` from `timer_tick`, `warning` a11y hooks,
  `session_expired` → `markExpired`/late-submit, 70 s staleness watchdog, reconnect.

### Phase 4 · ⭐ Real-exam engine — Slice 4: `ExamSessionWs` (Socket.IO) (`features/assessments/data-access`) — ✅ committed (`b951242`)

Fourth sub-slice — the live exam channel (spec §6). Adds the **`socket.io-client`
dependency** (approved this session; the backend gateway is Socket.IO, so a raw
`WebSocket` can't speak to it). Still logic-only — nothing imports the WS service
yet, so it (and socket.io-client) tree-shake out; initial gzip unchanged at
103.13 kB. **Architect review required before the runner ships (Slice 5).**

**Dependency:** `npm install socket.io-client` → **4.8.3** (added to
`package.json` + `package-lock.json`). Client build ~11 kB gzip; it will land
**only** in the lazy exam chunk once Slice 5 wires the runner — never the app
shell (verified: initial bundle unchanged this slice).

**File (new):** `exam-session.ws.ts` — `ExamSessionWs`, route-scoped
(`@Injectable()`, provided at `/run/:sessionId` in Slice 5; torn down on route
exit via `DestroyRef.onDestroy`). Injects `ExamSessionStore` + `AuthStore`.

- **Transport:** `io(`${environment.wsBaseUrl}/exam`, …)` — Socket.IO namespace
  `/exam`, `transports: ['websocket','polling']`, handshake `auth` as a
  **function** so the current (possibly rotated) in-memory access token is sent on
  every (re)connect (never logged, never in the URL).
- **Server → store:** `timer_tick` / `warning` → `store.applyServerTick(...)`;
  `session_expired` → `store.applyServerTick(0)` + `store.markExpired()`.
- **Exposed signals:** `connection` (`idle|connecting|open|reconnecting|closed`),
  `serverTick` (`{ remainingSeconds, receivedAt }` — the interpolation anchor the
  Slice 5 timer counts down from), `lastWarning` (10-/5-minute a11y announcer),
  `isConnected`.
- **`join_session`** re-emitted on every `connect` (a reconnect is a new socket
  that must re-join its room); the ack's `remainingSeconds` seeds the first tick.
- **Staleness watchdog** (`interval(10 s)`, disposed via `takeUntilDestroyed`):
  no server message for > 70 s while "open" → force `socket.disconnect().connect()`
  (spec's "two missed pongs > 70 s → reconnect", mapped onto the 30 s tick cadence).
- **Reconnect:** Socket.IO built-in, `reconnectionDelay` 1 s → max 30 s, infinite
  attempts (route lifetime caps it) — replaces the spec's manual raw-WS retry.

**Reconciliation with spec §6 (documented in the file header):** the spec assumes
a raw WebSocket with app-level ping/pong and `tick`(1 s)/`auto-submit` events; the
live backend is Socket.IO with engine.io's own heartbeat, `timer_tick`(30 s),
`warning`, and `session_expired`. Handled accordingly.

- **Coupling note:** `ExamSessionWs` injects `ExamSessionStore` and pushes ticks
  into it (both route-scoped, resolved as the same instances). No cycle (the store
  doesn't inject the WS). The runner (Slice 5) reads `store.remainingSeconds` +
  `ws.connection`/`ws.serverTick`/`ws.lastWarning`.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.13 kB —
  socket.io-client absent from the initial bundle; known raw-size warning only).
  WS behaviour can't be exercised in-session (needs a live session + real token);
  it'll be validated when Slice 5 wires the runner against api-dev.
- **Next:** Slice 5 — UI rewire + routing: `exam-verify`/`exam-ready`
  (validate-access + pre-exam-confirmation + start), `exam-runner`
  (`ExamSessionStore` + `serverTick` timer + connection indicator + submit gating),
  `exam-result` (score-only; "Review Correct Answers" disabled per BE-I-22), routes
  `/run/:sessionId` + `/result/:sessionId` with route-scoped providers, the 7-day
  boot sweep wiring, and the §8 offline acceptance walk-through.

### Phase 4 · ⭐ Real-exam engine — Slice 5a: routing + runner/result rewire (`features/assessments`) — ✅ committed (`b951242`)

Fifth-slice, part A — the first slice that **touches components and goes live**.
Wires the runner + result pages to the Slice 1–4 data-access. **Architect review
required before merge** (CLAUDE §10). Cannot be runtime-tested in-session (needs a
live session + real token against api-dev); validated by typecheck + strict-template
build + the §8 walk-through in 5b.

**Routing (`assessments.routes.ts`):**

- `run/:sessionId` — route-scoped `providers: [ExamSessionStore, ExamSessionWs,
{ provide: EXAM_DRAFT_STORE, useClass: IdbExamDraftStore }]` so a fresh
  store/socket is created per attempt and destroyed on exit. `result/:sessionId`.
  `verify` / `ready` unchanged (rewired in 5b).

**`exam-runner.page.ts` (full rewire):**

- Injects the route-scoped `ExamSessionStore` + `ExamSessionWs`. On entry either
  `hydrateFromStart` (fresh start payload from router nav state — supplied by the
  ready page in 5b) or `resume(:sessionId)` (reload); then `ws.connect`.
- **Timer reads `ws.serverTick()`** and interpolates DOWN locally each second
  (`toSignal(interval(1000))`), never below the server value, HH:MM:SS / MM:SS
  (CLAUDE §10 — no local-clock anchor).
- **Submit gated by `store.canSubmit()`** (blocked while pending / not synced);
  options show default/selected only (no correctness leak); `setAnswer` →
  IDB → debounced bulk autosave.
- Terminal handling via an `effect`: server `expired` → auto `lateSubmit`;
  `submitted` → disconnect WS + navigate to `/result/:sessionId` (score in nav
  state). Restore-error and loading gates via `@switch` on `sessionStatus`.
- **a11y:** `role="radiogroup"`/`radio` with `aria-checked`; `aria-live` regions
  for time warnings (10-/5-min from `ws.lastWarning()`) and sync status; connection
  indicator; `dir="auto"` on question/option text (bidi).

**`exam-result.page.ts` (rewire — score-only):**

- Reads `ExamScoreResult` from nav state; pass/fail hero + summary card
  (correct/incorrect counts, score %); certificate + share shown only when passed;
  neutral "submitted — see history" state when `score` is `null` (terminal race).
- **"Review Correct Answers" section DISABLED (BE-I-22)** — removed from the live
  template and preserved as a prose reference comment (per the instruction to
  comment out, not delete); restore from git once the backend review endpoint ships.

**Model / cleanup:**

- `exam.model.ts` — added `ExamResultNavState`; `exam-session.store.ts` — added
  `examTitle` signal (runner sidebar / result title).
- **Deleted `exam-demo.model.ts`** (the temporary demo types + `DEMO_EXAM_QUESTIONS`)
  now that both pages use the real model — its Slice-1 purpose is done.
- **i18n:** added `assessments.runner.*` (22 keys — the old demo referenced missing
  `assessments.runner.*` keys) + `assessments.result.{submittedNeutralTitle,
submittedNeutralBody,viewInDashboard}` to en/fr/ar. Arabic still needs pro review.

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ — strict templates compiled;
  **initial gzip 103.39 kB** (socket.io-client stays in the lazy assessments chunk,
  NOT the initial bundle); known raw-size budget warning only. No new build warnings.
- **Next (Slice 5b — final):** rewire `exam-verify` (validate-access preview +
  pre-exam identity confirmation) and `exam-ready` (start → nav to `/run/:sessionId`
  with the start payload + `certId` via nav state); wire the 7-day boot sweep
  (route-activation or lazy app-initializer); dashboard/cert entry points →
  `/assessments/verify`; and document the §8 ~60 s offline acceptance walk-through.

### Phase 4 · ⭐ Real-exam engine — Slice 5b: entry pages + boot sweep (`features/assessments`) — ✅ committed (`b951242`)

Final sub-slice — the exam entry flow, completing the engine. **Architect review
required before merge** (CLAUDE §10).

**`exam-verify.page.ts` (rewired):** replaced the obsolete email-link mock with a
functional form — access **code** input (from the exam email) + identity
attestation (full name required, ID optional), typed reactive form
(`NonNullableFormBuilder`). On submit → `POST /exam/validate-access` (does not
consume the code) → navigate to ready with the code + resolved exam metadata
(`ExamReadyNavState`). 403 → inline "invalid/expired code"; other errors via
`problemDetailMessage`. Accessible (visible labels, `aria-invalid`/`aria-describedby`,
`aria-live` errors, `dir="auto"`).

**`exam-ready.page.ts` (rewired):** receives the validated code + exam metadata
via nav state; shows title + duration. "Let's start" → `POST /exam/start` (consumes
the code) → navigate to `/run/:sessionId` with `{ start, ctx }` for the runner to
hydrate. 409 (active session / code used / confirmation required) surfaced inline.
No-nav-state fallback → "start from your dashboard".

**Boot sweep:** `guards/exam-draft-sweep.guard.ts` — `examDraftSweepGuard`
(`CanActivateFn`) fires `pruneOlderThan(7 days)` fire-and-forget on entry to the
assessments area (pathless wrapper route). Realized as **exam-area-entry** rather
than app-boot to keep the IDB/exam code out of the app shell (CLAUDE §7) — runs in
the lazy chunk exactly when stale drafts matter.

**Cleanup:** deleted the obsolete `confirm-exam-dialog.ts` + `exam-sent-dialog.ts`
(email-link flow). Added `ExamReadyNavState` to the model; `assessments.verify.*`
(11 new keys) + `assessments.ready.*` (10 new keys) to en/fr/ar (Arabic pending
pro review). Orphaned `assessments.{confirmDialog,sentDialog}` i18n keys left in
place (harmless; minor future cleanup).

**Backend gap filed:** **BE-I-24** — no `certId` at exam entry, so
`pre-exam-confirmation` can't be driven by the FE; the flow relies on `start`'s 409
(which is how the backend gates purchase-enrolled students anyway).

**§8 acceptance walk-through (documented; can't run live in-session):**

1. Mid-exam, answered Q1–Q3, on Q4, online → `connection open`, `syncStatus synced`.
2. DevTools → Offline ~60 s → runner shows the reconnecting/offline connection
   chip; `setAnswer` still writes to IndexedDB; timer freezes at the last
   `serverTick` (no local decrement past it once ticks stop).
3. Answer Q4, Q5 offline → visible immediately, written to IDB, `pendingOps=2`,
   submit disabled (`canSubmit` false while pending/unsynced).
4. Restore network → the `online` event + Socket.IO reconnect fire; `flushQueue`
   posts the full answers map; `join_session` re-emitted; ticks resume.
5. `pendingOps=0`, `syncStatus synced`.
6. Submit enabled → `POST …/submit` → result page renders the score.
7. Reload while offline → `resume` reads the IDB question snapshot (BE-I-23) +
   pending drafts; on reconnect `flushQueue` drains as in step 4.

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings; `Validators.*` unbound-method disabled file-level per the auth-form
  pattern) · `ng build --configuration production` ✓ (initial gzip 103.34 kB;
  socket.io-client stays in the lazy chunk; known raw-size warning only).

### ✅ Real-exam engine (student) — COMPLETE across Slices 1–5b — committed `b951242` (2026-07-24); architect review still pending

All five slices done: REST data-access (1) → IndexedDB drafts + session snapshot
(2) → `ExamSessionStore` (3) → Socket.IO `ExamSessionWs` (4) → routing + UI rewire

- entry pages + boot sweep (5a/5b). Reconciled the aspirational spec (docs 08/09)
  to the live backend throughout; filed BE-I-22/23/24 for the three real backend
  gaps (answer-key review, questions-on-resume, certId-at-entry). Not runtime-tested
  in-session (needs a live session + real token against api-dev); validated by
  typecheck + strict-template build + the §8 walk-through above.

**Refactor pass (`/simplify`, 4-angle review) applied:** parallelised `resume()`'s
IndexedDB + network reads (`Promise.all`); batched draft acks into one
IndexedDB transaction (`markManySynced` replaces per-op `markSynced`); WS connect
no longer waits on the snapshot-persist write; centralised the `expired →
late-submit` reaction in the store's `markExpired` (dropped the runner's
`lateSubmitTried` flag); replaced the `resume('')` sentinel with an explicit
`failRestore()`; and simplified two redundant `computed` passthroughs + the result
page's closure-wrapped snapshots. Reuse review found no violations; the `certId`
forward-plumbing (BE-I-24) was kept intentionally. All green after
(typecheck/lint/build, initial gzip 103.34 kB).

**Next feature: Learning / courses (student)** — plan item 2.

### Phase 4 · ⭐ Learning / courses — Slice 1: data-access (`features/courses/data-access`) — ✅ committed (`172f35a`)

Plan item 2. First slice of the student learning experience, wired to the backend
`@Controller('learning')`. Pure logic; `features/courses` is still an empty route
shell, so nothing consumes it yet (tree-shaken — initial gzip unchanged 103.34 kB).

**Backend contract (from `IOS_Backend/src/modules/learning`):** all endpoints
return a `{ data, meta }` envelope (BE-I-01) and are purchase-gated (403 when not
enrolled). `GET /learning/certs/:certId/curriculum` (module/lesson tree +
per-lesson `completed`), `GET /learning/lessons/:id` (localised `contentHtml` +
short-lived **signed** `videoUrl` + `meta.videoUrlExpiresInSeconds`),
`GET /learning/lessons/:id/quiz` (correct answers stripped; free-text OR MCQ via
`options`), `POST …/quiz/check` (instant per-question feedback incl. `correctAnswer`
— **nothing persisted**, unlimited attempts), `POST …/complete` (idempotent,
`alreadyCompleted`), `GET /learning/progress` (per-cert `totalLessons /
completedLessons / percentComplete`).

**Files (new):**

- `courses.dto.ts` — wire shapes mirroring the backend, incl. the `{ data, meta }`
  envelopes.
- `courses.model.ts` — domain: `Curriculum`/`CourseModule`/`LessonSummary`,
  `Lesson` (with `videoUrlExpiresInSeconds`; `contentHtml` flagged
  MUST-sanitise), `LessonQuiz`/`QuizQuestion`, `QuizCheckResult`/`QuizAnswerResult`,
  `LessonCompletion`, `CourseProgress`.
- `courses.mappers.ts` — dto→domain, unwrapping each `{ data, meta }`.
- `courses.api.ts` — `CoursesApi` (`@Injectable`, `HttpClient`,
  `environment.apiBaseUrl + '/learning'`): `getCurriculum`, `getLesson`,
  `getLessonQuiz`, `checkQuiz`, `markComplete`, `getProgress`. Observables only.
- `courses.store.ts` — `CoursesStore` (root singleton): curriculum / current-lesson
  / quiz+checkResult / progress slices, each with loading+error signals; actions
  `loadCurriculum`, `loadLesson`, `loadQuiz`, `checkQuiz`, `markComplete` (reflects
  completion into the lesson + curriculum immutably), `loadProgress`; clears on
  `user.logged-out`. `problemDetailMessage` for inline errors; no Observables leak.

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.34 kB,
  tree-shaken; known raw-size warning only).

### Phase 4 · ⭐ Learning / courses — Slice 2: pages (`features/courses/pages`) — ✅ committed (`172f35a`)

Wired the full student learning UI on top of Slice 1. Lazy chunks (not in the app
shell); initial gzip 103.39 kB. i18n `courses.*` added to en/fr/ar (Arabic pending
pro review).

**Routing (`courses.routes.ts`):** `/courses` → index · `/courses/:certId` →
curriculum · `/courses/:certId/lessons/:lessonId` → lesson.

**Pages (new):**

- `courses-index.page.ts` — enrolled certs from `GET /learning/progress` as cards
  (programCode, title, progress bar, `done/total`), empty state → `/certifications`.
- `curriculum.page.ts` — module/lesson tree from `GET …/curriculum`; each lesson
  row shows a completion tick / play icon + duration and links to the lesson.
- `lesson.page.ts` — signed-URL `<video>`, **sanitised** `contentHtml` via
  Angular's built-in `[innerHTML]` sanitizer (`.ios-lesson-prose` styling; no
  `bypassSecurityTrust*`), idempotent **mark-complete**, and an optional **self-check
  quiz**: MCQ (radios) or free-text, `Check answers` → `POST …/quiz/check` →
  per-question correct/incorrect + revealed correct answer + score, with `Try again`.
  A missing quiz (404) simply hides the section (quizzes are optional).

**Notes:**

- Route params read via `route.snapshot.paramMap` (project convention; no
  same-route lesson→lesson links, so no param-reuse reload issue). Quiz/lesson
  state lives in the root `CoursesStore`; `answersMap` is per-page.
- `markComplete` failures surface via the global error toast, deliberately NOT via
  `lessonError` (which gates the whole lesson view).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.39 kB,
  courses pages lazy; known raw-size warning only). Not runtime-tested in-session
  (needs an enrolled student + real token against api-dev).
- **Follow-ups:** A7 dashboard can now drop the mock `DashboardStore` for
  `GET /learning/progress`; a "Courses" nav entry / dashboard link into `/courses`
  can be added where the student nav lives.

### Phase 4 · ⭐ Mock-exam runner — Slice 1: data-access (`features/certificates/data-access`) — ✅ committed (`37b5c57`)

Plan item 3. First slice of the student practice-exam engine, wired to the
backend `@Controller('mock')`. Pure logic; no page consumes it yet (tree-shaken —
initial gzip unchanged 103.39 kB). Lives in `features/certificates` (where the
existing demo `mock-test.page` / `mock-exam-result.page` already are).

**Contract vs. the real exam:** the mock timer is **soft / non-terminal**
(extendable via `POST /mock/:id/extend`, never auto-submits — `timeUp` is
advisory), correct answers **are** revealed (`POST …/reveal` hint + the
`GET /mock/attempts/:id` review), history is cursor-paginated, and nothing is
graded on the client. `readyForFinal` is advisory only (never blocks the real exam).

**Files (new, `features/certificates/data-access/`):**

- `mock.dto.ts` — wire shapes: start / session / autosave / extend / submit /
  reveal / history (`{ data, meta.pagination }`) / review (`{ data }`, reveals key).
- `mock.model.ts` — domain: `MockStart`/`MockSession`/`MockQuestion`,
  `MockResult`/`MockReadiness`, `MockExtension`, `MockReveal`, `MockHistoryItem`,
  `MockReview`/`MockReviewQuestion`.
- `mock.mappers.ts` — dto→domain, unwrapping envelopes, ordering questions by position.
- `mock.api.ts` — `MockApi`: `start`, `getSession`, `autosave`, `extend`,
  `submit`, `reveal`, `getHistory` (via `@core/http` `toPage`/`toHttpParams`),
  `getReview`. Error contract (403/409/422/404) documented in the class JSDoc.
- `mock.store.ts` — `MockStore` (root singleton): live-runner slice (start/resume,
  optimistic `setAnswer` → debounced bulk autosave, `extend`, `submit`, `reveal`),
  cursor-paginated `history` (`load`/`loadMore`), and `review`; clears on
  `user.logged-out`.

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.39 kB,
  tree-shaken; known raw-size warning only). No live consumer yet.
- **Slice 1 committed** (`37b5c57`).

### Phase 4 · ⭐ Mock-exam runner — Slice 2: UI rewire (`features/certificates/pages`) — ✅ committed (`f4752ad`)

Rewired the **existing** demo mock pages to the real `MockStore`. Lazy chunks;
initial gzip 103.28 kB. i18n `mock.*` + `courses.curriculum.practiceTest` added
to en/fr/ar (Arabic pending pro review).

- `mock-test.page.ts` — the runner, now query-param driven: `?certId=` starts an
  attempt (URL rewritten to `?attemptId=` for reload-resume), `?attemptId=`
  resumes. Real questions/options (UUIDs), optimistic `setAnswer` → debounced
  autosave, **soft local countdown** anchored to the server's `remainingSeconds`
  (re-seeded on start/resume/extend — no WS yet; see below), **reveal**-answer
  (mock-only hint), **extend** on the time-up dialog (never auto-submits), and
  submit/exit → grade. Idle/error/loading gates.
- `mock-exam-result.page.ts` — the review, now `?attemptId=` driven via
  `GET /mock/attempts/:id`: real score, true/false tally, per-question
  correct/incorrect (mock **reveals** the key), advisory readiness message, and a
  "ready for the final?" CTA → `/assessments/verify`.
- **Routing:** added slug-less `certificates/mock-test` + `mock-test/result`
  (query-param driven) before the `:code` route. The old `:code/mock-test*` routes
  remain but now hit the runner's idle fallback (the demo `cert-detail` mock start
  passes no `certId`).
- **Entry:** a **"Practice test"** action on the curriculum page header
  (`features/courses`) — it has the UUID `certId` and links to
  `certificates/mock-test?certId=…`, resolving the exam-style slug-vs-UUID entry gap.

**Decisions / notes:**

- **Reveal-on-demand, not auto-reveal.** The demo auto-revealed the answer on every
  selection; the real runner reveals only on the explicit "Reveal answer" button
  (one `POST …/reveal` per use) — the endpoint's intended, non-spammy usage.
- **Soft timer is now server-authoritative** via `mock-session.ws.ts` (Socket.IO
  namespace `/mock`, reuses the exam WS shape): `timer_tick`/`warning`/`time_up` →
  `MockStore.applyRemaining`; the runner interpolates down locally between ticks
  (anchored by an effect on `store.remainingSeconds`) and gracefully degrades to a
  pure local countdown if the WS is unavailable. Non-terminal (`time_up` prompts
  extend, never auto-submits). socket.io-client is shared with the exam chunk.
- **History view** (`GET /mock/history`) — ✅ now surfaced: `mock-history.page.ts`
  at `certificates/mock-test/history` (cursor-paged "past attempts" list; submitted
  rows → review, in-progress rows → resume). Linked from the courses index header
  and the mock result page.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.28 kB,
  mock pages lazy; known raw-size warning only). Not runtime-tested in-session
  (needs an enrolled student + token). **Node ≥ 20.19 required for `ng build`**
  (nvm: `nvm use 20.19.0`; the shell defaulted to 20.11 which the CLI rejects).

### Phase 4 · ⭐ C1 — Admin OTP login (`core/auth` + `features/admin`) — ✅ committed (`ae6ae44`) — ⚠️ SECURITY REVIEW STILL REQUIRED

Plan item 4 (the explicitly-last, highest-risk item). Two-step admin OTP login +
admin-aware logout. **Touches `core/auth` → must pass architect + security review
before it ships** (CLAUDE §8/§13). No new dependency; initial gzip 103.66 kB.

**Backend contract** (`IOS_Backend/src/modules/auth/auth-admin.controller.ts`):
`POST /auth/admin/login` returns **either** a `LoginResponse` (OTP off) **or** an
`AdminLoginChallengeResponse { otpRequired:true, challengeId, expiresInSeconds }`
(OTP on — no tokens/cookie); `POST /auth/admin/login/otp { challengeId, code }` →
`LoginResponse` + cookie (401 on bad/expired/exhausted); `POST /auth/admin/logout`.

**Files:**

- `core/auth/auth.dto.ts` — `AdminLoginChallengeResponse`, `AdminLoginResponse`
  (union), `AdminOtpVerifyRequest`.
- `core/auth/auth.model.ts` — `AdminLoginChallenge`, discriminated `AdminLoginResult`
  (`{ kind:'session' } | { kind:'otp' }`).
- `core/auth/auth.api.ts` — `loginAdmin` now returns `AdminLoginResult` (branches
  on `otpRequired`); added `verifyAdminOtp(challengeId, code)` and `adminLogout()`.
- `core/auth/auth.store.ts` — `loginAdmin` holds the challenge (adopts NOTHING until
  verify); `verifyAdminOtp(code)` / `cancelAdminOtp()`; `otpChallenge` signal +
  `isAdminSession` computed; `logout()` now routes admin → `/auth/admin/logout` +
  `/admin/login`; `clearSession` wipes the challenge (no partial state on
  fail/abandon).
- `features/admin/pages/admin-login.page.ts` — two-step UI: password → (if
  challenged) 6-digit code step with an `expiresInSeconds` countdown, back/cancel,
  APG error semantics.
- **i18n:** `admin.otp.*` (en/fr/ar; Arabic pending pro review).

**Security-review checklist (state these to the reviewer):**

1. **Refresh routing** — kept on the shared `/auth/refresh` (per the existing
   `auth.api.ts` comment that it serves both). `/auth/admin/refresh` was NOT wired.
   Confirm the admin refresh cookie is actually accepted at `/auth/refresh`; if not,
   route the 401-interceptor refresh to `/auth/admin/refresh` for `isAdminSession`.
2. **No partial session** — a wrong/expired/abandoned OTP leaves no token, user, or
   roles in memory (verified: nothing is adopted until `verifyAdminOtp` succeeds;
   `cancelAdminOtp`/`clearSession` wipe the challenge).
3. **Single-flight refresh race** unchanged (`refreshAccessToken` untouched).
4. Bootstrap on `/admin` reload still uses the shared `/auth/refresh` (item 1).

- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.66 kB;
  known raw-size warning only). Not runtime-tested in-session (needs a staff account
  - OTP email). Node ≥ 20.19 for `ng build`.

### Phase 4 · Email verification (`features/auth` + `core/auth`) — ✅ committed (`9e06730`)

Plan item 5 (partial). Wires the "BE-ready, FE-missing" `POST /auth/verify-email`.

- `core/auth/auth.api.ts` — added `verifyEmail(token)` → `POST /auth/verify-email`
  `{ token }`. **⚠️ core/auth change — architect + security review** (CLAUDE §8/§13);
  it only wires an existing endpoint and touches no token/refresh storage.
- `features/auth/pages/verify-email.page.ts` (new) + route `/auth/verify-email`:
  reads `?token=` and verifies on load → success (→ `/auth/login?verified=1`) or
  an invalid/expired/missing-token state that offers **resend**
  (`AuthApi.resendVerification`, anti-enumeration messaging). Auth-shell layout,
  reactive form, `firstValueFrom` (no component `subscribe`).
- **i18n:** `auth.verifyEmail.*` (en/fr/ar; Arabic pending pro review).
- **Not done (follow-up):** the `complete-account` 3-step profile wizard is still a
  simulated stub (`onSubmit` TODO → navigates to `/dashboard`); wiring it to
  `PATCH /me` needs a cross-feature path (ProfileApi lives in `features/profile`).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · `ng build --configuration production` ✓ (initial gzip 103.36 kB,
  verify-email lazy). Not runtime-tested in-session. Node ≥ 20.19 for `ng build`.

### Phase 4 · Payments data-access (`features/payments/data-access`) — ✅ committed (`468b457`), logic only

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

### Phase 4 · Catalog retrofit (`/certifications` + `cert-details-*`) — data-access committed (`f5954e0`); the marketing-page retrofit is still open

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

### Phase 4 · Profile (`/dashboard/profile`) — ✅ committed (`f23902e`)

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

### Phase 4 · A1 — Profile avatar upload (BE-I-08) — ✅ committed (`242a11d`)

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

### Phase 4 · A3 — Earned certificates list (BE-I-16) — ✅ committed (`3bed4c1`)

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

### Phase 4 · A4 — Notifications (BE-I-18) — ✅ committed (`99917c8`)

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

### Phase 4 · A5 — Student learning insights (BE-I-20a) — ✅ committed (`0272e27`)

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

### Phase 4 · BLOG-PUBLIC rewire (BE-I-11, `features/insights`) — ✅ committed (`1940501`)

Rewired the public blog (`features/insights`) from static fallback to the live
**Blog module** (`334d0c6`): `GET /blog` (cursor list) + `GET /blog/:slug`
(detail). Both `@Public()`, localized by `X-Lang` (via `localeInterceptor`).

- **Data-access layer** (`features/insights/data-access/insights.*`): `dto` (wire
  shapes) → `model` (`InsightPost` / `InsightDetailPost` + `InsightSeo`) →
  `mappers` → `api` (HttpClient + `toPage`) → `store` (signal store, cursor feed,
  server-side search). Followed the committed layering (`firstValueFrom`; no
  Observables in components).
- **List** = cursor/keyset infinite feed (`toPage`, `PAGE_LIMIT=9`), keeps backend
  `published_at DESC` order (no client resort). **Search** is now **server-side**
  (`?search=`, English title), debounced 300 ms in the page. Added loading
  skeletons, empty, and error+retry states.
- **Detail** renders admin-authored `contentHtml` via Angular's built-in
  `[innerHTML]` sanitizer (`SecurityContext.HTML` — the allow-list required by
  CLAUDE.md §4; **no** `bypassSecurityTrust*`), styled by a scoped `.ios-blog-prose`
  block (`::ng-deep`, design tokens). Replaced the old static content-block model.
  404 (draft/archived/unknown slug) → not-found state. Read-time is **computed**
  from the body word count; the byline shows author · date · read-time.
- **Backend contract corrections** (verified against `IOS_Backend/src/modules/blog`,
  read-only) — the earlier task note was slightly off: `GET /blog/:slug` is
  **enveloped `{ data, meta:{locale} }`**, not bare; and `authorName` /
  `metaDescription` / `seo.*` are **nullable** (mapped `?? ''`). List/detail also
  carry a `direction` field (typed in the DTO; UI direction stays owned by
  `DirectionService`). Dates are formatted with the **response** locale.
- **Shared `ios-insights-card`:** `readTime` made optional + added optional
  `authorName` byline (blog list rows have an author but no read-time); landing
  still passes `readTime` and is unchanged. Backend supplies no featured image, so
  the mapper derives a **deterministic placeholder** (`blog_1..3.png`) from the slug.
- **i18n:** added `insights.{empty,loadError,retry,minRead}` (en/fr/ar; Arabic
  pending pro review). Removed the old static `FALLBACK_DATA` / content-block copy.
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only). Browser smoke test at
  `/insights`: request correctly hits `GET /api/v1/blog?limit=9`; error state +
  retry render cleanly. **Happy path not yet verifiable — the Blog module is not
  deployed to `api-dev` (endpoint 404s there as of 2026-07-20);** ready to light up
  once deployed.

### Phase 4 · BLOG-ADMIN (`admin/blog`, new page) — ✅ committed (`5404e77`)

New admin authoring page for the Blog module (`334d0c6`): full CRUD + lifecycle +
per-locale translations, built like the B-pages (dto→model→mappers→api→store +
page with dialogs). Route `/admin/blog` under the admin shell; role-filtered nav
item registered.

- **Data-access** (`features/admin/data-access/blog.*`): `BlogAdminItem` /
  `BlogAdminDetail` (+ per-locale `BlogLocaleContent`), `BlogStatus`
  (draft|published|archived), payloads. `AdminBlogApi`: `list` (cursor, all
  statuses, `?status=`/`?search=`), `getById` (**bare** detail + `contentHtml` +
  raw `translations`), `create`/`update`/`updateTranslations`/`publish`/
  `unpublish`/`remove` (all `{ data }`). `AdminBlogStore`: cursor list, filters,
  lazy detail load for dialogs, action runner, publish-gate `reasons[]` capture
  (`409 BLOG_NOT_PUBLISHABLE` → `errors[]`, same idiom as B7), cleared on
  `user.logged-out`.
- **Page** (`admin-blog.page.ts`): list table (title/slug, status badge, author,
  updated) with loading/empty/error+retry; create/edit dialog (title, slug,
  metaDescription, `contentHtml` textarea); a **translations dialog** with a
  per-locale matrix (`tr/fr/es/ar/de` — the non-English backend locales; nested
  `formGroupName` groups); publish/unpublish inline; archive confirm dialog.
  Publish-gate reasons shown under the table.
- **RBAC (UI hide; backend enforces):** create/edit/translations →
  `content_creator`/`learning_admin`; publish/unpublish/archive → `learning_admin`;
  `super_admin` bypass. Nav item visible to `content_creator`/`learning_admin`.
- **Contract notes (verified against `IOS_Backend`, read-only):** `GET
/admin/blog/:id` is **bare** (not `{ data }`); the translations JSONB uses
  **snake_case** inner keys (`content_html`/`meta_description`) — mappers convert
  to camelCase; `DELETE` is a **soft-delete → archived** (labelled "Archive", not
  "Delete"); slug is **locked once published** (form shows it read-only then).
- **Translation editor scope:** authors `tr/fr/es/ar/de` (English is the canonical
  form, auto-mirrored to `translations.en` server-side). The app UI itself stays
  en/fr/ar. Empty locales are omitted from the replace-merge (left unchanged).
- **i18n:** added the `admin.blog.*` namespace + `admin.shell.nav.blog` (en/fr/ar;
  Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (`admin-blog-page` chunk 5.94 kB gzip; known raw-size budget
  warning only). Browser: `/admin/blog` correctly redirects to `/admin/login`
  (route + `adminAuthGuard` wired, lazy-load OK). **Authenticated happy path not
  yet verifiable — needs admin credentials + the Blog module deployed to
  `api-dev` (still 404s there).**

#### Follow-up refinements (per review)

- **Slug validation:** the slug field now validates kebab-case
  (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, empty allowed → backend derives) with an inline
  `ios-input` error (`admin.blog.slugError`).
- **Rich-text editor:** replaced the raw HTML `<textarea>` (English content **and**
  the per-locale translation content fields) with a new **`ios-rich-text`**
  primitive (`ui/rich-text/`, exported from `@ui`). Applies to the English content
  field and the per-locale content fields; translation-dialog labels are now
  locale-neutral (`admin.blog.tr{Title,Meta,Content}Label`).
  - **Implementation:** wraps **Quill 2** (`quill@^2.0.3`, MIT — the most widely
    used free rich-text editor). A first hand-rolled `document.execCommand` version
    was scrapped (its `formatBlock` heading buttons were unreliable) in favour of
    the library, per the user's request to "use the best free rich-text library".
    Quill is framework-agnostic vanilla JS → no Angular-21 peer-dep churn; it
    renders its own toolbar (H2/H3, bold, italic, ordered/bulleted lists,
    blockquote, link, clean) whose formats map 1:1 onto the public
    `.ios-blog-prose` renderer.
  - Binds to a `FormControl<string>` like `ios-input` (no CVA): the control's HTML
    is pasted in once via Quill's own parser (`dangerouslyPasteHTML` — not a raw
    `[innerHTML]`, §4-clean), and `text-change` writes `getSemanticHTML()` back.
    `ViewEncapsulation.None` + `.ios-rte`-scoped rules for sizing/brand borders.
  - **Bundle/deps:** `quill.snow.css` is registered in `angular.json` `styles`
    (global — adds ~2.5 kB gzip to the initial CSS on all pages; a lazy
    component-`@import` was tried but tripped the 8 kB `anyComponentStyle` budget).
    Quill's **JS stays in the lazy `admin-blog-page` chunk** (not the initial
    bundle). Added `allowedCommonJsDependencies: ['quill-delta']` to silence the
    CJS-interop build warning.
  - **Verification:** typecheck ✓ · lint ✓ · prod build ✓ (initial gzip 101 kB;
    known raw-size budget warning only). Editor visuals not yet browser-verified
    (admin-login gated); the `angular.json` styles change needs a dev-server
    restart to take effect locally.

### Phase 4 · A6 — Landing rewire (`GET /landing`, BE-I-20) — ✅ committed (`469f429`)

Replaced the dead `LandingApi.getPageData()`→null stub with a real fetch of the
now-deployed **`GET /landing`** (bare `{ featuredPrograms, stats }`, public,
`X-Lang`-localized). Verified live: 6 featured programs + `{ programs, students,
certificatesIssued }`.

- **Data-access reworked** (`features/landing/data-access/landing.*`): `dto`
  (`LandingResponseDto` = `featuredPrograms: CatalogItemDto[]` + `stats`), `model`
  (`LandingData`, `LandingStats`; `InsightPost` kept), `mappers` (`toLandingData`
  — reuses `toPublicCertificate`), `api` (Observable `getPageData()`), `store`
  (signal store: `featuredPrograms()` / `stats()` with graceful fallbacks; keeps
  `insightPosts` + `insightSectionBadge` as **static** since they have no
  `/landing` backing). Dropped the old `cohortDate` / `graduatesCount` /
  snake_case DTOs (never rendered).
- **Two new additive sections** (per reviewer choice — leaves the static sections
  untouched): **`ios-landing-stats-section`** — live counters band under the hero
  (hides on the zero/fallback state); **`ios-featured-certs-section`** — grid of
  featured-program cards (programCode, title, description, formatted price, link
  to `/certifications/:id`, "View all" CTA; hides when empty). Wired into
  `landing.page` (stats after hero; featured after the cert-levels carousel).
- **i18n:** `landing.stats.*` + `landing.featured.*` (en/fr/ar; Arabic pending pro
  review). `insights-section` `posts` input relaxed to `readonly`.
- **Verification:** typecheck ✓ · lint ✓ (3 known `prefer-ngsrc` warnings) · prod
  build ✓ (`landing-page` chunk 8.80 kB gzip; known raw-size budget warning only).
  Per request, **not browser-verified** — the local dev server was serving a stale
  bundle; restart `npm start` (dev config → api-dev) to see it render.

### Phase 4 · A7 — Dashboard real-exam history (`GET /exam/attempts`, BE-I-17) — ✅ committed (`554fbe6`)

Added the student's **real-exam attempt history** to the Dashboard overview, the
one still-missing piece of the A7 fold-in. The student `GET /insights` aggregates
were already folded in under A5 (`StudentInsightsStore`, KPI tiles + real/mock
exam summary); this pass adds the per-attempt list that previously only existed
for mock exams.

- **New data-access** (`features/dashboard/data-access/exam-attempts.*`): `dto`
  (`ExamAttemptItemDto`; `ExamAttemptsResponseDto = PagedResponse<…>`), `model`
  (`ExamAttempt`, `ExamAttemptStatus = 'submitted' | 'auto_submitted'`, plus
  `formatDuration()` → `Hh Mm`/`Mm`/`Ss` (null-safe) and `formatScore()` →
  one-decimal), `mappers` (`toExamAttempt`, narrows the status string), `api`
  (`ExamAttemptsApi.list()` → `Page<ExamAttempt>` via `toHttpParams`/`toPage`),
  `store` (`ExamAttemptsStore` — root singleton, cursor `load`/`loadMore`/`reload`,
  `isEmpty`, clears on `user.logged-out`; mirrors `PaymentsStore`'s history
  contract). `PAGE_LIMIT = 20` (backend max 100).
- **New component** `ios-exam-history` (`features/dashboard/components/exam-history.ts`):
  self-contained, reads the store, fetches page 1 on init, cursor "load more".
  States: loading · error+retry · empty · table (exam title + program, score %,
  pass/fail badge + late flag, duration, submitted date via `DatePipe`). Styled
  with the dashboard `ios-surface-muted` card language; logical props for RTL.
  Wired into `overview.page` as a section between the insights strip and the
  charts/certs area.
- **Envelope:** `{ data, meta.pagination }` (cursor, newest-first). Endpoint never
  returns the answer snapshot. Item: `{ id, examTitle, program, score, passed,
submittedAt, durationSeconds (nullable), status, lateFlag }`.
- **i18n:** `studentInsights.examHistory.*` (en/fr/ar; Arabic pending pro review).
- **Scope note:** the overview's bar/donut charts, "Valid certification" cards and
  "Complete your learning" card are still driven by the mock `DashboardStore` — the
  checklist deprioritized composing those from `/learning/progress` +
  `/payments/transactions` + `/me` now that `/insights` supersedes the aggregates.
  Left as a follow-up (would also draw on the already-built `features/credentials`
  for real certs). Flagged here, not silently dropped.
- **Verification:** typecheck ✓ · lint ✓ (3 known `prefer-ngsrc` warnings) · prod
  build ✓ (`overview-page` chunk 6.31 kB gzip; known raw-size budget warning only).
  Per request, **not browser-verified**.

### Phase 4 · A2 — Settings delete account + data export (BE-042) — ✅ committed (`c659335`)

Wired the two self-service GDPR actions on the Settings page (`@Controller('me')`,
student token). The delete dialog previously only had a cosmetic "type Delete"
gate and the page stubbed the action with a bare `auth.logout()`; both are now
real, backed by the live endpoints.

- **New data-access** (`features/settings/data-access/account.*` + a
  route-scoped store): `dto` (`DeleteAccountRequestDto`, `DeleteAccountResultDto
{ deleted, retained[], note }`), `model`, `mappers`, `api` (`AccountApi` —
  `export()` reads `GET /me/export` as a **Blob** to preserve the exact payload;
  `deleteAccount(password)` `POST /me/delete` with `withCredentials` so the
  server's refresh-cookie clear is honoured), `store` (`AccountStore` — provided
  on the settings route, tracks `exporting`/`exportError` + `deleting`/
  `deleteError`; export triggers a client download, delete returns the result or
  null). Feature-local `utils/download-blob.ts` for the anchor-download.
- **Delete = step-up re-auth:** the confirm input is now a **password** field
  (`autocomplete="current-password"`); the dialog became a controlled component
  (`pending`/`errorMessage` inputs, `confirmed` emits the password), shows a
  spinner while deleting, and surfaces a wrong-password **401** inline via
  `aria-describedby`. On success the page forces `auth.logout({ reason:
'user-initiated' })` → `/auth/login` (the account is anonymized-in-place and
  its sessions revoked server-side).
- **Export:** un-parked with a "Download my data" button (+ GDPR hint and error
  slot) in Account Preferences; downloads `ios-lms-export-<YYYY-MM-DD>.json`.
  `?includeAnswers` left default-off (omits the raw exam-answers blob).
- **i18n:** `settings.account.{export,exporting,exportHint,exportError}` and
  `settings.deleteDialog.{passwordLabel,passwordPlaceholder,deleting,error}`
  (en/fr/ar; Arabic pending pro review). Dropped the unused `typeLabel`/
  `typePlaceholder` keys.
- **Verification:** typecheck ✓ · lint ✓ (3 known `prefer-ngsrc` warnings) · prod
  build ✓ (known raw-size budget warning only). **Not browser-verified.** Note:
  `POST /me/delete` is genuinely destructive — verify against a throwaway seeded
  student, not a real account.

### Phase 4 · C2 — Cookie consent banner (BE-042) — ✅ committed (`6fddf8e`)

Added the GDPR cookie-consent banner the docs anticipated in `core/consent/`
(`06 §2.7.1`, note at `06:199`). Public + root-mounted so consent can be given
before login; records the choice to `POST /consent` as an audit trail.

- **New `core/consent/`** (root singletons + banner): `consent.model`
  (`COOKIE_POLICY_VERSION = '2026-01-01'`, `ConsentSelection`/`ConsentCategories`
  — `necessary` always true, `StoredConsent`, `toCategories()`), `consent.api`
  (`ConsentApi.record()` `POST /consent` `{ categories, policyVersion }`; public,
  fire-and-forget → `SKIP_RETRY` + `SUPPRESS_ERROR_TOAST`; bearer auto-attaches
  when logged in so the backend links the record), `consent.store`
  (`ConsentStore` — decides visibility from the persisted choice vs. the current
  policy version, `acceptAll` / `rejectNonEssential` / `save(selection)` /
  `reopen`), `cookie-consent-banner` (`ios-cookie-consent-banner`). Exported via
  `core/consent/index.ts` → `core/index.ts`.
- **Placement rationale:** banner lives in `core/` (not `ui/`) because it's global
  app chrome inseparable from the consent singleton and root-mounted — matches the
  doc's "to be added in `core/consent/`" note. Mounted in `app.ts`/`app.html`
  alongside the `<router-outlet />`.
- **Privacy-preserving:** all non-essential categories default **OFF**; nothing is
  recorded until the user explicitly picks Accept all / Reject non-essential /
  Save preferences. "Manage preferences" reveals per-category toggles (necessary
  locked-on, analytics, marketing). Links to `/privacy-policy`.
- **Persistence:** the choice + `policyVersion` + `decidedAt` are stored in
  `localStorage` (key `ios.cookie-consent`) so the banner stays dismissed until
  the policy version bumps. Uses the same **sanctioned §2.7.1 UI-pref exception**
  as `LanguageService` (per-line `eslint-disable no-restricted-globals -- …not
tokens/PII`); wrapped in try/catch for private-mode. No read endpoint exists,
  so local persistence is what prevents re-prompting.
- **A11y:** labelled `role="region"`; native checkboxes with visible labels;
  `:focus-visible` rings; `z-40` (below the `z-50` dialogs).
- **i18n:** `consent.*` (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (3 known `prefer-ngsrc` warnings) · prod
  build ✓ (banner is in the initial bundle: +~2 kB gzip → ~103 kB; known raw-size
  budget warning only). **Not browser-verified.**

## Auth-route → backend endpoint map

| Frontend route           | Page                    | Backend call                                                                                                                                                                                     |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/auth/login`            | `login.page`            | `POST /auth/login`                                                                                                                                                                               |
| `/auth/register`         | `register.page`         | `POST /auth/register`                                                                                                                                                                            |
| `/auth/forgot-password`  | `reset-password.page`   | `POST /auth/forgot-password`                                                                                                                                                                     |
| `/auth/new-password`     | `new-password.page`     | `POST /auth/reset-password`                                                                                                                                                                      |
| `/auth/complete-account` | `complete-account.page` | **Not wired (stub)** — blocked: `PATCH /me` has no date-of-birth field but the wizard's step 1 collects a birthday (**BE-I-25**), plus a cross-feature `ProfileApi` boundary decision. Deferred. |
| (app boot / 401)         | `AuthStore`             | `POST /auth/refresh` · `POST /auth/logout`                                                                                                                                                       |

## Backend ↔ Frontend reconciliation (full rescan 2026-07-22)

Complete endpoint sweep of **IOS_Backend** (27 controllers) against the
frontend's `*.api.ts` consumers. Legend: **✅ wired** (FE consumes it) · **❌
BE-ready, FE-missing** (endpoint deployed, no FE) · **⚙️ backend/infra** (no FE
surface by design).

### By domain

| Domain                              | Endpoints                                                                                                                                                       | Status                                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth (student)**                  | `POST /auth/register`, `/login`, `/forgot-password`, `/reset-password`, `/resend-verification`, `/refresh`, `/logout`                                           | ✅ wired                                                                                                                                                                                  |
| **Auth — email verify**             | `POST /auth/verify-email`, `/auth/resend-verification`                                                                                                          | ✅ wired — `/auth/verify-email` page (token verify + resend); `complete-account` profile wizard still deferred                                                                            |
| **Auth — admin OTP (C1)**           | `POST /auth/admin/login` (basic call exists), `/auth/admin/login/otp`, `/auth/admin/refresh`, `/auth/admin/logout`                                              | ✅ **wired — awaiting security review**: two-step OTP + admin-aware logout (`core/auth`). Refresh kept on shared `/auth/refresh` (see note)                                               |
| **Profile** `/me`                   | `GET /me`, `GET /me/certificates`, `PATCH /me`, `PATCH /me/password`, `POST /me/avatar-upload-url`                                                              | ✅ wired (A1, A3)                                                                                                                                                                         |
| **GDPR**                            | `GET /me/export`, `POST /me/delete`, `POST /consent`                                                                                                            | ✅ wired (A2, C2)                                                                                                                                                                         |
| **Analytics**                       | `GET /admin/dashboard/overview`, `GET /insights`, `GET /landing`                                                                                                | ✅ wired (B6, A5/A7, A6)                                                                                                                                                                  |
| **Blog**                            | public `GET /blog`, `/blog/:slug`; admin CRUD + publish/translations                                                                                            | ✅ wired (BLOG-PUBLIC, BLOG-ADMIN)                                                                                                                                                        |
| **Catalog**                         | public `GET /catalog`, `/catalog/:id`, `/catalog/:id/outline`; admin CRUD + translations                                                                        | ✅ wired (B8, catalog translations)                                                                                                                                                       |
| **Certificates**                    | public `GET /verify/:certId`; admin `GET /admin/certs/issued`, `PATCH …/revoke`                                                                                 | ✅ wired (B2, exam-verify)                                                                                                                                                                |
| **Notifications**                   | `GET /notifications`, `/unread-count`, `POST /:id/read`, `/read-all`                                                                                            | ✅ wired (A4)                                                                                                                                                                             |
| **Payments (student)**              | `POST /payments/checkout`, `/retake`, `GET /payments/transactions`                                                                                              | ✅ wired                                                                                                                                                                                  |
| **Promo (admin)**                   | `/admin/promo-codes` CRUD                                                                                                                                       | ✅ wired (B4)                                                                                                                                                                             |
| **Staff (admin)**                   | `/admin/staff` CRUD + deactivate                                                                                                                                | ✅ wired (B3)                                                                                                                                                                             |
| **Users (admin)**                   | `/admin/users`, `/:id`, `/:id/attempts`, `/:id/access-codes`, revoke                                                                                            | ✅ wired                                                                                                                                                                                  |
| **Audit (admin)**                   | `GET /admin/audit-logs`                                                                                                                                         | ✅ wired                                                                                                                                                                                  |
| **Learning-admin**                  | modules/lessons CRUD, `GET /admin/certs/:id/curriculum`, lesson-quiz CRUD                                                                                       | ✅ wired (B1, B5)                                                                                                                                                                         |
| **Exam-authoring (admin)**          | certs/exams CRUD, questions, publish/unpublish, translations                                                                                                    | ✅ wired (B7). `GET /admin/exams/:examId/preview` — ❌ not wired (minor)                                                                                                                  |
| **Exam assign (admin)**             | `GET /admin/exam`, `POST /admin/exam/assign`                                                                                                                    | ✅ wired                                                                                                                                                                                  |
| **Mock-authoring (admin)**          | `/admin/mock/certs/:certId/questions`, `/admin/mock/questions` CRUD                                                                                             | ✅ wired                                                                                                                                                                                  |
| **Real-exam history**               | `GET /exam/attempts`                                                                                                                                            | ✅ wired (A7)                                                                                                                                                                             |
| **⭐ Real-exam engine (student)**   | `POST /exam/pre-exam-confirmation`, `/validate-access`, `/start`, `GET /exam/sessions/:id`, `POST …/autosave`, `…/submit`, `…/late-submit` (+ exam WS)          | ✅ **wired & committed `b951242`** — architect review pending. `pre-exam-confirmation` still unreachable (BE-I-24); review UI disabled (BE-I-22); resume uses a local snapshot (BE-I-23). |
| **⭐ Mock-exam runner (student)**   | `POST /mock/start`, `GET /mock/history`, `/mock/attempts/:id`, `/mock/:id`, `POST …/autosave`, `…/extend`, `…/submit`, `…/questions/:qid/reveal` (+ `/mock` WS) | ✅ **wired & committed** — data-access `37b5c57`, runner/result `f4752ad`, history page `6d9e406`, `/mock` Socket.IO timer `904a478`.                                                     |
| **⭐ Learning / courses (student)** | `GET /learning/certs/:certId/curriculum`, `/learning/lessons/:id`, `/learning/lessons/:id/quiz`, `POST …/quiz/check`, `…/complete`, `GET /learning/progress`    | ✅ **wired & committed `172f35a`** — `features/courses` data-access + index/curriculum/lesson pages.                                                                                      |
| **🆕 CMS (public + admin)**         | public `GET /cms/pages/:slug`, `/cms/globals/:key`; admin `admin/cms/pages\|sections\|globals` (+ publish/reorder/translations)                                 | ❌ **BE-ready, FE-missing** — merged `3e52625` (2026-07-22); no `*.api.ts` references `/cms`. Gaps: BE-I-26/27/28.                                                                        |
| **Payments webhook / health / web** | `POST /payments/webhook`, `/health*`, `web` redirect pages                                                                                                      | ⚙️ backend/infra — no FE                                                                                                                                                                  |

> **Matrix refreshed 2026-07-25** against frontend HEAD `904a478` and backend HEAD
> `72a711c`. Two rows above changed meaning since the 2026-07-22 rescan: the
> **Analytics** row is now only _partly_ exercised (`from`/`to` unused by
> `dashboard.api.ts:27`), and the **Users (admin)** row consumes `counts` only —
> the backend now also returns `certificates[]`, `attempts[]` and
> `exams.{assigned,purchases}` (`72a711c`).

### Done from BE side, NOT done from ours (the plan backlog — refreshed 2026-07-25)

Ordered by size/impact. Everything below is deployed on the backend and blocked
only on **frontend** work:

1. **⭐ Real-exam engine (student)** — ✅ **DONE — committed `b951242`
   (2026-07-24); architect review still pending.** Full `features/assessments`
   data-access (`exam.api` + `exam-session.store` + `exam-session.ws` Socket.IO +
   IndexedDB drafts/snapshot), runner/result/verify/ready UI, `/run/:sessionId`
   routing, and the 7-day sweep. Reconciled to the live backend (BE-I-22/23/24
   filed — all three still open). See the Slice 1–5b entries above.
2. **⭐ Learning / courses (student)** — ✅ **DONE — committed `172f35a`.**
   `features/courses` data-access + index/curriculum/lesson pages (curriculum
   browser, lesson viewer with sanitised HTML + signed-URL video + mark-complete,
   self-check quiz + check). **Follow-up still open:** the student dashboard
   overview can now drop the hardcoded `DashboardStore` for `GET /learning/progress`.
3. **⭐ Mock-exam runner (student)** — ✅ **DONE** — data-access `37b5c57`,
   runner/result UI `f4752ad`, practice-**history** page `6d9e406`, and the
   server-authoritative `/mock` Socket.IO timer `904a478` (both former follow-ups
   are now shipped). Reveal/extend/soft-timer practice flow; entry via the courses
   curriculum "Practice test" action.
4. **C1 — Admin OTP login** — ✅ **DONE — committed `ae6ae44`; MUST still pass
   architect + security review before shipping** (`core/auth`, CLAUDE §8/§13). Two-step OTP
   (challenge branch in `AuthStore.loginAdmin` + `verifyAdminOtp`/`cancelAdminOtp`),
   admin-aware `logout` (routes to `/auth/admin/logout` + `/admin/login`), and the
   admin-login OTP UI. **Refresh routing decision:** left on the shared
   `/auth/refresh` per the existing `auth.api.ts` comment ("serves both students
   and admins — branches on the token's `type` claim"); `/auth/admin/refresh` was
   NOT wired. Security review MUST confirm this (else switch the interceptor's
   refresh to `/auth/admin/refresh` for admin sessions using `isAdminSession`).
5. **Email verification** — ✅ **DONE — committed `9e06730`**: `/auth/verify-email`
   page verifies the token (`POST /auth/verify-email`, new `AuthApi.verifyEmail`,
   `auth.api.ts:145-160`) and offers resend (`/auth/resend-verification`).
   ⚠️ touches `core/auth` (new API method) — flag for architect + security review.
   The **`complete-account` profile wizard** (→ `PATCH /me`) is still a simulated
   stub (`complete-account.page.ts:947`) — blocked by **BE-I-25**, see below.
6. **🆕 CMS surface (public + admin)** — ❌ **NOT STARTED.** Merged on the backend
   `3e52625` (2026-07-22). See
   [New backend surface: CMS](#new-backend-surface-cms-3e52625--no-fe-consumer-yet).
7. **BE-I-29 — lesson `contentText` fix** — ❌ **NOT DONE, breaks admin lesson
   creation today.** See the task entry below.
8. **Minor** — exam-authoring **preview** (`GET /admin/exams/:examId/preview`);
   admin dashboard `from`/`to` window; admin student-detail lists.

### New backend surface: CMS (`3e52625`) — no FE consumer yet

The backend merged a **typed-section CMS** on 2026-07-22 (public
`GET /cms/pages/:slug` + `GET /cms/globals/:key`; admin `admin/cms/*` with pages,
sections, globals, publish gate, reorder and translations; 16 section types; a
seed of 8 pages including `home`, `about*`, `why-scrum`, `contact`, `privacy`,
`terms`). Full inventory:
[`backend-analysis.md` §6.9b](./backend-analysis.md#69b-latest-backend-sync-2026-07-25b--cms-module-blog-fix-analytics-window).

Re-verified 2026-07-27: **nothing in `src/app` references `/cms`.** This is
**Stage 2**, planned slice-by-slice in
**[`cms-frontend-plan.md`](./cms-frontend-plan.md)** — 11 slices covering:

1. **Slice 1 — landing regression (BE-I-30)**, the P0 fix.
2. **Slices 2–8 — CMS-PUBLIC:** data-access (a discriminated union on section
   `type`), page shell + routing, the 16 section components in two batches, the
   `seo`/`jsonLd` block, dynamic `certifications`/`journal` (pre-hydrated — never
   refetch), the `contact_form` → `POST /contact` (now real, **BE-I-26 fixed**),
   nav/footer/announcement globals, then the home cutover.
3. **Slices 9–10 — CMS-ADMIN:** pages list/editor with the 409 `SLUG_LOCKED` /
   `SYSTEM_PAGE_PROTECTED` / `CMS_PAGE_NOT_PUBLISHABLE` paths surfaced (B7 idiom),
   the per-type section editor with reorder + translations, globals, and the new
   `/admin/contact` inbox.
4. **Slice 11 — hardening** (a11y, RTL, budgets, `/simplify` pass).

**Decisions settled since this section was first written:** the `/landing` vs
`/cms/pages/home` question is moot — `GET /landing` was **deleted** (`66a7632`,
BE-I-30), so CMS owns static home content, `GET /catalog` owns featured programs
and `GET /analytics/public-stats` owns the counters. **Remaining constraints:**
image fields stay pasted URLs (**BE-I-27**, narrowed — catalog images now have an
upload URL) and there is no true draft preview (**BE-I-28**) — state both in the
UI rather than faking them.

### BE-I-29 — admin lesson creation now 400s (FE fix owed)

`72a711c` made `contentText` **required and non-empty** on `CreateLessonDto`
(`IOS_Backend/src/modules/learning/dto/lesson.dtos.ts:41-49`). The FE deliberately
omits the key when the field is blank
(`features/admin/data-access/curriculum.mappers.ts:83-94`), so creating a lesson
with an empty body — previously accepted — now fails validation.

**Fix:** mark the lesson-content control required in `admin-curriculum.page.ts`
(`lessonForm`, ~`:526`), add the i18n error string (en/fr/ar), and always send
`contentText` from `toCreateLessonBody()`. Small, self-contained; no architecture
impact.

### Blog authoring (BE-I-21) — unblocked, re-test owed

The backend fixed the create/rollback bug on 2026-07-21 (`30bfff5`:
`blog.service.ts:196-198` returns the in-hand entity; `d7a78e6` fixed the list
query). The FE (`5404e77` admin authoring, `1940501` public blog) was already
built against the correct contract, so **no code change is expected** — what is
owed is an **E2E re-test against api-dev**: create draft → edit → translations →
publish → read on the public blog; confirm the create response's `authorName` is
`null` until the next read (cosmetic, FE refetches).

### Everything else = reconciled

All committed FE work maps 1:1 to a live backend endpoint. Two mock-data pockets
survive and are tracked in [Remaining tasks](#remaining-tasks-high-level): the
student dashboard overview's `DashboardStore` and the legacy
`/dashboard/certificates` demo pages.

## Remaining tasks (high level)

**User-facing FE gaps (BE-ready — see reconciliation above):** ~~real-exam engine~~
(committed `b951242`), ~~learning/courses~~ (`172f35a`), ~~mock-exam runner~~
(`37b5c57`/`f4752ad`/`6d9e406`/`904a478`), ~~email verify~~ (`9e06730`), ~~C1 admin
OTP~~ (`ae6ae44` — **security review pending**). All primary Phase-4 student + auth
surfaces are wired.

**Open FE backlog (updated 2026-07-27 — items 1, 4, 8, 9 closed by `1c2fcdb` /
`4a11ae9`; three new items from the 2026-07-26/27 backend merges):**

| #     | Task                                                            | Why now                                                                                                                                                                                                              | Blocked by                                                                |
| ----- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ~~0~~ | ~~**BE-I-30 — landing repoint**~~                               | ✅ done 2026-08-01 — `LandingApi` → `GET /analytics/public-stats`; featured programs from the shared `PublicCatalogStore`. **Correction:** the page never visibly 404'd (both consumers were commented out in `f3c425d`) — the symptom was a failing background request. Done with **no** CMS work | —                                                                         |
| ~~1~~ | ~~**BE-I-29 — lesson `contentText` required**~~                 | ✅ done — fixed by `1c2fcdb` (verified 2026-07-26, not re-done)                                                                                                                                                       | —                                                                         |
| 2     | **CMS-PUBLIC** — CMS section renderer for the marketing site    | Whole new backend surface (`3e52625`) with zero FE consumption                                                                                                                                                       | Unblocked — **BE-I-26 fixed** (`2976be0`) and the `/landing` question is settled (it's gone). Plan Slices 2–8 |
| 3     | **CMS-ADMIN** — page/section/globals editor                     | Whole new backend surface with zero FE consumption                                                                                                                                                                   | ⬜ **Not built.** Built and **rolled back** 2026-07-29 — see the top entry. Plan Slices 9–10. Degraded when rebuilt by **BE-I-27** (no CMS media upload), **BE-I-28** (no draft preview), **BE-I-31** (conflict sentinels aren't codes) |
| 3b    | ~~**Admin contact inbox** (`/admin/contact`)~~                  | The `2976be0` inbox had no FE consumer                                                                                                                                                                               | 🟢 **Built & staged 2026-07-29** — kept when the CMS work was rolled back; independent of it                                                                                                                          |
| ~~4~~ | ~~**Student dashboard overview → real data**~~                  | ✅ done — `4a11ae9` (2026-07-26): `validCertifications`/`monthlyScores`/`examSummary`/`learningCard` now real                                                                                                          | —                                                                         |
| 5     | **Blog E2E re-test** (BE-I-21 fixed by `30bfff5`)               | Authoring was never verified against a working backend                                                                                                                                                               | needs api-dev credentials                                                 |
| 6     | **`complete-account` wizard**                                   | Still a stub (`complete-account.page.ts:947`)                                                                                                                                                                        | **BE-I-25** (no DOB field) + a `ProfileApi` boundary decision             |
| 7     | **Legacy `/dashboard/certificates` demo pages**                 | 🔵 **Decision taken 2026-08-01: rewire** (not retire). All three pages now read real `/learning/*` data and the duplicate `/courses` pages are deleted — see the top entry. **Remaining:** strip the `ESM_P_*` fixtures from `certificates.store.ts` and settle the Overview tiles that have no backend source | —                                                                         |
| ~~8~~ | ~~**Admin dashboard date window** (`from`/`to`, `72a711c`)~~    | ✅ done — `AdminDashboardApi.getOverviewByDateRange` + `AdminDashboardStore.setDateRange` shipped in `1c2fcdb`                                                                                                        | —                                                                         |
| ~~9~~ | ~~**Admin student detail enrichment**~~                         | ✅ done — `StudentDetail.certificates[]/attempts[]/exams{}` mapped in `1c2fcdb`                                                                                                                                       | —                                                                         |
| ~~10~~ | ~~**Exam-authoring preview**~~                                 | ✅ done 2026-07-29 — replaced the client-side faux-preview with the real endpoint                                                                                                                                     | —                                                                         |
| ~~11~~ | ~~**Real-exam answer review UI**~~                             | ✅ done 2026-08-01 — `ios-exam-review-page` at `/assessments/review/:attemptId`, linked from the dashboard exam history. **Not** on the result page: that route is keyed by `sessionId` and submit returns no attempt id (**BE-I-32**, filed)                            | —                                                                         |
| ~~12~~ | ~~**Catalog image picker**~~                                   | ✅ done 2026-07-29 — presigned upload wired into the B8 form, A1 pattern reused, `requiredHeaders` echoed. Upload requires a saved certificate (endpoint 404s an unknown id)                                           | —                                                                         |
| **13** | **SEO — render `seo.jsonLd`** on blog/catalog detail pages     | `43bd2d8` embeds schema.org JSON-LD in blog (`blog.service.ts:550`) and catalog (`catalog.service.ts:461`) detail responses; nothing renders it. CMS pages are covered by plan Slice 5. | `sitemap.xml`/`robots.txt` need an **edge rewrite** (infra, not FE)       |

**Known backend blockers (see [`backend-blockers-report.md`](./backend-blockers-report.md)):**
**BE-I-25** (no DOB → task 6 cannot ship), **BE-I-27/28** (CMS media upload + draft
preview → cap task 3), and **BE-I-23/24** (real-exam resume + entry `certId` —
already shipped around). **No longer blockers:** BE-I-21 (`30bfff5`), **BE-I-22**
(`66a7632`) and **BE-I-26** (`2976be0`) — all three are now *frontend* follow-ups
(tasks 11, 2/3 above). **BE-I-30 is a new, live regression** — task 0.

**Cross-cutting:** Arabic i18n still needs professional review across all shipped
screens; testing remains deferred per SOW §6.2.14. Two reviews are outstanding:
**C1 security review** (`core/auth`, `ae6ae44`) and the **architect review of the
real-exam engine** (`b951242`).

---

## Backend analysis status

✅ **Complete.** See [`backend-analysis.md`](./backend-analysis.md). Derived
exclusively from backend source (Swagger ignored). Backend is READ-ONLY and was
not modified.

## Frontend infrastructure status

✅ **Complete** (corrected 2026-07-25 — the previous "feature API services not yet
built" line was stale; 28 `*.api.ts` services exist on `feat/real-backend-integration`).

- HTTP core (interceptors auth → locale → retry → error) real-backend-ready.
  **Mock interceptor removed.**
- Auth core **fully wired to the real `/auth/*` API** (login, register, refresh,
  logout, forgot-password, reset-password, resend-verification, **verify-email**,
  **admin OTP verify**, **admin logout**; cookie-based refresh; RBAC in the real
  role space). All `features/auth` pages mapped.
- Feature API services **built**: `core/auth`, `core/consent`, admin (audit, blog,
  catalog, curriculum, dashboard, exam-assign, exam-authoring, issued-certs, mock,
  promo, quiz, staff, users), assessments (`exam.api` + `exam-session.ws`),
  certificates (`mock.api` + `mock-session.ws`), courses, credentials,
  dashboard (insights, exam-attempts), insights, landing (catalog + landing),
  notifications, payments, profile, settings.
- **No API service exists for `/cms`** — the only unconsumed backend module.

## Admin pages status

✅ **All previously-built admin pages remain built & committed.** The two pages
that were backend-blocked are **now unblocked** (Curriculum — BE-I-13;
Certificate revocation — BE-I-15), and **four new admin pages** are now possible
(staff, promo codes, lesson-quiz authoring, dashboard metrics). See
[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md) §B.

| #   | Admin page                                                | Status                          | Backend                                                                               |
| --- | --------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Admin Login** (`/admin/login`)                          | ✅ Built — ⚠️ needs OTP step    | `POST /auth/admin/login` (+ `login/otp`) — now two-step OTP (`e97de75`, checklist C1) |
| 2   | **Catalog — certificates list** (`/admin/catalog`)        | ✅ Built & committed            | `GET /admin/catalog`                                                                  |
| 2b  | **Catalog — create / edit / deactivate**                  | ✅ Built (B8 card fields added) | `GET/POST/PATCH/DELETE /admin/catalog` (BE-I-04 card fields now editable, B8)         |
| 2c  | **Catalog — title/description translations** (ar/fr)      | ✅ Built & committed            | `PATCH /admin/catalog/:id/translations`                                               |
| 3   | **Users — list + student detail** (`/admin/users`)        | ✅ Built & committed            | `GET /admin/users`, `GET /admin/users/:id`                                            |
| 3b  | **Users — attempts / access codes / revoke**              | ✅ Built (review pending)       | `/admin/users/:id/attempts`, `.../access-codes`, `.../revoke`                         |
| 4   | **Curriculum (modules/lessons)**                          | ✅ Built (review pending)       | `GET /admin/certs/:id/curriculum` (all statuses) + existing module/lesson CRUD (B1)   |
| 4b  | **Lesson-quiz authoring**                                 | ✅ Built (review pending)       | `/admin/lessons/:id/quizzes`, `/admin/quizzes/*` (BE-I-06, checklist B5)              |
| 5   | **Exam authoring — list + lifecycle** (`/admin/exams`)    | ✅ Built & committed            | `GET/POST /admin/certs/:id/exams`, `PATCH/DELETE/publish/unpublish /admin/exams/:id`  |
| 5b  | **Exam authoring — question editor** (`/admin/exams/:id`) | ✅ Built — ⚠️ show reasons[]    | `GET /admin/exams/:id`, `…/questions*`; publish `reasons[]` now available (B7)        |
| 5c  | **Exam title translations** (ar/fr)                       | ✅ Built & committed            | `PATCH /admin/exams/:id/translations`                                                 |
| 6   | **Exam assignment** (`/admin/exam`)                       | ✅ Built & committed            | `GET /admin/exam`, `POST /admin/exam/assign`                                          |
| 7   | **Mock questions** (`/admin/mock`)                        | ✅ Built & committed            | `GET/POST/PATCH/DELETE /admin/mock*`                                                  |
| 8   | **Audit logs** (`/admin/audit-logs`)                      | ✅ Built & committed            | `GET /admin/audit-logs`                                                               |
| 9   | **Certificate revocation**                                | ✅ Built (review pending)       | `GET /admin/certs/issued` + `PATCH /admin/certs/issued/:id/revoke` (B2)               |
| 10  | **Admin staff management**                                | ✅ Built (review pending)       | `/admin/staff` (super_admin, BE-I-03, checklist B3)                                   |
| 11  | **Promo codes**                                           | ✅ Built (review pending)       | `/admin/promo-codes` (super/finance admin, BE-I-05, checklist B4)                     |
| 12  | **Dashboard metrics** (`/admin` home)                     | ✅ Built (review pending)       | `GET /admin/dashboard/overview` (super/finance admin, BE-I-07, checklist B6)          |

**Page 12 — Admin dashboard analytics / B6 (committed `9559ec1`):**

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

**Page 4 — Curriculum management / B1 (committed `7268d26`):**

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

**Page 9 — Certificate revocation / B2 (committed `451af2a`):**

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

**Page 10 — Admin staff management / B3 (committed `6f09077`):**

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

**Page 11 — Promo-code management / B4 (committed `3ea7e28`):**

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

**Page 4b — Lesson-quiz authoring / B5 (committed `0d95e6e`, restyle `d1ce3e8`):**

Sixth admin-pivot item, extends B1. New page `/admin/lessons/:lessonId/quizzes`
(BE-I-06), reached from a **"Quizzes"** link on each lesson row in the curriculum
page. Manage a lesson's quizzes and their questions (MCQ or free-text) — the
authoring view exposes `correctAnswer` (student endpoints strip it). All
responses are `{ data }` (no pagination). Create/edit quiz + add/edit question =
content_creator / learning_admin; deactivate quiz + delete question =
learning_admin only (backend-enforced; mirrored in the UI via `canAuthor` /
`canDelete`).

- **`features/admin/data-access/quiz.*`** — standard layering:
  - `quiz.dto.ts` / `quiz.model.ts` — `Quiz` (`id/lessonId/title/active/
createdAt/updatedAt/questions[]`), `QuizQuestion` (`questionText`,
    `correctAnswer`, `options[]|null`, `position`), `isMcq`, `QuestionDraft`,
    `QUIZ_MIN_OPTIONS`.
  - `quiz.mappers.ts` — `toQuiz`/`toQuizQuestion`; question body builders (create
    omits `options` for free-text; update always sends `options` — empty array
    converts to free-text, per the backend "supplying options replaces the set").
  - `quiz.api.ts` — `AdminQuizApi`: `listByLesson`, `createQuiz`, `updateQuiz`
    (title/active), `deleteQuiz` (soft-delete), `addQuestion`, `updateQuestion`,
    `deleteQuestion`.
  - `quiz.store.ts` — `AdminQuizStore`: one lesson's quiz tree; quiz CRUD +
    deactivate/reactivate and question CRUD; every mutation refetches the tree;
    `actionPendingId` keys spinners by quiz/question id (or `new`/`q-new-<quizId>`).
    Cleared on `user.logged-out`.
- **Page** (`admin-lesson-quizzes.page.ts`) — back-link + lesson title (from a
  `?title=` query param passed by the curriculum link); quiz cards (title, active
  badge, question list with the correct option/answer marked) with rename /
  deactivate / reactivate; per-question edit + delete. Question dialog: text +
  a **MCQ / free-text toggle** — MCQ uses a `FormArray` of options (≥2) with a
  radio for the correct one (mirrors the exam-question editor); free-text uses a
  single answer field. Client-side checks (≥2 non-empty options, correct ∈
  options) back up the server rules. Backdrop-scroll dialogs.
- **Curriculum link:** the B1 curriculum page's lesson rows gained a "Quizzes"
  link (`RouterLink`, gated to `canManage`) → the quiz page with the lesson title.
- **Routing:** child route `/admin/lessons/:lessonId/quizzes` (no nav item — it's
  reached from the curriculum page, not the sidebar).
- **i18n:** new `admin.quiz.*` namespace + `admin.curriculum.quizzes` (en/fr/ar;
  Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 pre-existing `prefer-ngsrc`
  warnings) · build ✓ (known raw-size budget warning only; gzip initial 96.21 kB;
  `admin-lesson-quizzes-page` chunk 5.70 kB gzip). Live check needs a real
  content_creator/learning_admin session — deferred (no admin creds in-session).

**Page 5 update — B7: exam publish `reasons[]` (committed `0db202e`):**

Small fix (BE-I-14). The publish gate returns `409 EXAM_NOT_PUBLISHABLE` with the
failing checks in the RFC-7807 `errors[]` (each `{ code:'NOT_PUBLISHABLE',
message }`) — these are now surfaced instead of only the generic "not publishable"
message. The earlier note claimed the exception filter dropped `reasons[]`; it
doesn't (they're in `errors[]`), so the note was stale.

- **`exam-authoring.store.ts`** — a local `publishReasonsFrom(err)` reads the
  `errors[].message` list from the 409 body (kept **in-feature**, not added to
  `@core/http`, to avoid a protected-file change per CLAUDE.md §13). `publish()`
  captures them into a new `publishReasons` signal (cleared by every other action
  - `clearActionError`/`setCert`/`save`).
- **`admin-exam-authoring.page.ts`** — when a publish fails, the generic error is
  followed by a bulleted list of the exact failing checks.
- **i18n:** `admin.examAuthoring.notPublishable` (en/fr/ar; Arabic pending review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 known `prefer-ngsrc`
  warnings) · production build ✓ (`npx ng build --configuration production`; gzip
  initial 96.25 kB; known raw-size budget warning only). Live check needs a
  content_creator/learning_admin session — deferred.

> **Build-script note (not a B5/B7 change):** `package.json`'s `build` script is
> currently `ng build --configuration development` (committed outside this
> session), so plain `npm run build` no longer produces/verifies the **production**
> bundle or budgets. Use `npx ng build --configuration production` (or `build:uat`/
> `build:test`) to check prod. Flagged for the team to confirm whether that change
> was intentional.

**Page 2b update — B8: catalog card fields (committed `9b18571`):**

Final admin-pivot item (BE-I-04). The `Create/UpdateCertificateDto` now accept
five catalog-card fields — added to the admin-catalog form + data-access.

- **`catalog.dto.ts`** — `CatalogItemDto` gains `badgeImageUrl`/`track`/`level`/
  `durationHours`/`syllabusUrl` (all nullable, mirroring the backend response).
- **`catalog.model.ts`** — `CERT_LEVELS` (`foundation`/`practitioner`/`authority`)
  - `CertLevel`/`isCertLevel`; the fields added to `AdminCertificate` and to
    `CertificateWritePayload` (dropped the stale "BE-I-04 fields not accepted" note).
- **`catalog.mappers.ts`** — maps the five fields (`level` guarded → known enum or
  null).
- **`admin-catalog-form.page.ts`** — badge-URL + syllabus-URL (url inputs), track
  (text), duration-hours (integer-validated text), and a **level `ios-select`**
  (— None — / Foundation / Practitioner / Authority). Prefilled on edit; sent in
  the write payload. Nullable strings + `level` send `null` to clear;
  `durationHours` is **omitted when blank** (the backend coerces `null → 0`, so a
  blank field preserves the value rather than clearing — documented limitation).
- **`?active=false` filter:** re-checked — `AdminCatalogApi.list` passes it via
  `toHttpParams` (stringifies the boolean) and the backend now parses it correctly
  (`5133b4e`); **no client-side workaround existed**, so no code change needed.
- **i18n:** new `admin.catalog.form.{badge,syllabus,track,duration,level}*` keys
  (en/fr/ar; Arabic pending pro review).
- **Verification:** typecheck ✓ · lint ✓ (0 errors; 3 known `prefer-ngsrc`
  warnings) · production build ✓ (`npx ng build --configuration production`; gzip
  initial 96.25 kB; known budget warning only). Live check needs a
  content_creator/learning_admin session — deferred.

**Page 2c — Catalog translations (committed `50fc688`):**

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

**Page 3 — Users list + student detail (committed `f1f5013`):**

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

**Page 3b + list sort (committed `af4e917`):**

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

**Page 2 — Catalog list (committed `60a072c`):**

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

**Page 2b — Catalog create / edit / deactivate (committed `9499fec`):**

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

**Resolved by the backend:** BE-I-03/04/05/06/07/08/11/13/14/15/16/17/18/19/20
(2026-07-13 wave) and **BE-I-21** (`30bfff5`, 2026-07-21 — blog create no longer
404s/rolls back).

**Still open and affecting us (2026-07-25):**

- ~~**BE-I-22**~~ ✅ **resolved** (`66a7632`) — `GET /exam/attempts/:attemptId/review`; the review UI is now an FE task, not a blocker.
- **BE-I-23** `GET /exam/sessions/:id` returns no questions → resume relies on a
  local IndexedDB snapshot.
- **BE-I-24** no `certId` at exam entry → `pre-exam-confirmation` unreachable.
- **BE-I-25** no date-of-birth storage → `complete-account` wizard cannot ship.
- ~~**BE-I-26**~~ ✅ **resolved** (`2976be0`) — `POST /contact` + `/admin/contact`.
- **BE-I-27 / 28** CMS gaps: no media upload for section images or blog bodies
  (narrowed — catalog images gained an upload URL in `66a7632`), no draft preview.
- **BE-I-30** _(filed 2026-07-27)_ ⛔ `GET /landing` deleted — the landing page
  404s until Slice 1 of [`cms-frontend-plan.md`](./cms-frontend-plan.md) lands.
- ~~**BE-I-29**~~ ✅ **FE fix shipped** (`1c2fcdb`, 2026-07-26) — the admin lesson
  form now sends `contentText`.

**Behavioural notes (unchanged):**

- **BE-I-01 / BE-I-12** No global response envelope; validation errors return 400
  with `code`, exam domain-state conflicts return 409 (`5c11460`) → map per
  endpoint, branch on `code`.
- **BE-I-02** Refresh cookie is `SameSite=Lax` (not `Strict`); `Secure` only in prod/staging.
- **BE-I-09 / BE-I-10** Info-only (duplicate exam-list endpoints; `/health` routing).

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

_(refreshed 2026-07-25 — the old "none blocking Phase 2" note was three phases stale.)_

- **BE-I-25** — `complete-account` wizard cannot be faithfully wired (no DOB field).
- **BE-I-27 / BE-I-28** — CMS admin editor will ship without media upload or a true
  draft preview.
- **BE-I-30** ⛔ — `GET /landing` was deleted (`66a7632`); the landing page 404s
  until it is repointed (Slice 1 of the CMS plan).
- **Process, not backend:** C1 (`ae6ae44`) must not ship before the **security
  review** of the `core/auth` changes; the real-exam engine (`b951242`) is awaiting
  **architect review**; live verification of the exam/mock/courses flows needs a
  real enrolled student + token against api-dev (not available in-session).

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
   super/finance admin) — **committed (`9559ec1`)**: KPI tiles +
   monthly-revenue chart + top-programs list on the admin home, 6M/12M/24M
   window, role-gated. Full page build (data-access + wired screen). See "Page 12
   — Admin dashboard analytics / B6" under "Admin pages status" below.
6. ✅ **B1 — Curriculum management** (`GET /admin/certs/:id/curriculum` + module/
   lesson CRUD) — **committed (`7268d26`)**: new `/admin/curriculum`
   page — cert picker → module/lesson tree with create/edit/reactivate/deactivate,
   active-first. Translation editor + lesson-quiz authoring (B5) deferred. See
   "Page 4 — Curriculum management / B1" below.
7. ✅ **B2 — Certificate revocation** (`GET /admin/certs/issued` + existing revoke)
   — **committed (`451af2a`)**: new `/admin/issued-certs` page —
   cursor list + confirm-guarded revoke, super/learning admin. See "Page 9 —
   Certificate revocation / B2" below.
   7b. ✅ **B3 — Admin staff management** (`/admin/staff`, super_admin) — **committed
   (`6f09077`)**: list/create/edit/deactivate staff, super_admin
   rows protected. See "Page 10 — Admin staff management / B3" below.
   7c. ✅ **B4 — Promo codes** (`/admin/promo-codes`, super/finance admin) — **committed
   (`3ea7e28`)**: CRUD + retire/reactivate, cert-scoping
   checklist, support_admin read-only. See "Page 11 — Promo-code management / B4".
   7d. ✅ **B5 — Lesson-quiz authoring** (under the B1 curriculum page) — **committed
   (`0d95e6e`)**: `/admin/lessons/:id/quizzes`, quiz + question
   (MCQ/free-text) CRUD. See "Page 4b — Lesson-quiz authoring / B5".
   7e. ✅ **B7 — Exam publish `reasons[]`** — **committed (`0db202e`)**:
   the exam-authoring publish action now surfaces the failing publish-gate checks.
   See "Page 5 update — B7" below.
   7f. ✅ **B8 — Catalog card fields** — **committed (`9b18571`)**:
   added `badgeImageUrl`/`track`/`level`/`durationHours`/`syllabusUrl` to the
   admin-catalog form + `catalog.dto/model/mappers`; `?active=false` needs no FE
   change (no client-side workaround existed). See "Page 2b update — B8" below.

**🎉 Section-B admin pivot COMPLETE** (B1–B8). **User-facing A-items now also
committed** on `feat/real-backend-integration`: **A6** Landing (`469f429`), **A7**
Dashboard real-exam history (`554fbe6`), **A2** Settings delete/export (`c659335`),
**C2** cookie consent (`6fddf8e`).

**✅ The 2026-07-22 backlog is closed** — all five items shipped between
2026-07-24 and 2026-07-25:

8. ✅ **Real-exam engine (student)** — `b951242` (architect review pending).
9. ✅ **Learning / courses (student)** — `172f35a`.
10. ✅ **Mock-exam runner (student)** — `37b5c57` + `f4752ad`, plus history
    `6d9e406` and the `/mock` Socket.IO timer `904a478`.
11. ✅ **C1 — Admin OTP login** — `ae6ae44` (**security review pending**).
12. ✅ **Email verification** — `9e06730`. (`complete-account` remains a stub —
    blocked by **BE-I-25**.)

13. ✅ **BE-I-29 fix** — `1c2fcdb` (2026-07-26).
14. ✅ **Student dashboard overview → real data** — `4a11ae9` (2026-07-26).

**▶ Next (2026-07-27 rescan).** Recommended order — rationale in
[Remaining tasks](#remaining-tasks-high-level):

15. ⛔ **BE-I-30 — landing regression.** `GET /landing` was deleted (`66a7632`);
    repoint `LandingApi` to `GET /analytics/public-stats` + `GET /catalog`. A live
    public page is 404-ing — do this first. = **Slice 1** of
    [`cms-frontend-plan.md`](./cms-frontend-plan.md).
16. **Stage 2 — CMS.** Slices 2–8 (public renderer, sections, SEO, contact form,
    globals, home cutover), then Slices 9–10 (admin editor + contact inbox), then
    Slice 11 (hardening). Full plan:
    [`cms-frontend-plan.md`](./cms-frontend-plan.md).
17. **Real-exam answer review UI** — **BE-I-22 is fixed** (`66a7632`); add the
    `GET /exam/attempts/:attemptId/review` transport and re-enable the result
    page's review section (commented out, not deleted, in `b951242`).
18. **Blog E2E re-test** (BE-I-21 fixed) and the `/dashboard/certificates` legacy
    demo pages (rewire or retire — product decision).
19. **Minor:** catalog image picker (`POST /admin/catalog/:id/image-upload-url`),
    `seo.jsonLd` on blog/catalog detail pages, exam-authoring preview.

**Blocked (backend):** **BE-I-25** (`complete-account`), **BE-I-27/28** (CMS media
upload / draft preview — they cap the admin editor, not the build).
**No longer blocking:** BE-I-21 (`30bfff5`), BE-I-22 (`66a7632`), BE-I-26
(`2976be0`) — all three became frontend follow-ups.

**Decision (resolved 2026-07-16):** **full page builds** — each item builds the
data-access layer AND wires the screen end to end, one at a time, then stops for
review. **Commit policy:** per-change explicit approval, unless the user grants a
standing "commit and continue" for a session (as in the A7/A2/C2 session).
