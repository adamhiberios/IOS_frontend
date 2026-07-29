# Backend Stoppers Report — retriaged 2026-07-27

> **🟠 ACTIVE (as of 2026-07-27).** The backend moved twice while this report was
> being rewritten. **BE-I-22** (exam answer review) and **BE-I-26** (contact-form
> submission) were **fixed on 2026-07-26/27** and have moved to §2 as frontend
> follow-ups. **BE-I-30 is new and urgent:** `GET /landing` was deleted, so the
> shipped landing page 404s. Active stoppers are in §1.
>
> **Purpose (unchanged):** track backend gaps that **stop or degrade** frontend
> work. Full technical detail per item lives in
> [`backend-analysis.md` → Backend Issues Report](./backend-analysis.md#backend-issues-report);
> the frontend follow-ups live in
> [`implementation-progress.md`](./implementation-progress.md) and
> [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md).
>
> **Triage rule used here.** Every stopper is scored on two axes — _fixed on the
> backend?_ and _consumed by the frontend?_:
>
> - **backend-fixed + FE-consumed** → removed from this file; recorded complete in
>   Implementation Progress.
> - **backend-fixed, FE not done** → moved to §2 with the fix evidence; the FE work
>   is tracked as a task in Implementation Progress.
> - **not fixed** → stays in §1 with refreshed evidence.
>
> Last verified against source on **2026-07-25**, backend HEAD **`72a711c`**
> (2026-07-22), frontend HEAD **`904a478`** on `feat/real-backend-integration`.

## TL;DR

- **The original 2026-07-12/13 wave is fully closed end-to-end** (backend fixed
  _and_ frontend shipped) — those rows have been removed from this file; see §3
  for where the audit trail now lives.
- **`BE-I-21` (blog create 404) is fixed** on the backend (`30bfff5`) and the FE
  was already built (`5404e77`) → **removed**; only an E2E re-test remains.
- **4 active stoppers** (§1): `BE-I-23`, `BE-I-24` (real-exam resume + entry
  `certId` — FE shipped degraded workarounds), `BE-I-25` (no DOB —
  `complete-account` cannot ship), `BE-I-28` (no CMS draft preview). `BE-I-27` is
  **narrowed** — catalog images can now be uploaded, CMS sections and blog bodies
  still cannot.
- **Four items now owe FRONTEND work, not backend work** (§2): **`BE-I-30`** ⛔
  `GET /landing` was deleted and the landing page 404s **right now**;
  **`BE-I-29`** lesson `contentText` is required and the admin form breaks;
  **`BE-I-22`** (exam answer review) and **`BE-I-26`** (contact submissions) were
  fixed on the backend but nothing consumes them yet.

---

## 1. Active stoppers — backend NOT fixed

| #           | Blocks / degrades                                       | Backend evidence (verified 2026-07-27)                                                                                                                                                                                                                                                 | FE status today                                                                                                                                            |
| ----------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BE-I-23** | Reload-**resume** of a live exam                       | `ExamService.getSessionStatus()` returns `{ sessionId, remainingSeconds, answers, status }` only — no questions (`exam.service.ts:529-550`). Unchanged at HEAD `7160f11`.                                                                | Shipped with a **workaround** (`b951242`): a local IndexedDB question snapshot rebuilds the paper; if IndexedDB is unavailable the resume degrades.        |
| **BE-I-24** | Driving `POST /exam/pre-exam-confirmation` from the FE | `certId` appears only on `PreExamConfirmationDto` / `AssignExamDto` inputs (`dto/exam.dtos.ts:53,99`); neither `validate-access` nor `start` returns a `certId` (`exam.service.ts:298-421`). Unchanged at HEAD `7160f11`.               | Shipped **deferred** (`b951242`): the FE relies on `start`'s 409 "identity confirmation required"; the confirmation step is not reachable from exam entry. |
| **BE-I-25** | `/auth/complete-account` onboarding wizard             | No date-of-birth column anywhere (`grep -r "date_of_birth\|dateOfBirth" src/database/entities src/modules/profile` → 0 hits) and `UpdateProfileDto` accepts only phone/locale/country/city/street/address/postalCode/occupation/position. | **Stub** — `complete-account.page.ts:947` still `TODO`s the submit. Cannot ship without dropping the birthday step or a backend DOB field.                 |
| **BE-I-27** | Images in the **admin CMS / blog** editors             | **Narrowed 2026-07-27.** `66a7632` added `POST /admin/catalog/:id/image-upload-url` (certificate images, public-read ACL) — but CMS section image fields, page `ogImageUrl` and blog `contentHtml` images still have no upload path.     | Not built. The catalog form can gain a real picker; CMS/blog editors keep a "paste a URL" field.                                                          |
| **BE-I-28** | **Draft preview** in the admin CMS editor              | `CmsService.getPublicPage()` 404s anything not PUBLISHED (`cms.service.ts:89-92`); the admin read returns the raw, un-hydrated shape. No preview route exists at HEAD `7160f11`.                                                        | Not built. A true WYSIWYG preview is impossible; structural preview only.                                                                                  |
**Severity call:** **BE-I-25** is the only hard stopper left — it blocks the
`complete-account` wizard outright. **BE-I-23/24** are degraders: the real-exam
engine ships and works with a documented reduction in behaviour. **BE-I-27/28**
cap CMS editor quality but do not stop the CMS work.

## 2. Resolved on backend → FE follow-up tracked in Implementation Progress

| #                    | Backend fix (evidence)                                                                                                                                                                | FE work now unblocked (tracked in IP)                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BE-I-30** ⛔       | _(inverse case)_ `66a7632` **deleted `GET /landing`** (`LandingController` + `landing-response.dto.ts` removed); replacement is `GET /analytics/public-stats` → `{ stats:{ programs, students, certificatesIssued } }` (`analytics/public-stats.controller.ts:20-31`), with featured programs from `GET /catalog` and static content from `GET /cms/pages/home`. | **⛔ Landing 404s today** — `features/landing/data-access/landing.api.ts:21-25` still calls `/landing`. Fix = Slice 1 of [`cms-frontend-plan.md`](./cms-frontend-plan.md).                                     |
| **BE-I-22**          | ✅ Fixed `66a7632` — `GET /exam/attempts/:attemptId/review` (`exam.controller.ts:224-249`): owner-only, terminal attempts only (422 otherwise), returns `options[].isCorrect`, `selectedOptionId`, `correctOptionId`, per-question `isCorrect`, `explanation`.                                                                                                  | **FE follow-up:** re-enable the review section on `exam-result.page.ts` (commented out, not deleted, in `b951242`) and add the transport to `exam.api.ts`.                                                    |
| **BE-I-26**          | ✅ Fixed `2976be0` → `7160f11` — public `POST /contact` (throttled 3/60 s, honeypot `company`, uniform 201) + admin `/admin/contact` list/detail/status/delete (`contact.controller.ts:36-66`, `contact-admin.controller.ts:48-111`).                                                                                                                           | **FE follow-up:** the CMS `contact_form` section can submit for real (plan Slice 6) and an admin inbox page is newly possible (plan Slice 10).                                                                |
| **BE-I-29**          | _(inverse case)_ `72a711c` made `contentText` required on `CreateLessonDto` (`learning/dto/lesson.dtos.ts:41-49`) — a breaking change, not a gap.                                                                                                                                                                                                              | **FE fix owed:** `toCreateLessonBody()` omits `contentText` when blank (`features/admin/data-access/curriculum.mappers.ts:83-94`) → 400 today. Make the admin lesson-content field required.                  |
| **SEO**              | `43bd2d8` → `a0a153a`: `GET /sitemap.xml` + `GET /robots.txt` (served under `/api/v1`; edge rewrite expected) and `seo.jsonLd` embedded in CMS page / blog detail / catalog detail responses.                                                                                                                                                                  | **FE follow-up:** render `seo.jsonLd` into `<script type="application/ld+json">` (plan Slice 5); sitemap/robots are an edge-config task, not an FE route.                                                     |
| **CMS**              | New module merged `3e52625` (`4ec6423`, `e0f74d8`): public `GET /cms/pages/:slug` + `/cms/globals/:key`, admin `admin/cms/*` (`cms.controller.ts`, `cms-admin.controller.ts:70-295`).                                                                                                                                                                          | **Entirely unconsumed** — no `*.api.ts` in `src/app` references `/cms`. Full build plan: [`cms-frontend-plan.md`](./cms-frontend-plan.md) (11 slices, Stage 2).                                               |
| **Catalog images**   | `66a7632`: `POST /admin/catalog/:id/image-upload-url` `{ imageType, contentType }` → `{ uploadUrl, requiredHeaders, key, publicUrl }` (echo `requiredHeaders` incl. `x-amz-acl: public-read` on the PUT).                                                                                                                                                      | **FE follow-up:** replace the pasted-URL fields in the admin catalog form (B8) with a real picker, reusing the A1 avatar-upload pattern.                                                                      |
| **Analytics window** | `72a711c` added `from`/`to` to `DashboardQueryDto` (overrides `months`).                                                                                                                                                                                                                                                                                      | B6 admin dashboard can gain a real date-range picker; `dashboard.api.ts:27` sends `months` only.                                                                                                             |
| **Student detail**   | `72a711c` expanded `StudentDetailDto` with `certificates[]`, `attempts[]`, `exams.{assigned,purchases}` (`users/dto/student-detail-response.dto.ts`).                                                                                                                                                                                                         | Additive — FE maps `counts` only (`users.model.ts:20-31`). Optional enrichment of the admin student-detail page.                                                                                             |

## 3. Removed from this file — resolved end-to-end (backend + frontend)

Per the triage rule these are done and no longer tracked here. Each is recorded
as complete in [`implementation-progress.md`](./implementation-progress.md); the
backend-commit → blocker mapping is preserved in
[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md) →
"Backend commits mapped to blockers".

| #           | Backend fix                                                                            | Frontend commit                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BE-I-03** | `10965cb`                                                                              | `6f09077` admin staff (B3)                                                                                                                                  |
| **BE-I-04** | `e4b347c`                                                                              | `9b18571` catalog card fields (B8)                                                                                                                          |
| **BE-I-05** | `1b603f1`                                                                              | `3ea7e28` promo codes (B4)                                                                                                                                  |
| **BE-I-06** | `cb10205`                                                                              | `0d95e6e` (+ `d1ce3e8`) lesson quiz (B5)                                                                                                                    |
| **BE-I-07** | `1515dff`                                                                              | `9559ec1` admin dashboard (B6)                                                                                                                              |
| **BE-I-08** | `e4b347c`                                                                              | `242a11d` avatar upload (A1)                                                                                                                                |
| **BE-I-11** | `334d0c6`                                                                              | `1940501` public blog · `5404e77` admin blog                                                                                                                |
| **BE-I-13** | `a36ddfd`                                                                              | `7268d26` curriculum (B1)                                                                                                                                   |
| **BE-I-14** | `a36ddfd`                                                                              | `0db202e` publish `reasons[]` (B7)                                                                                                                          |
| **BE-I-15** | `a36ddfd`                                                                              | `451af2a` cert revocation (B2)                                                                                                                              |
| **BE-I-16** | `a36ddfd`                                                                              | `3bed4c1` credentials list (A3)                                                                                                                             |
| **BE-I-17** | `a36ddfd`                                                                              | `554fbe6` real-exam history (A7)                                                                                                                            |
| **BE-I-18** | `181cd9f`                                                                              | `99917c8` notifications (A4)                                                                                                                                |
| **BE-I-19** | `65bf4e8`                                                                              | `c659335` delete + export (A2)                                                                                                                              |
| **BE-I-20** | `1515dff`                                                                              | `0272e27` insights (A5) · `469f429` landing (A6)                                                                                                            |
| **BE-I-21** | `30bfff5` (+ `d7a78e6`) — writes return the in-hand entity (`blog.service.ts:196-198`) | `5404e77` admin blog authoring (built before the fix; no FE change needed). **Open follow-up:** E2E create → publish → public-read re-test against api-dev. |

Also delivered end-to-end from the same wave: two-step **admin OTP login**
(BE `e97de75` → FE `ae6ae44`, C1 — **security review still pending**) and **GDPR
cookie consent** (BE `65bf4e8` → FE `6fddf8e`, C2).

---

## 4. Behavioural notes (still true — not blockers, FE already adapts)

- **BE-I-01 / BE-I-12** — No global response envelope; validation errors return
  **HTTP 400** with `code`. Exam **domain-state conflicts return 409** (`5c11460`);
  convention is 400 = input validation, 409 = domain-state conflict. Mock-exam
  still uses 422 for its own conflicts (separate module). Map per endpoint; key off
  `code`/`errors[]`, not status.
- **BE-I-02** — Refresh cookie is `SameSite=Lax`, `Secure` only in prod/staging.
- **BE-I-09** — Two overlapping "list exams for a cert" endpoints (assign vs
  authoring) — pick per screen.
- **BE-I-10** — `GET /health` is at the bare origin; `/health/full` is under `/api/v1`.
- **Week-9 i18n (`be902fe`/`d67d7ff`)** — backend `SUPPORTED_LOCALES` is
  `en/tr/fr/es/ar/de`; validation errors + emails are localized by `X-Lang`. No FE
  break (app UI stays en/fr/ar; the extra locales are authoring targets).
- **Marketing homepage — decision made for us (2026-07-26).** `GET /landing` was
  deleted (`66a7632`), so the CMS `home` page is now the single source for static
  home content, `GET /catalog` for featured programs and
  `GET /analytics/public-stats` for the live counters. See **BE-I-30**.
- **SEO plumbing is backend-served** — `GET /sitemap.xml` and `GET /robots.txt`
  live under `/api/v1` (`43bd2d8`); getting them to the site root is an edge/CDN
  rewrite, not an Angular route. Non-production `robots.txt` is `Disallow: /`.

## What's next

The frontend backlog is in
[`implementation-progress.md` → Remaining tasks](./implementation-progress.md#remaining-tasks-high-level);
the endpoint-level checklist is in
[`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md). The only items
genuinely waiting on the backend are the seven in §1.
