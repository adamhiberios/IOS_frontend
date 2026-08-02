# IOS LMS Frontend — Docs Index

> **Read this file at the start of every conversation about this project.**
> It explains the three-tier doc system and links to everything else so you
> know what exists without having to search.

This replaces the six old sprawling docs (`implementation-progress.md`,
`frontend-unblock-checklist.md`, `frontend-page-audit.md`, `cms-frontend-plan.md`,
`backend-blockers-report.md`, `backend-analysis.md`), which have been deleted.
Their content is reorganized below by how often you need it.

Note: `docs/00-executive-overview.md` … `docs/10-app-bootstrap.md` (indexed by
`docs/README.md`) is a **separate, pre-existing architecture doc set** — not
part of this reorganization. Leave it alone; consult it for architecture
questions (component design, state management, API integration patterns,
security/perf, exam-engine spec, etc.).

## Tier 1 — `docs/status/` (read every conversation)

Short, current-state files. Start here.

- [`current-status.md`](./current-status.md) — where the project is right now: phase status, what's in flight/uncommitted, immediate next actions, build order followed so far.
- [`known-issues.md`](./known-issues.md) — active backend blockers, pending reviews, known frontend bugs/gaps that matter today.

## Tier 2 — `docs/reference/` (read when that topic comes up)

Split by topic. Only open the file relevant to what you're working on.

**Frontend conventions**
- [`conventions/frontend-data-access-patterns.md`](../reference/conventions/frontend-data-access-patterns.md) — the data-access layering, pagination, RBAC, routing conventions every feature follows. Read before building or reviewing any feature.

**Backend contract** (derived from `IOS_Backend/` source, read-only)
- [`backend/api-conventions.md`](../reference/backend/api-conventions.md) — global request pipeline, response envelopes, error shape, roles/guards, auth token flow. Read before wiring any new endpoint.
- [`backend/endpoints.md`](../reference/backend/endpoints.md) — full controller/endpoint inventory (auth, profile, catalog, learning, exam, mock, payments, certificates, users, audit, health).
- [`backend/models.md`](../reference/backend/models.md) — entity/enum reference.
- [`backend/websockets.md`](../reference/backend/websockets.md) — `/exam` and `/mock` Socket.IO gateway contracts.
- [`backend/cms-blog-contact.md`](../reference/backend/cms-blog-contact.md) — CMS, blog, and contact-form endpoint contracts (needed when touching CMS or blog).
- [`backend/open-issues.md`](../reference/backend/open-issues.md) — currently-open `BE-I-xx` backend issues with full technical detail. Read before working on anything they block.

**CMS**
- [`cms-frontend-plan.md`](../reference/cms-frontend-plan.md) — the full Stage-2 CMS build plan (11 slices). Read before touching any CMS work — nothing in this plan is built yet except the admin contact inbox.

**Per-page / per-feature audit** (from the 2026-07-25 static-analysis page audit — read the one page/feature you're touching)
- [`pages/landing-marketing.md`](../reference/pages/landing-marketing.md)
- [`pages/auth.md`](../reference/pages/auth.md)
- [`pages/dashboard.md`](../reference/pages/dashboard.md)
- [`pages/courses-learning.md`](../reference/pages/courses-learning.md)
- [`pages/certificates-mock-exam.md`](../reference/pages/certificates-mock-exam.md)
- [`pages/credentials.md`](../reference/pages/credentials.md)
- [`pages/assessments-real-exam.md`](../reference/pages/assessments-real-exam.md)
- [`pages/insights-blog.md`](../reference/pages/insights-blog.md)
- [`pages/profile-settings.md`](../reference/pages/profile-settings.md)
- [`pages/admin.md`](../reference/pages/admin.md)
- [`pages/cross-cutting-findings.md`](../reference/pages/cross-cutting-findings.md) — orphan pages, dead links, i18n gaps, stub inventory, summary counts across the whole app.

## Tier 3 — `docs/archive/` (rarely — dig up an old decision)

Historical/completed/resolved content. Consult only if you need to know why
something was built a certain way, or what a resolved issue used to say.

- [`changelog.md`](../archive/changelog.md) — condensed chronological log of every committed slice of work (Phase 1–4, real-exam engine, courses, mock-exam, blog, landing, admin B1–B8/A1–A7, etc.) with commit SHAs.
- [`admin-pages-build-log.md`](../archive/admin-pages-build-log.md) — detailed per-admin-page build notes (data-access shapes, decisions, i18n keys) for each of the 12 admin pages.
- [`backend-issues-resolved.md`](../archive/backend-issues-resolved.md) — `BE-I-xx` issues that were found and later fixed by the backend, with resolution evidence.
- [`backend-unblock-history-2026-07-13.md`](../archive/backend-unblock-history-2026-07-13.md) — the original 2026-07-12/13 backend-blocker wave and the backend-commit → frontend-item mapping that came out of it.
- [`cms-rollback-2026-07-29.md`](../archive/cms-rollback-2026-07-29.md) — the CMS admin session that was built then rolled back, and the findings worth keeping from it.
- [`decisions-and-open-questions.md`](../archive/decisions-and-open-questions.md) — early-implementation decisions and open questions posed to the reviewer (mostly resolved).

---

**Repo basics** (see `current-status.md` for the live version):
frontend is `institute of scrum/` (Angular 21), backend is `IOS_Backend/`
(NestJS, **read-only, never modify**). Work happens on git branch
`feat/real-backend-integration`. Dev API: `https://api-dev.instituteofscrum.org/api/v1`.
Frontend engineering rules live in `CLAUDE.md` at the repo root.
