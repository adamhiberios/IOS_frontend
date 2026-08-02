# Admin App

`features/admin`, 17 pages + shell, lazy at `/admin`. **Every admin page is
REAL** — each injects a `*Store`/`*Api` built on
`${environment.apiBaseUrl}/admin/…`, matched to a NestJS controller. Full
per-page build details (data-access shapes, i18n keys, decisions) are
archived at
[`../../archive/admin-pages-build-log.md`](../../archive/admin-pages-build-log.md).

## Gating

Owned by the feature, not `app.routes.ts`. `/admin/login` uses
`adminLoginGuard`; everything else sits under `AdminLayout` behind
`adminAuthGuard` (unauthenticated → `/admin/login?returnUrl=`, authenticated
non-admin → `/forbidden`). `returnUrl` is rebuilt from
`getCurrentNavigation().extractedUrl` (absolute) — a past bug used the
guard's mount-relative `segments`, producing broken redirects. Per-page role
narrowing is client-side (`auth.hasRole(...)`, UI-hiding only) with the
backend re-authorizing independently.

## Page inventory

| # | Page | Roles (manage) | Backend |
| - | --- | --- | --- |
| 1 | Admin Login (`/admin/login`) | — | `POST /auth/admin/login` (+ OTP step) |
| 2 | Catalog list/create/edit/deactivate (`/admin/catalog[/new\|/:id/edit]`) | content_creator, learning_admin (delete: learning_admin) | `/admin/catalog` CRUD |
| 2c | Catalog translations (ar/fr) | content_creator, learning_admin | `PATCH /admin/catalog/:id/translations` |
| 3 | Users list + student detail (`/admin/users[/:id]`) | learning_admin, support_admin | `/admin/users*` |
| 3b | Student attempts / access codes / revoke | learning_admin (revoke), support_admin (read) | `/admin/users/:id/attempts`, `.../access-codes`, revoke |
| 4 | Curriculum (`/admin/curriculum`) | content_creator, learning_admin (deactivate: learning_admin) | `GET /admin/certs/:id/curriculum` + module/lesson CRUD |
| 4b | Lesson-quiz authoring (`/admin/lessons/:id/quizzes`) | content_creator, learning_admin (delete: learning_admin) | `/admin/lessons/:id/quizzes`, `/admin/quizzes/*` |
| 5 | Exam authoring list + lifecycle (`/admin/exams`) | content_creator, learning_admin (publish/delete: learning_admin) | `/admin/certs/:id/exams`, publish/unpublish |
| 5b | Exam question editor (`/admin/exams/:id`) | content_creator, learning_admin | `/admin/exams/:id`, `.../questions*` |
| 5c | Exam title translations (ar/fr) | content_creator, learning_admin | `PATCH /admin/exams/:id/translations` |
| 6 | Exam assignment (`/admin/exam`) | learning_admin | `GET /admin/exam`, `POST /admin/exam/assign` |
| 7 | Mock questions (`/admin/mock`) | content_creator, learning_admin (delete: learning_admin) | `/admin/mock/*` |
| 8 | Audit logs (`/admin/audit-logs`) | super_admin only | `GET /admin/audit-logs` |
| 9 | Certificate revocation (`/admin/issued-certs`) | super_admin, learning_admin | `GET /admin/certs/issued`, revoke |
| 10 | Admin staff (`/admin/staff`) | super_admin only | `/admin/staff*` |
| 11 | Promo codes (`/admin/promo-codes`) | super_admin, finance_admin (support_admin read-only) | `/admin/promo-codes*` |
| 12 | Dashboard metrics (`/admin` home) | super_admin, finance_admin | `GET /admin/dashboard/overview` |
| 13 | Blog authoring (`/admin/blog`) | content_creator, learning_admin (publish/delete: learning_admin) | `/admin/blog*` |
| 14 | Contact inbox (`/admin/contact`) | support_admin, learning_admin (delete: learning_admin) | `/admin/contact*` — 🟢 built & staged, not yet committed |

## Architectural notes worth knowing before touching admin pages

- **Active-first sort** is the list convention for lists with a status flag
  (client-side stable sort — backend only sorts by `created_at`). Applied to
  catalog; students list has no active flag so unaffected.
- **Backdrop-scroll dialog pattern** — the `fixed` overlay scrolls via
  `overflow-y-auto` + a `min-h-full` flex wrapper (card itself has no
  `max-h`/`overflow`), used wherever a dialog contains an `ios-select` so its
  absolute popover isn't clipped. Used on staff, promo-codes, and others.
- **`required`-validator wrapper** — a module-level helper wrapping
  `Validators.required` as a call, needed wherever a `FormArray` degrades
  form-builder overload inference enough to trip the type-aware
  `unbound-method` lint rule (mock questions, exam authoring, exam questions).
- **Publish-gate `reasons[]`** (exam `EXAM_NOT_PUBLISHABLE`, CMS
  `CMS_PAGE_NOT_PUBLISHABLE`) arrive in the RFC-7807 `errors[]` array — surface
  them as a bulleted list, not the generic message (the B7 precedent).
- **Two known-duplicate list endpoints:** `GET /admin/exam?certId=`
  (assign, published-only) vs. `GET /admin/certs/:certId/exams` (authoring,
  all statuses) — pick deliberately per screen (BE-I-09, info-only).
- **`/admin/lessons/:lessonId/quizzes` takes its heading from `?title=`** — a
  direct URL renders a blank title (minor, known).
- **15-minute local-dev logout gotcha (documented, not a bug):** `ng serve`
  on `localhost:4200` against the cross-site dev API means the `SameSite=Lax`
  refresh cookie isn't sent on the refresh XHR; the 15-min in-memory access
  token expiring logs you out. Not fixable without a same-site dev proxy
  (one was prototyped, then reverted at the user's request). Re-login when
  it happens, or serve same-site.

## Contact inbox specifics

See [`../backend/cms-blog-contact.md`](../backend/cms-blog-contact.md#contact--public-controllercontact-admin-controlleradmincontact)
for the triage model, PII handling, and hard-delete rationale.
