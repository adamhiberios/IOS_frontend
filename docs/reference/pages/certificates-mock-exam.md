# Certificates Hub — Mock Exam Runner

`features/certificates`, lazy at `/dashboard/certificates`.

> **Status note:** as of the 2026-07-25 audit, this feature contained **two
> unrelated data worlds sharing a URL prefix** — a fixture-driven "demo hub"
> and a real mock-exam runner. The learning-hub dedup rewire (in flight as of
> 2026-08-03, see [`../../status/current-status.md`](../../status/current-status.md))
> is rewiring the demo hub onto real data and deleting the duplicate
> `/courses` pages. The mock-exam runner below was already real and is
> unaffected.

## The (formerly) demo hub

`CertificatesPage`, `CertDetailPage`, `CertSessionPage` originally injected
`CertificatesStore`, which imported no `HttpClient` — its whole surface was
`computed(() => STATES[this._demoMode()])` over fixtures (`ESM_P_MATERIALS`,
`ESM_P_SESSION_1_CHAPTERS`, `ESM_P_SESSIONS`, `ESM_P_MOCK_TEST_*`,
`ESM_P_DETAIL_LOW`/`HIGH`). Route ids were slugs (`ESM-P`, `session-1-a`),
not backend UUIDs.

The in-flight rewire replaces this with real `/learning/*` data:
- `cert-session.page.ts` → `GET /learning/lessons/:id`; sidebar now lists
  **sibling lessons, not chapters** (a lesson is one `contentHtml` blob, no
  chapter structure); route changed from
  `:code/session/:materialId` to `:code/session/:lessonId` — **breaking for
  old links** (backend lessons have no slug).
- `cert-detail.page.ts` — Learning Materials list built from the real
  curriculum; `:code` (program code) resolved to `certId` via
  `GET /learning/progress`, which doubles as the enrolment gate.
- `certificates.page.ts` — lists only real enrolments (previously showed a
  hardcoded "All certifications" grid of six invented cards).
- Overview and Mock-test sections on the detail page rebuilt on real data —
  see [`../../archive/changelog.md`](../../archive/changelog.md) for the
  detailed before/after (two functional bugs were found and fixed along the
  way: the mock-test CTA passed the wrong query params, and "Show details"
  on a history row launched a new exam instead of viewing the old one).

`cert-grid-card.ts` is now orphaned (only consumer was the fixture "All
certifications" grid) — left in place as the designed component a real
browse-all section (from `PublicCatalogStore`) would reuse; delete if that
section isn't planned.

## The real mock-exam runner (REAL + WS, unaffected by the dedup)

`MockTestPage`, `MockExamResultPage`, `MockHistoryPage` inject
`MockStore`/`MockApi` (base `${apiBaseUrl}/mock`) plus `MockSessionWs`
(Socket.IO namespace `/mock` — see
[`../backend/websockets.md`](../backend/websockets.md)).

Contract vs. the real exam: the mock timer is **soft/non-terminal**
(extendable via `POST /mock/:id/extend`, never auto-submits — `timeUp` is
advisory), correct answers **are** revealed (`POST …/reveal` hint +
`GET /mock/attempts/:id` full review), history is cursor-paginated, nothing
is graded client-side. `readyForFinal` is advisory only, never blocks the
real exam.

Runner behaviour: query-param driven — `?certId=` starts an attempt (URL
rewritten to `?attemptId=` for reload-resume), `?attemptId=` resumes.
Optimistic `setAnswer` → debounced autosave. Soft local countdown anchored to
the server's `remainingSeconds`, re-seeded on start/resume/extend, server-
authoritative via the `/mock` WS with graceful degrade to pure local
countdown if the WS is unavailable. Reveal-on-demand (not auto-reveal — one
`POST …/reveal` per explicit click). Entry point: a "Practice test" action on
the curriculum/certificate detail page, which has the real UUID `certId`.

`mock-history.page.ts` at `certificates/mock-test/history` — cursor-paged
past-attempts list; submitted rows → review, in-progress rows → resume.

## Historical entry-flow defect (being fixed by the in-flight rewire)

`CertDetailPage.onStartTest` navigated to the runner with `{count, time}`
query params; the runner reads only `certId`/`attemptId` — with neither
present it fell into `store.clear()`, so the mock-test button on every
cert-detail page opened an empty runner. The `:code` slug was never resolved
to the real UUID. Also: `/dashboard/certificates/:code/mock-test/result` was
an orphan route — the runner submits to the non-`:code` variant.
