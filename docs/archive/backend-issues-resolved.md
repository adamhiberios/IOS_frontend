# Resolved Backend Issues (`BE-I-xx`)

> `BE-I-xx` issues that were found during frontend integration and later
> fixed by the backend, with resolution evidence. For currently-open issues
> see [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md).

## BE-I-21 — ✅ RESOLVED `30bfff5` (2026-07-21) — Blog `POST /admin/blog` 404 (read-after-write race)

**Root cause:** `RlsInterceptor` opened a transaction on a dedicated RLS
query-runner, committed only after the handler returned.
`BlogService.create()` inserted through that runner, then read back via the
**default connection pool** — a different connection that, under READ
COMMITTED, couldn't see the still-uncommitted INSERT. `findOne` returned
`null` → 404 → the interceptor's catch rolled back the transaction, undoing
the insert. `update`/`publish`/etc. shared the same read-back pattern but
didn't 404 (row already existed from a prior committed request) — their
response bodies were just stale.

**Fix taken:** `create()` now builds the response from the entity already in
hand (`repo.save(...)` result) via `toAdminDetail(saved)`, with an inline
comment naming the race. `update()`/`publish()`/translation/unpublish paths
do the same. `d7a78e6` additionally fixed a TypeORM distinct-pagination
crash in the list queries.

**Frontend:** no code change needed — `admin/blog` (`5404e77`) and public
blog (`1940501`) were already built against the correct contract. Only
follow-up: an E2E re-test (create → publish → public-read) against api-dev.
Author name is `null` in the create response until the next read (the
`author` relation isn't loaded) — cosmetic, the FE list refetches.

## BE-I-22 — ✅ RESOLVED `66a7632` (2026-07-26) — Real-exam answer key never returned

**Original gap:** post-submission, the frontend could obtain only the
aggregate `{score, passed, correctCount, totalCount}` — no endpoint returned
per-question correctness for a terminal real-exam attempt (unlike mock exams,
which have `GET /mock/questions/:questionId/reveal`).

**Fix:** new `GET /exam/attempts/:attemptId/review` — owner-only, terminal
attempts only (422 while in progress), 404 unknown, runs on the request RLS
runner. Full contract in
[`../reference/backend/endpoints.md`](../reference/backend/endpoints.md).

**Frontend:** `ios-exam-review-page` at `/assessments/review/:attemptId`,
linked from exam history (not the result page — see BE-I-32,
[`../reference/backend/open-issues.md`](../reference/backend/open-issues.md)).

## BE-I-26 — ✅ RESOLVED `2976be0` → `7160f11` (2026-07-27) — CMS `contact_form` had no submission endpoint

**Original gap:** `CmsSectionType.CONTACT_FORM` existed and the seed shipped
a `contact` page, but no backend endpoint received/stored/emailed a
submission.

**Fix:** full contact module — public `POST /contact` (throttled, honeypot
`company`, uniform 201) + admin `/admin/contact` list/detail/status/delete.
Full contract:
[`../reference/backend/cms-blog-contact.md`](../reference/backend/cms-blog-contact.md).

**Frontend:** admin inbox built & staged (2026-07-29), independent of the
rolled-back CMS session. The public `contact_form` *section* still awaits
the CMS public renderer (plan Slice 6).

## BE-I-29 — ✅ FE fix shipped `1c2fcdb` (2026-07-26) — lesson `contentText` became required

**Change:** `72a711c` made `CreateLessonDto.contentText` required &
non-empty — a breaking change shipped inside a mixed
`feat(analytics)/feat(users)/feat(learning)` commit with no contract note.

**Frontend impact (fixed):** `toCreateLessonBody()` had deliberately omitted
`contentText` when blank; now sends it always and the lesson-content field
is marked required client-side (validator + i18n error).

**Backend ask (still relevant going forward):** flag required-field
tightenings separately from feature work so the contract change is
reviewable.

## BE-I-30 — ✅ RESOLVED (frontend fix `2026-08-01`) — `GET /landing` deleted without a deprecation window

**Backend change:** `66a7632` removed `LandingController` entirely. Per the
controller's own doc comment, the composite payload is now split three ways:
`GET /analytics/public-stats` (counters), `GET /catalog` (featured programs),
`GET /cms/pages/home` (static content, not yet consumed — CMS Slice 8).

**Frontend fix:** `LandingApi` repointed to `GET /analytics/public-stats`
(response wrapped in `stats`, not bare as first assumed); featured programs
composed from the already-shared `PublicCatalogStore` instead of a second
bespoke mapper. **Correction to earlier framing:** the page never visibly
404'd — both consumers (`store.stats()`, `store.featuredPrograms()`) had
already been commented out in an earlier commit (`f3c425d`), so the real
symptom was one failing background request per page load, not a broken
screen. Done with **no** CMS work — satisfies CMS plan Slice 1; the Slice 8
home cutover is a separate, still-open item.

**Backend ask (still relevant going forward):** removing a public endpoint a
shipped client consumes needs a deprecation note ahead of the merge — same
ask as BE-I-29.

## Also resolved (2026-07-13 blocker wave)

BE-I-03/04/05/06/07/08/11/13/14/15/16/17/18/19/20 — see
[`backend-unblock-history-2026-07-13.md`](./backend-unblock-history-2026-07-13.md)
for the original blocker report and the backend-commit → frontend-item map.
