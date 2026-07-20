# Backend Stoppers Report — status after the 2026-07-13 backend fixes

> **📕 CLOSED / historical (as of 2026-07-16).** Every stopper below is resolved;
> nothing here blocks frontend work. Kept as the audit trail of what was blocked
> and which backend commit fixed it. For the **active** work list see
> [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md) (now
> admin-first) and [`implementation-progress.md`](./implementation-progress.md).

> **Purpose:** track the backend gaps that **stop or degrade** frontend work.
> Originally a to-do list for the backend team; they shipped the fixes on
> **2026-07-12 → 2026-07-13**, so this is now a **resolution log**. The
> frontend action items for each fix live in
> [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md). Full
> technical detail per item is in
> [`backend-analysis.md` → Backend Issues Report](./backend-analysis.md#backend-issues-report).
> Last updated: 2026-07-13.

## TL;DR

- **All hard stoppers are RESOLVED.** The three user-facing screens that had no
  backend (Certificates list, Notifications, Insights) and the two blocked admin
  pages (Curriculum, Certificate revocation) now have endpoints.
- **All degraders are RESOLVED** (avatar upload, account deletion, catalog card
  fields, publish `reasons[]`, real-exam history).
- **All no-API admin features are RESOLVED** (admin staff, promo codes,
  lesson-quiz authoring, dashboard analytics).
- **New work introduced by the backend:** two-step **admin OTP login** and
  **GDPR** (data export + cookie consent) — see the checklist (C1, A2, C2).
- **Nothing is blocking frontend work anymore.** What remains are behavioural
  notes (§4), not stoppers.

---

## 1. Hard stoppers — ✅ all resolved

| #           | Was blocking                          | Fixed by (BE commit)        | New endpoint(s)                                                      | FE checklist |
| ----------- | ------------------------------------- | --------------------------- | -------------------------------------------------------------------- | ------------ |
| **BE-I-16** | User **Certificates** list            | `a36ddfd` Wave 1 reads      | `GET /me/certificates` → `{ data }`                                  | A3           |
| **BE-I-18** | User **Notifications**                | `181cd9f` notification feed | `GET /notifications`, `/unread-count`, `POST /:id/read`, `/read-all` | A4           |
| **BE-I-20** | User **Insights** + Landing dynamic   | `1515dff` analytics         | `GET /insights` (student), `GET /landing` (public)                   | A5, A6       |
| **BE-I-13** | Admin **Curriculum** page             | `a36ddfd` Wave 1 reads      | `GET /admin/certs/:id/curriculum` (all statuses, full fields)        | B1           |
| **BE-I-15** | Admin **Certificate revocation** page | `a36ddfd` Wave 1 reads      | `GET /admin/certs/issued` → `{ data, meta.pagination }`              | B2           |

## 2. Degraders — ✅ all resolved

| #           | Was limiting                     | Fixed by (BE commit)       | New endpoint / change                                                                  | FE checklist |
| ----------- | -------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- | ------------ |
| **BE-I-17** | Real-exam attempt history        | `a36ddfd` Wave 1 reads     | `GET /exam/attempts` → `{ data, meta.pagination }`                                     | A7           |
| **BE-I-19** | Settings → delete account        | `65bf4e8` GDPR             | `POST /me/delete` `{ password }` (step-up); also `GET /me/export`                      | A2           |
| **BE-I-08** | Avatar/image upload              | `e4b347c` presigned upload | `POST /me/avatar-upload-url` → `{ uploadUrl, key, expiresInSeconds }`                  | A1           |
| **BE-I-04** | Catalog card fields not writable | `e4b347c` catalog DTOs     | `badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl` now in Create/Update | B8           |
| **BE-I-14** | Publish gate `reasons[]` dropped | `a36ddfd` publish reasons  | `reasons[]` now surfaced in the RFC-7807 body                                          | B7           |

## 3. No-API admin features — ✅ all resolved

| #           | Was impossible            | Fixed by (BE commit)       | New endpoint(s)                                       | FE checklist |
| ----------- | ------------------------- | -------------------------- | ----------------------------------------------------- | ------------ |
| **BE-I-03** | Admin staff management    | `10965cb` admin-staff CRUD | `/admin/staff` (super_admin) CRUD + deactivate        | B3           |
| **BE-I-05** | Promo-code admin CRUD     | `1b603f1` promo CRUD       | `/admin/promo-codes` (super_admin / finance_admin)    | B4           |
| **BE-I-06** | Lesson-quiz authoring     | `cb10205` quiz authoring   | `/admin/lessons/:id/quizzes` + `/admin/quizzes/*`     | B5           |
| **BE-I-07** | Admin dashboard analytics | `1515dff` analytics        | `GET /admin/dashboard/overview` (super/finance admin) | B6           |

## New backend work the frontend must adopt (not old blockers)

- **Admin OTP login (`e97de75`)** — `POST /auth/admin/login` may now return an
  OTP _challenge_ instead of tokens; a second step `POST /auth/admin/login/otp`
  `{ challengeId, code }` completes login. **Touches `core/auth` → architect +
  security review** (CLAUDE.md §8/§13). Checklist **C1**.
- **GDPR / cookie consent (`65bf4e8`)** — `POST /consent` records the cookie
  choice; add a consent banner. Checklist **C2**.
- **Catalog `?active` fix (`5133b4e`)** — `?active=false` now parses correctly
  (previously flipped to `true`); the admin catalog Inactive filter now works
  server-side. Checklist **B8**.

---

## 4. Behavioural notes (still true — not blockers, FE already adapts)

- **BE-I-01 / BE-I-12** — No global response envelope; validation errors return
  **HTTP 400** with `code`. **Update (`5c11460`, 2026-07-14):** exam **domain-state
  conflicts now return 409** (not 422/400); convention is 400 = input validation,
  409 = domain-state conflict. Map per endpoint; key off `code`/`errors[]`, not status.
- **BE-I-02** — Refresh cookie is `SameSite=Lax`, `Secure` only in prod/staging.
- **BE-I-09** — Two overlapping "list exams for a cert" endpoints (assign vs
  authoring) — pick per screen.
- **BE-I-10** — `GET /health` is at the bare origin; `/health/full` is under `/api/v1`.
- **BE-I-11** — ✅ **RESOLVED (`334d0c6`, 2026-07-14→).** `BlogArticle` now has a
  full `BlogModule`: public `GET /blog` + `GET /blog/:slug` (SEO) and admin
  `admin/blog` CRUD + publish/unpublish/translations (content_creator/
  learning_admin; publish/delete = learning_admin). Was the last dead surface —
  now buildable (public blog rewire + admin Blog authoring page). See
  `backend-analysis.md` → "Blog endpoints (BE-I-11)".
- **Week-9 i18n (`be902fe`/`d67d7ff`, 2026-07-14→)** — backend `SUPPORTED_LOCALES`
  expanded to `en/tr/fr/es/ar/de`; validation errors + emails are now localized by
  `X-Lang`. No FE break (app UI stays en/fr/ar; the extra locales are authoring
  targets in the translation editors).

---

## What's next

The backend is no longer the constraint. The frontend plan is in
[`implementation-progress.md` → Phase 4 plan](./implementation-progress.md#phase-4-plan--user-facing-app-backend-integration);
the concrete, endpoint-level task list is in
[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md).
