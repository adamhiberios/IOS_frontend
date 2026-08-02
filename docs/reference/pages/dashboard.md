# Dashboard

`features/dashboard`, 1 page, lazy at `/dashboard`, `authGuard`.

> As of the 2026-07-25 audit this page was **MIXED** (real insights/exam
> history + mock `DashboardStore` charts). It was rewired to real data in
> `4a11ae9` (2026-07-26) — see
> [`../../archive/changelog.md`](../../archive/changelog.md#student-dashboard-overview--real-data). The architecture notes below (what feeds what) remain accurate.

## `/dashboard` — DashboardOverviewPage

Composes several stores:

- **`StudentInsightsStore`** → `GET /insights` (student aggregates: enrolled
  programs, completed lessons, real/mock exam summaries, certificates
  earned). Rendered in the insights KPI block.
- **`ExamAttemptsStore`** → `GET /exam/attempts` (real-exam history table,
  `ios-exam-history` component).
- **`DashboardStore`** (post-`4a11ae9`) — pure aggregator, no server state of
  its own, composed from `CoursesStore.progress()` (`GET /learning/progress`)
  joined with `PublicCatalogStore.byCode()`, plus `MockStore.history()`
  (`GET /mock/history`, bucketed client-side by month for the charts).
  `family`/`badgeAsset` are derived deterministically from `programCode`
  (`resolveCertFamily`/`resolveBadgeAsset`) since the backend has no
  per-course family/badge field — reuses the existing `assets/badge/*.svg` set.

**Known trade-off (documented, accepted):** `MockStore.history()` holds only
the latest cursor page (20 items) — no monthly-aggregation endpoint exists,
so the monthly chart reflects recent attempts, not a guaranteed-complete
year. Same trade-off accepted for the real-exam history list.

**Not real / removed rather than re-sourced (nothing backs them):** average
mock score, total learning time, trend delta, the exam donut chart, and the
certificate-award card on the Overview section. These were previously part
of a per-certificate fixture (`ESM_P_DETAIL_*`) that showed the same numbers
under every certificate regardless of which one was open — removed as a
cleanup, not silently left wrong. Could come back from mock history in the
mock-test section specifically, not this general overview.

**`learningCard`** — derived from the least-complete in-progress enrolment
(continue vs. start copy); `null` when nothing is in progress. Footer
visibility keyed off a real `hasActivity` computed (any cert progress or mock
history).

`ios-cert-progress-card`'s "Show details" link routes to the real
`/dashboard/certificates/:code` hub (post learning-hub-dedup rewire — see
[`../../status/current-status.md`](../../status/current-status.md)).
