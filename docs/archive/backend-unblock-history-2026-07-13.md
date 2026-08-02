# Backend Unblock History — 2026-07-12/13 Wave

> The original blocker report and the backend-commit → frontend-item mapping
> from the wave where the backend team resolved nearly every early frontend
> blocker in one sitting. Fully historical — every item here shipped on both
> sides. Kept for the commit provenance.

## What happened

On 2026-07-13 the backend team resolved every blocker filed against them up
to that point. All previously-blocked user features (Certificates,
Notifications, Insights) and two blocked admin pages (Curriculum, Certificate
revocation) became buildable, plus new admin pages (staff, promo codes,
lesson-quiz authoring, dashboard metrics) and a two-step admin OTP login.

## Backend commits mapped to blockers

| Commit | What shipped | Blockers cleared |
| --- | --- | --- |
| `a36ddfd` | Wave 1 FE-unblock reads + publish `reasons[]` | BE-I-13, 14, 15, 16, 17 |
| `1515dff` | Analytics: admin dashboard, student insights, public landing | BE-I-07, BE-I-20 |
| `181cd9f` | In-app notification feed | BE-I-18 |
| `10965cb` | Admin staff CRUD (super_admin) | BE-I-03 |
| `cb10205` | Admin lesson-quiz authoring CRUD | BE-I-06 |
| `1b603f1` | Promo-code admin CRUD | BE-I-05 |
| `e4b347c` | Avatar presigned-upload URL + catalog card fields | BE-I-08, BE-I-04 |
| `65bf4e8` | GDPR: data export, account deletion, cookie consent | BE-I-19 (+ BE-042) |
| `e97de75` | Two-step admin login with emailed OTP | (new — admin auth flow, became C1) |
| `5133b4e` | Catalog `?active` parse fix (`false` no longer flips to `true`) | (behavioural) |

## Endpoints added 2026-07-13 (blocker fixes)

**User-facing (student token unless noted):**

| Method | Path | Response | Notes |
| --- | --- | --- | --- |
| GET | `/me/certificates` | `{ data }` | Earned certs (BE-I-16) |
| POST | `/me/avatar-upload-url` | bare | BE-I-08 |
| GET | `/me/export` | bare | GDPR data export |
| POST | `/me/delete` | message | Step-up, anonymise-in-place (BE-I-19) |
| GET | `/insights` | bare | Student aggregates (BE-I-20a) |
| GET | `/landing` | bare (Public) | `{ featuredPrograms, stats }` (BE-I-20) — **later deleted, see BE-I-30 in [`backend-issues-resolved.md`](./backend-issues-resolved.md)** |
| GET | `/exam/attempts` | `{ data, meta.pagination }` | Real-exam history (BE-I-17) |
| GET | `/notifications` | `{ data, meta.pagination }` | BE-I-18 |
| GET | `/notifications/unread-count` | bare `{ count }` | |
| POST | `/notifications/:id/read` | `{ data }` | Idempotent |
| POST | `/notifications/read-all` | `{ updated }` | |
| POST | `/consent` | (Public) | Cookie consent (BE-042) |

**Admin:**

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/admin/certs/:id/curriculum` | content_creator, learning_admin | All statuses + full fields (BE-I-13) |
| GET | `/admin/certs/issued` | super_admin, learning_admin | BE-I-15 |
| GET | `/admin/dashboard/overview` | super_admin, finance_admin | BE-I-07 |
| * | `/admin/staff` | super_admin | BE-I-03 |
| * | `/admin/promo-codes` | super_admin, finance_admin | BE-I-05 |
| * | `/admin/lessons/:id/quizzes`, `/admin/quizzes/:id[/questions]` | content_creator, learning_admin | BE-I-06 |

**Auth:**

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/admin/login` | Union response (OTP off/on) |
| POST | `/auth/admin/login/otp` | Single-use, 5-min, ≤5 attempts |
| POST | `/auth/admin/refresh`, `/auth/admin/logout` | Dedicated admin session routes |

## Resolved end-to-end (backend + frontend) — full table

| # | Backend fix | Frontend commit |
| - | --- | --- |
| BE-I-03 | `10965cb` | `6f09077` admin staff (B3) |
| BE-I-04 | `e4b347c` | `9b18571` catalog card fields (B8) |
| BE-I-05 | `1b603f1` | `3ea7e28` promo codes (B4) |
| BE-I-06 | `cb10205` | `0d95e6e` (+`d1ce3e8`) lesson quiz (B5) |
| BE-I-07 | `1515dff` | `9559ec1` admin dashboard (B6) |
| BE-I-08 | `e4b347c` | `242a11d` avatar upload (A1) |
| BE-I-11 | `334d0c6` | `1940501` public blog · `5404e77` admin blog |
| BE-I-13 | `a36ddfd` | `7268d26` curriculum (B1) |
| BE-I-14 | `a36ddfd` | `0db202e` publish `reasons[]` (B7) |
| BE-I-15 | `a36ddfd` | `451af2a` cert revocation (B2) |
| BE-I-16 | `a36ddfd` | `3bed4c1` credentials list (A3) |
| BE-I-17 | `a36ddfd` | `554fbe6` real-exam history (A7) |
| BE-I-18 | `181cd9f` | `99917c8` notifications (A4) |
| BE-I-19 | `65bf4e8` | `c659335` delete + export (A2) |
| BE-I-20 | `1515dff` | `0272e27` insights (A5) · `469f429` landing (A6) |
| BE-I-21 | `30bfff5` | `5404e77` admin blog authoring (built before the fix, no FE change needed) |

Also delivered end-to-end from the same wave: two-step **admin OTP login**
(BE `e97de75` → FE `ae6ae44`, C1 — security review still pending) and **GDPR
cookie consent** (BE `65bf4e8` → FE `6fddf8e`, C2).

## 2026-07-20 snapshot (admin pivot complete) — historical marker

At this point: A1 avatar upload, A3 credentials, A4 notifications, A5
insights (Dashboard overview) all committed; all of section B (admin) built
& committed. New backend surface discovered post-2026-07-14: **BE-I-11 Blog
module** (`334d0c6`) — became two new FE items (public blog rewire, admin
blog page), both later shipped (see
[`changelog.md`](./changelog.md)).

**Later BE changes honoured from this era:** exam domain-state conflicts
return 409 not 422/400 (`5c11460`) — key off `code`, not status. Week-9 i18n
(`be902fe`/`d67d7ff`) — backend `SUPPORTED_LOCALES = en/tr/fr/es/ar/de`,
emails/validation errors localized by `X-Lang`; app UI stays en/fr/ar. Audit
hardening (`f78e76b`), health-sentry gating (`a0d2409`), dep bumps
(`f639a85`) — no FE impact.
