# Backend Stoppers Report — what BE gaps block the frontend

> **Purpose:** a single, decision-ready list of backend gaps that **stop or
> degrade** frontend work, so the backend team can prioritise. Derived from the
> read-only backend source (`IOS_Backend/`). Full technical detail for each item
> lives in [`backend-analysis.md` → Backend Issues Report](./backend-analysis.md#backend-issues-report)
> under the referenced `BE-I-##` codes.
> Last updated: 2026-07-12.

## TL;DR

- **Admin app is functionally complete** for every backend surface that exists.
  Only **2** admin pages are blocked, both by a **missing read/list endpoint**
  (not by missing write endpoints).
- **User-facing app** integration (the next phase) has **3 hard stoppers** (a
  whole screen has no backend) and several endpoints that exist and are ready to
  wire. See the App section.

---

## 1. Hard stoppers — a screen/page cannot be built at all

| #           | Area  | What's missing                                                                                                                                    | Blocks                                                                                            | Fix (suggested endpoint)                                                                                    |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **BE-I-16** | App   | **Student "my certificates" list.** Cert module = public `GET /verify/:certId` + admin revoke only.                                               | User **Certificates** screen (list earned certs). Student can't even discover their own cert ids. | `GET /me/certificates` → issued certs for the caller (public id, cert title, issuedAt, status, pdf/qr url). |
| **BE-I-18** | App   | **In-app notifications API.** `NotificationModule` is transactional-**email** only.                                                               | User **Notifications** feature (list / mark-read).                                                | `GET /notifications` + `POST /notifications/:id/read` (or scope the feature out).                           |
| **BE-I-20** | App   | **`/insights` analytics endpoint** (and `/landing`). Neither exists.                                                                              | User **Insights** screen (no data source). Landing dynamic blocks.                                | Analytics endpoints (cf. BE-I-07); or scope Insights out and make Landing static + `GET /catalog`.          |
| **BE-I-13** | Admin | **Admin curriculum read** (modules/lessons). Only `POST/PATCH/DELETE` exist; public outline is active-only / titles-only / 404s on inactive cert. | Admin **Curriculum** page (can't list/pre-fill/reactivate).                                       | `GET /admin/certs/:id/curriculum` (all statuses, full fields).                                              |
| **BE-I-15** | Admin | **Issued-certificate list.** Only `PATCH /admin/certs/issued/:id/revoke` (needs internal UUID). No list/search.                                   | Admin **Certificate revocation** page (revoke id is undiscoverable in the UI).                    | `GET /admin/certs/issued` (paginated, filter by user/cert).                                                 |

## 2. Degraders — the screen works but is limited

| #           | Area  | What's missing                                                                                                     | Impact                                                                                 | Fix                                               |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **BE-I-17** | App   | **Student real-exam attempt history** (`/exam` has live-session routes only; mock has `/mock/history`).            | Dashboard / assessments can't show past **real-exam** results (mock results are fine). | `GET /exam/attempts` (student-scoped, paginated). |
| **BE-I-19** | App   | **Self-service account deletion** (`/me` has no `DELETE`).                                                         | Settings → delete-account can't be wired.                                              | `DELETE /me` (with step-up re-auth per SOW §3.6). |
| **BE-I-08** | App   | **Signed upload-URL endpoint** (`StorageService.getSignedUploadUrl` exists but no controller).                     | No avatar/image upload; `avatarUrl` etc. are free strings set via PATCH.               | Expose a signed-PUT endpoint.                     |
| **BE-I-04** | Admin | Catalog card fields (`badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl`) not in Create/Update DTOs. | Catalog admin form can't edit these card fields (seed-only).                           | Add them to the DTOs.                             |
| **BE-I-14** | Admin | Publish-gate `reasons[]` dropped by the exception filter.                                                          | Exam-authoring shows a generic "not publishable" message, not _which_ checks failed.   | Surface `reasons[]` in the RFC-7807 body.         |

## 3. No-API features (never buildable until the backend adds them)

These have **no endpoint at all** — the frontend cannot build the page regardless
of effort:

- **BE-I-03** — Admin-user/staff management (create/list/update admins, assign roles). Admins are seed-only.
- **BE-I-05** — Promo-code admin CRUD (entity + service exist; consumed at checkout only).
- **BE-I-06** — Lesson-quiz authoring (`LessonQuiz`/`QuizQuestion` are seed-only).
- **BE-I-07** — Dashboard / analytics / aggregate endpoints (revenue, enrollments, pass rates).

## 4. Behavioural notes (not blockers, but the FE must adapt)

- **BE-I-01 / BE-I-12** — No global response envelope; validation + domain errors both return **HTTP 400** with `code`. FE keys off `code`/`errors[]`, not status. (Already handled.)
- **BE-I-02** — Refresh cookie is `SameSite=Lax`, `Secure` only in prod/staging (docs assumed `Strict`). (Already handled.)
- **BE-I-11** — `BlogArticle` entity has no controller (dead/planned surface).

---

## What is NOT blocked (ready to wire for the app)

For contrast — the user-facing endpoints that **exist and are ready**:

- **Profile:** `GET /me`, `PATCH /me`, `PATCH /me/password`.
- **Catalog (public):** `GET /catalog`, `GET /catalog/:id`, `GET /catalog/:id/outline`.
- **Learning:** `GET /learning/progress` (enrolled certs + progress — the dashboard/courses list), `GET /learning/certs/:certId/curriculum`, `GET /learning/lessons/:id`, `GET /learning/lessons/:id/quiz`, `POST /learning/lessons/:id/quiz/check`, `POST /learning/lessons/:id/complete`.
- **Real exam runner:** `POST /exam/{pre-exam-confirmation,validate-access,start}`, `GET/POST /exam/sessions/:id/*` + `/exam` WebSocket.
- **Mock exam:** `POST /mock/start`, `GET /mock/history`, `GET /mock/attempts/:id`, `GET /mock/:id`, `POST /mock/:id/{autosave,extend,submit}`, reveal + `/mock` WebSocket.
- **Payments:** `POST /payments/checkout`, `POST /payments/retake`, `GET /payments/transactions`.
- **Verify (public):** `GET /verify/:certId`.

See [`implementation-progress.md` → Phase 4 plan](./implementation-progress.md) for the
per-feature wiring plan and order.
