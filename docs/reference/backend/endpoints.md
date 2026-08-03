# Backend Endpoint Inventory

> Full controller/endpoint sweep, verified against `IOS_Backend/src/modules/**`
> source (read-only). Conventions (envelopes, errors, roles, auth) are in
> [`api-conventions.md`](./api-conventions.md). CMS/blog/contact endpoints are
> in [`cms-blog-contact.md`](./cms-blog-contact.md). WebSocket contracts are in
> [`websockets.md`](./websockets.md).
>
> Legend — **Auth**: `Public` = no token; `JWT` = any valid access token;
> `Student` = student token only (admin ⇒ 403); `@Roles(...)` = listed admin
> roles (`super_admin` always allowed). All paths under `/api/v1` unless noted.

## Modules overview

| Module | Responsibility |
| --- | --- |
| `AuthModule` | Register/login (student + admin), JWT issue, refresh rotation, email verify, password reset/change, login rate-limit |
| `ProfileModule` | Student self-service `/me` profile + password change |
| `CatalogModule` | Public certificate catalog + admin certificate CRUD |
| `LearningModule` | Student curriculum/lessons/quizzes/progress + admin module/lesson CRUD; public outline |
| `ExamModule` | Real exam: access codes, session start/autosave/submit, admin exam authoring + assignment; `/exam` WS gateway |
| `MockExamModule` | Purchase-gated practice exams (separate question bank), soft timer, reveal; admin mock-question CRUD; `/mock` WS gateway |
| `PaymentModule` | Stripe checkout (enrollment + retake), promo codes, transaction history, Stripe webhook |
| `CertificateModule` | Public verification page/JSON + admin revocation; issuance listener |
| `NotificationModule` | Durable transactional-email queue + worker |
| `UsersModule` | Admin student oversight (list/detail/attempts/access codes/revoke) |
| `AuditModule` | Admin audit-log reader (super_admin) |
| `HealthModule` | Liveness + deep health |
| `WebModule` | Root HTML pages for email links (verify-email, reset-password) |
| `MailModule` / `StorageModule` / `RedisModule` | Internal (email rendering, S3/Spaces signed URLs, Redis client) |

## Profile — `@Controller('me')` (Student)

| Method | Path | Response | Notes |
| --- | --- | --- | --- |
| GET | `/me` | `ProfileResponseDto` | full profile incl. `direction`, `avatarUrl`, timestamps |
| PATCH | `/me` | `ProfileResponseDto` | partial; `firstName/lastName/email` **not** editable; explicit `null` clears a field |
| PATCH | `/me/password` | `MessageResponseDto` | verifies current pw, revokes all sessions, clears cookie |
| GET | `/me/certificates` | `{ data }` | earned certs (BE-I-16) |
| POST | `/me/avatar-upload-url` | bare | `{ contentType }` → `{ uploadUrl, key, expiresInSeconds }` (BE-I-08) |
| GET | `/me/export` | bare | GDPR data export |
| POST | `/me/delete` | message | `{ password }` step-up; anonymises in place (BE-I-19) |

## Catalog — public `@Controller('catalog')`, admin `@Controller('admin/catalog')`

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/catalog` | Public | `CatalogListResponseDto` (active only) |
| GET | `/catalog/:id` | Public | `CatalogDetailResponseDto` (404 if inactive) |
| GET | `/catalog/:id/outline` | Public | curriculum **titles only**, no content |
| GET | `/admin/catalog` | content_creator, learning_admin | list incl. inactive |
| GET | `/admin/catalog/:id` | content_creator, learning_admin | detail incl. raw `translations` |
| POST | `/admin/catalog` | content_creator, learning_admin | `{ data }` (409 dup `programCode`) |
| PATCH | `/admin/catalog/:id` | content_creator, learning_admin | `{ data }` |
| PATCH | `/admin/catalog/:id/translations` | content_creator, learning_admin | shallow per-locale merge |
| DELETE | `/admin/catalog/:id` | learning_admin | soft delete (`active=false`) |
| POST | `/admin/catalog/:id/image-upload-url` | content_creator, learning_admin | `{ imageType, contentType }` → `{ uploadUrl, requiredHeaders, key, publicUrl }` (public-read ACL; echo `requiredHeaders` incl. `x-amz-acl: public-read`) |

`CatalogItemDto`: `id, programCode, title, description, price, currency,
thumbnailUrl, active, locale, direction, fallbackUsed, createdAt, updatedAt`.
`Certificate` entity also has `badgeImageUrl, track, level (foundation|practitioner|authority), durationHours, syllabusUrl` — now writable via
`Create/UpdateCertificateDto` (was BE-I-04, resolved).

## Learning — student `@Controller('learning')`, admin `@Controller('admin')`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/learning/certs/:certId/curriculum` | Student | module/lesson tree + completion; 403 if not enrolled |
| GET | `/learning/lessons/:id` | Student | full lesson + signed video URL (`meta.videoUrlExpiresInSeconds`); purchase-gated |
| GET | `/learning/lessons/:id/quiz` | Student | correct answers stripped (404 if no quiz) |
| POST | `/learning/lessons/:id/quiz/check` | Student | instant feedback, **nothing persisted**, unlimited attempts |
| POST | `/learning/lessons/:id/complete` | Student | idempotent; returns `alreadyCompleted` |
| GET | `/learning/progress` | Student | `[{ certId, programCode, title, totalLessons, completedLessons, percentComplete }]` |
| POST/PATCH/DELETE | `/admin/modules[/:id]` | content_creator/learning_admin (delete: learning_admin) | soft delete |
| POST/PATCH/DELETE | `/admin/lessons[/:id]` | content_creator/learning_admin (delete: learning_admin) | soft delete; **`contentText` is required & non-empty on create** (breaking change, `72a711c`) |
| GET | `/admin/certs/:id/curriculum` | content_creator, learning_admin | all statuses, full admin fields incl. `translations` |

All learning student endpoints return `{ data, meta }`. Lesson quizzes have
**no dedicated authoring endpoints of their own** at the top level — see
`/admin/lessons/:id/quizzes` below.

## Exam (real) — student `@Controller('exam')`, admin `@Controller('admin/exam')` + `@Controller('admin')`

Student runner:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/exam/pre-exam-confirmation` | `{ certId, fullName, idNumber? }`; attestation NOT persisted; flips `preExamConfirmed`. `certId` not reachable at entry — BE-I-24. |
| POST | `/exam/validate-access` | `{ code, examId? }` → exam meta + `expiresAt`, does not consume the code |
| POST | `/exam/start` | `{ code, examId? }` → **consumes** code, `{ sessionId, durationSeconds, expiresAt, questions[] }` (`isCorrect` stripped) |
| GET | `/exam/sessions/:sessionId` | `{ sessionId, remainingSeconds, answers, status }` — **no questions** (BE-I-23) |
| POST | `/exam/sessions/:sessionId/autosave` | bulk `{ answers }` map (last-write-wins, no `clientSeq` on the wire) |
| POST | `/exam/sessions/:sessionId/submit` | → `{ score, passed, correctCount, totalCount }`, **no `attemptId`** (BE-I-32) |
| POST | `/exam/sessions/:sessionId/late-submit` | within 120s grace; sets `lateFlag`; 403 after window |
| GET | `/exam/attempts` | cursor `{ data:[{ id, examTitle, program, score, passed, submittedAt, durationSeconds, status, lateFlag }], meta }` — never the answer snapshot |
| GET | `/exam/attempts/:attemptId/review` | owner-only, terminal-only (422 otherwise), returns options with `isCorrect`, `selectedOptionId`, `correctOptionId`, per-question `isCorrect`, `explanation` (added `66a7632`, resolves BE-I-22) |

Admin assignment (`@UseGuards(RolesGuard)`):

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| POST | `/admin/exam/assign` | learning_admin | issues one-time code (shown once); omit `examId` ⇒ auto-assign next unattempted exam |
| GET | `/admin/exam?certId=` | learning_admin | list a cert's **published** exams (ordered) — overlaps with authoring's list (BE-I-09, info-only) |

Admin authoring (`@Controller('admin')`):

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| POST | `/admin/certs/:certId/exams` | content_creator, learning_admin | create DRAFT (optional inline questions) |
| GET | `/admin/certs/:certId/exams` | content_creator, learning_admin | list all statuses + `questionCount` |
| GET | `/admin/exams/:examId` | content_creator, learning_admin | full authoring view (**includes** `isCorrect`) |
| PATCH | `/admin/exams/:examId` | content_creator, learning_admin | 409 `EXAM_LOCKED` if published |
| PATCH | `/admin/exams/:examId/translations` | content_creator, learning_admin | per-locale title merge |
| POST/PATCH/DELETE | `/admin/exams/:examId/questions[/:questionId]` | content_creator, learning_admin | DRAFT only; update replaces the whole option set |
| GET | `/admin/exams/:examId/preview` | content_creator, learning_admin | student-shape preview (`isCorrect` stripped) |
| POST | `/admin/exams/:examId/publish` | learning_admin | 409 `EXAM_NOT_PUBLISHABLE` + `errors[]` (BE-I-14, resolved — reasons ARE in `errors[]`, not dropped) |
| POST | `/admin/exams/:examId/unpublish` | learning_admin | 409 if unused codes / active session |
| DELETE | `/admin/exams/:examId` | learning_admin | hard-delete DRAFT with zero attempts/codes |

## Mock exam — student `@Controller('mock')`, admin `@Controller('admin/mock')`

⚠️ Route order matters: literal `/mock/history` and `/mock/attempts/:id`
precede `/mock/:id` — mirror this exactly in frontend service methods.

Student (all Student-only):

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/mock/start` | `{ certId }` → samples ≤50 from the cert's bank; 403 not enrolled, 409 active attempt exists |
| GET | `/mock/history` | cursor page, RLS-scoped |
| GET | `/mock/attempts/:id` | full review (submitted only; **reveals** answers), 422 if not submitted |
| GET | `/mock/:id` | live session status (remaining, merged answers, `timeUp`) |
| POST | `/mock/:id/autosave` | per-question merge, no TTL reset |
| POST | `/mock/:id/extend` | +N min soft timer, capped; 422 when exhausted |
| POST | `/mock/:id/submit` | grade on answers so far (empty body = "Exit"); never issues a cert |
| POST | `/mock/:id/questions/:questionId/reveal` | mock-only "Hint": `{ selectedCorrect, correctOptionId }` |

Admin (`@UseGuards(RolesGuard)`):

| Method | Path | Roles |
| --- | --- | --- |
| GET | `/admin/mock/certs/:certId/questions` | content_creator, learning_admin |
| POST/PATCH/DELETE | `/admin/mock/questions[/:id]` | content_creator, learning_admin (delete: learning_admin) — soft delete |

## Payments — `@Controller('payments')` (Student) + webhook (Public)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/payments/checkout` | server recomputes price + promo; returns Stripe URL, or enrols immediately if $0. 404 cert, 409 already enrolled, 400 bad promo |
| POST | `/payments/retake` | flat retake fee; $0 unlocks immediately |
| GET | `/payments/transactions` | cursor-paginated own transactions |
| POST | `/payments/webhook` | Public, `@SkipThrottle` — Stripe HMAC-verified, `{ received: true }` |

**Wired 2026-08-03**: `/checkout` (place-order page), `/payments/success`,
`/payments/cancel`, and the `/certifications/*` "Enroll Now" CTAs now drive
`checkout` through `PaymentsStore`. `retake` still has no UI entry point.
See [`../../status/current-status.md`](../../status/current-status.md) and
[`open-issues.md`](./open-issues.md) (**BE-I-33** — the `successUrl`/
`cancelUrl` host misconfig on `api-dev` that's still blocking end-to-end
verification of the paid path).

## Certificates — public `@Controller('verify')`, admin `@Controller('admin/certs')`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/verify/:certId` | Public | content-negotiated (HTML for browsers/QR, JSON for API clients); `certId` is the public `IOS-…` string, not a UUID |
| PATCH | `/admin/certs/issued/:id/revoke` | super_admin, learning_admin | idempotent, writes audit row |
| GET | `/admin/certs/issued` | super_admin, learning_admin | `{ data, meta.pagination }` — filter by user/cert |

## Users (admin) — `@Controller('admin/users')`

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/admin/users` | learning_admin, support_admin | no PII/hashes |
| GET | `/admin/users/:userId` | learning_admin, support_admin | `StudentDetailResponseDto` + `counts{purchases,attempts,certificatesEarned}` + (additive, `72a711c`) `certificates[]`, `attempts[]`, `exams.{assigned,purchases}` |
| GET | `/admin/users/:userId/attempts` | learning_admin, support_admin | no answer snapshot |
| GET | `/admin/users/:userId/access-codes` | learning_admin, support_admin | derives `status`, no `tokenHash` |
| POST | `/admin/users/:userId/access-codes/:codeId/revoke` | learning_admin | 404 unknown, 409 if already used |

## Audit logs (admin) — `@Controller('admin/audit-logs')`

`GET /admin/audit-logs` — `super_admin` only. Filters: `tableName`,
`actorId`, `recordId`, `action`; cursor. Sensitive keys redacted in
old/new data.

## Admin dashboard — `GET /admin/dashboard/overview`

Roles **super_admin / finance_admin**. **Bare** object. Query `?months=N`
(1–24, default 6) sizes the revenue series; also accepts `from`/`to` (ISO)
which override `months` (`72a711c`).

```jsonc
{
  "revenue": { "total": 18234.75, "currency": "USD", "last30Days": 2450.0,
    "monthly": [{ "month": "2026-03", "revenue": 1499.5, "transactions": 12 }] },
  "transactions": { "completed": 320, "pending": 14, "failed": 6, "refunded": 3 },
  "enrollments": { "total": 512, "last30Days": 48 },
  "students": { "total": 486, "newLast30Days": 37 },
  "exams": { "attempts": 640, "passed": 520, "passRate": 0.8125, "avgScore": 84.32 },
  "certificates": { "issued": 498 },
  "topPrograms": [{ "certId": "…", "program": "…", "programCode": "PSM", "enrollments": 210, "revenue": 10290.0 }]
}
```

`exams.passRate` is a 0–1 fraction (format as %); `revenue.currency` may be
`"MIXED"` (completed tx span >1 currency, no FX).

## Health

`GET /health` (no `/api/v1` prefix, Public) — liveness. `GET /api/v1/health/full`
(super_admin) — deep DB + storage check.

## Web (root HTML, not API)

`GET /verify-email?token=`, `GET /reset-password?token=`,
`POST /reset-password` (urlencoded form) — backend-hosted email-link landing
pages; the SPA generally doesn't call these but should be aware they exist at
the root (not `/api/v1`).

## Admin staff / promo (see also `models.md` for entities)

- **Staff** `/admin/staff` (super_admin only): `POST` create, `GET` list,
  `GET/PATCH /:id`, `POST /:id/deactivate`.
- **Promo codes** `/admin/promo-codes` (super_admin/finance_admin): full CRUD.
- **Lesson-quiz authoring** `/admin/lessons/:id/quizzes` (POST/GET),
  `/admin/quizzes/:id` (PATCH/DELETE), `/admin/quizzes/:id/questions`
  (POST), `/admin/quizzes/:id/questions/:qid` (PATCH/DELETE).

## Key DTO validation notes

- `RegisterDto` — password regex: upper+lower+digit+special, 8–128.
- `UpdateProfileDto` — all optional & **nullable**; `firstName/lastName/email`
  intentionally absent (locked, appear on certs). No `dateOfBirth` field
  exists anywhere (BE-I-25).
- `CatalogQueryDto.active` — strict `'true'`/`'false'` string parse (fixed,
  `5133b4e` — previously `false` flipped to `true`).
- `CreateLessonDto.contentText` — now `@IsString() @IsNotEmpty()`, **required**
  on create (breaking change, `72a711c`); optional-but-non-blankable on update.
- `CreateQuestionDto.options` — `≥2`, options replace the whole set on update.
