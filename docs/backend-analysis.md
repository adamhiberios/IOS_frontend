# Backend Analysis Report — IOS LMS

> **Source of truth:** the NestJS backend at `IOS_Backend/` (read-only). This
> document is derived **exclusively from the backend source code**, not Swagger.
> It exists so the frontend can expose every backend capability through clean,
> typed services. Any behaviour that was unclear in the code is captured under
> [Backend Issues Report](#backend-issues-report) rather than guessed.
>
> Backend stack: **NestJS + TypeORM (PostgreSQL) + Redis + Socket.IO + Stripe +
> S3-compatible storage (DO Spaces) + nestjs-i18n + Passport-JWT**.
>
> Deployed API base URLs (never run the backend locally):
>
> - **Dev:** `https://api-dev.instituteofscrum.org/api/v1`
> - **Prod:** `https://api.instituteofscrum.org/api/v1`

---

## 1. Global conventions (read first)

### 1.1 Routing / prefix

- Global prefix **`/api/v1`** (set in `main.ts`), **except** these root paths:
  `health`, `verify-email`, `reset-password` (email-link web pages).
- So: liveness probe is `GET /health` (no prefix); the deep check is
  `GET /api/v1/health/full`. Everything else is under `/api/v1`.

### 1.2 Global request pipeline

Applied to **every** request (`app.module.ts`):

1. **`ThrottlerGuard`** (global) — default tier **100 req / 60 s per IP**; the
   `auth` tier is **5 req / 60 s** (login/register/verify/forgot/reset and the
   HTML reset form). Exceed → **429**.
2. **`JwtAuthGuard`** (global) — every route requires a valid access JWT
   **unless** decorated `@Public()`.
3. **`ValidationPipe`** (global) — `whitelist: true`, `forbidNonWhitelisted:
true`, `transform: true`, `enableImplicitConversion: true`.
   → Unknown body/query properties are **rejected with 400**, not stripped.
   → Query strings are coerced to the DTO's declared types.
4. **`RlsInterceptor`** — for authenticated requests, opens a per-request DB
   transaction and sets Postgres session GUCs (`app.current_user_id`,
   `app.current_admin_id`, `app.current_ip`) so row-level-security policies
   scope reads/writes to the caller. Unauthenticated requests bypass it.
5. **`RolesGuard`** — opt-in per controller via `@UseGuards(RolesGuard)` +
   `@Roles(...)`. Not global.

### 1.3 Authorization header

Access token is sent as `Authorization: Bearer <JWT>`. The refresh token is an
**httpOnly cookie** — never readable by JS (see [§5](#5-authentication--authorization-flow)).

### 1.4 Response envelope — **inconsistent, document per endpoint**

There is **no single global envelope**. Three shapes exist in the code:

- **Bare DTO** — auth, profile, most student exam/mock/learning endpoints
  return the object directly (e.g. `LoginResponseDto`, `ProfileResponseDto`).
- **`{ data }`** — most **admin** write endpoints (catalog/learning/exam
  authoring/mock admin) wrap the payload: `{ data: <resource> }`.
- **`{ data, meta }`** — list endpoints with pagination: `catalog`, `admin/users`,
  `admin/audit-logs`, `mock/history`, `payments/transactions`.

> Frontend mappers must be written **per endpoint**, not globally. See
> [Issue BE-I-01](#backend-issues-report).

### 1.5 Error shape — **RFC 7807 Problem Details** (`application/problem+json`)

Emitted by `GlobalExceptionFilter` for every error:

```jsonc
{
  "type": "https://ios-lms.com/errors/<code-slug>",
  "title": "<localized>",
  "status": 400,
  "detail": "<localized or verbatim>",
  "instance": "/api/v1/...",
  "code": "VALIDATION_FAILED",     // ← switch on THIS, stable contract
  "request_id": "<uuid>",          // also echoed in X-Request-Id response header
  "errors": [                      // present for validation failures, else null
    { "field": "email", "code": "IS_EMAIL", "message": "...", "constraints": {...} }
  ],
  "timestamp": "2026-…Z"
}
```

Stable machine-readable **error codes** (`common/errors/error-codes.ts`):

| Family                   | Codes                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation               | `VALIDATION_FAILED`, `INVALID_LOCALE`                                                                                                          |
| Auth (401)               | `INVALID_CREDENTIALS`, `JWT_EXPIRED`, `JWT_INVALID`, `REFRESH_TOKEN_REUSED`, `REFRESH_TOKEN_INVALID`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_DISABLED` |
| Authorization (403)      | `INSUFFICIENT_ROLE`, `OWNERSHIP_VIOLATION`                                                                                                     |
| Domain (404/409/410/422) | `RESOURCE_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS`, `EMAIL_ALREADY_REGISTERED`                                                                    |
| Infrastructure           | `RATE_LIMITED`, `INTERNAL`                                                                                                                     |

> Note: validation failures and manually-thrown domain `BadRequestException`s
> both surface as **400** with `code: VALIDATION_FAILED` (the backend
> standardised on 400, not 422). The frontend `errorInterceptor` should key off
> `code` + `errors[]`, not the HTTP status alone.

### 1.6 Pagination — **cursor / keyset**, not offset

List endpoints use an **opaque cursor** on `(created_at, id)`, newest-first:

```jsonc
"meta": { "pagination": { "limit": 20, "nextCursor": "<opaque>|null", "hasMore": true } }
```

To fetch the next page, pass `?cursor=<nextCursor>`. `limit` defaults & caps
vary per endpoint (documented below). There is **no total count**.

### 1.7 Internationalisation

- Six supported locales (`common/i18n/types.ts`): **`en, tr, fr, es, ar, de`**.
  `ar` is **RTL**; helper `directionFor(locale)` returns `'ltr' | 'rtl'`.
- Locale resolution (server side) chains: user/admin preference → `X-Lang`
  header → `Accept-Language` → default `en`. Send **`X-Lang: <locale>`** to
  force a locale (the frontend `localeInterceptor` should do this).
- Translatable content lives in a `translations` JSONB column per entity; public
  responses resolve to the requested locale with **English fallback** and expose
  a `fallbackUsed` boolean + `direction` on catalog/profile payloads.

### 1.8 CORS / credentials

Allowlist-driven (`CORS_ORIGINS`), `credentials: true`. The frontend origin must
be on the backend allowlist. Same validator guards the WebSocket namespaces.

---

## 2. Roles (`AdminRole`, `admin-user.entity.ts`)

Five admin tiers plus the implicit "student" account type. **Authorization is
exact-match** against `@Roles(...)`, with **one** exception: `SUPER_ADMIN`
passes every check. There is **no numeric hierarchy** (a documented past bug —
`LEARNING_ADMIN` does **not** implicitly inherit `CONTENT_CREATOR`; both are
listed explicitly wherever both are allowed).

| Role (`role` claim) | Purpose                                   | Typical endpoints                                                                   |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `super_admin`       | Full access; passes all role checks       | audit logs, deep health, cert revoke, everything                                    |
| `learning_admin`    | Owns catalog/curriculum/exam lifecycle    | create/update/**delete/publish** content, assign exams, cert revoke, user oversight |
| `content_creator`   | Authors content but cannot delete/publish | create/update catalog, modules, lessons, exam questions (no delete, no publish)     |
| `finance_admin`     | Finance/payments branch                   | _(no finance admin endpoints exist yet — see Issues)_                               |
| `support_admin`     | Read-only student support                 | list/read students, attempts, access codes                                          |

**Account type** (`type` claim): `'student' | 'admin'`. Student-only endpoints
(`/me`, `/learning/*`, `/mock/*`, `/payments/*`, `/exam/*` student routes) reject
admin tokens with **403** (they're authenticated but not authorised for that
surface).

---

## 3. Guards

| Guard                                  | Scope                                                          | Behaviour                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `JwtAuthGuard` (`modules/auth/guards`) | **Global**                                                     | Validates `Authorization: Bearer` access JWT via `jwt` Passport strategy. Skipped when `@Public()`. 401 on missing/invalid/expired. |
| `JwtRefreshGuard`                      | Per-route (`/auth/refresh`, `/auth/logout`, admin equivalents) | Validates the **refresh** JWT from the `refreshToken` cookie via `jwt-refresh` strategy; attaches `{ payload, rawToken }`.          |
| `RolesGuard` (`common/guards`)         | Per-controller (`@UseGuards`)                                  | Exact-match on `@Roles(...)`; `SUPER_ADMIN` bypass. 403 `Insufficient permissions` otherwise.                                       |
| `ThrottlerGuard` (`@nestjs/throttler`) | **Global**                                                     | Default 100/60s, `auth` tier 5/60s. Stripe webhook is `@SkipThrottle()`.                                                            |

**Decorators** (`modules/auth/decorators`):

- `@Public()` — bypass `JwtAuthGuard`.
- `@CurrentUser()` / `@CurrentUser('id')` / `@CurrentUser('adminId')` — inject the
  authenticated principal (`AuthenticatedUser`: `{ id?, adminId?, type, role?, email?, locale? }`).
- `@Roles(...AdminRole[])` (`common/decorators`).

---

## 4. Modules

| Module                                                    | Responsibility                                                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `AuthModule`                                              | Register/login (student + admin), JWT issue, refresh rotation, email verify, password reset/change, login rate-limit         |
| `ProfileModule`                                           | Student self-service `/me` profile + password change                                                                         |
| `CatalogModule`                                           | Public certificate catalog + admin certificate CRUD                                                                          |
| `LearningModule`                                          | Student curriculum/lessons/quizzes/progress + admin module/lesson CRUD; public outline                                       |
| `ExamModule`                                              | Real exam: access codes, session start/autosave/submit, admin exam authoring + assignment; **`/exam` WS gateway**            |
| `MockExamModule`                                          | Purchase-gated practice exams (separate question bank), soft timer, reveal; admin mock-question CRUD; **`/mock` WS gateway** |
| `PaymentModule`                                           | Stripe checkout (enrollment + retake), promo codes, transaction history, **Stripe webhook**                                  |
| `CertificateModule`                                       | Public verification page/JSON + admin revocation; issuance listener                                                          |
| `NotificationModule`                                      | Durable transactional-email queue + worker                                                                                   |
| `UsersModule`                                             | Admin student oversight (list/detail/attempts/access codes/revoke)                                                           |
| `AuditModule`                                             | Admin audit-log reader (super_admin)                                                                                         |
| `HealthModule`                                            | Liveness + deep health                                                                                                       |
| `WebModule`                                               | Root HTML pages for email links (verify-email, reset-password)                                                               |
| `MailModule`                                              | Email rendering/sending (internal)                                                                                           |
| `StorageModule`                                           | S3/Spaces object storage + signed URLs (`@Global`, internal)                                                                 |
| `RedisModule`                                             | Redis client/subscriber (`@Global`, internal)                                                                                |
| `SeederModule` / `AuditModule` helpers / `mail` templates | Internal                                                                                                                     |

---

## 5. Authentication & Authorization flow

### 5.1 Tokens

- **Access JWT** — signed with `JWT_SECRET`, TTL **900 s (15 min)** default.
  Claims: `{ sub (uuid), type: 'student'|'admin', email, locale, role? }`.
  Returned in the login/refresh **response body** (`accessToken` + `expiresIn`).
  → Store **in memory** and send as `Authorization: Bearer`.
- **Refresh JWT** — signed with `JWT_REFRESH_SECRET`, TTL **604800 s (7 days)**.
  Claims: `{ sub, type, jti (number = refresh_tokens.id) }`. Delivered as cookie
  **`refreshToken`**: `httpOnly`, `secure` (prod/staging only), **`sameSite:
'lax'`**, `path=/api/v1/auth`, `maxAge` 7 days. The bcrypt hash is stored in
  `refresh_tokens`; the plain token is never persisted.

> ⚠️ The cookie is **`SameSite=Lax`**, not `Strict` as the frontend CLAUDE.md/docs
> assume. And it is only `Secure` in prod/staging. See [Issue BE-I-02](#backend-issues-report).
> Because `path=/api/v1/auth`, the browser only sends the refresh cookie to
> `/api/v1/auth/*` routes — i.e. exactly the refresh/logout endpoints.

### 5.2 Endpoints (all `@Public()` unless noted)

| Flow                | Endpoint                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Student register    | `POST /auth/register` → 201 `RegisterResponseDto`                                          |
| Verify email (JSON) | `POST /auth/verify-email` `{ token }`                                                      |
| Resend verification | `POST /auth/resend-verification` `{ email }` (anti-enumeration; always 200)                |
| Student login       | `POST /auth/login` `{ email, password }` → `LoginResponseDto` + sets cookie                |
| Refresh (student)   | `POST /auth/refresh` (cookie; `JwtRefreshGuard`) → new `LoginResponseDto` + rotated cookie |
| Logout (student)    | `POST /auth/logout` (cookie; `JwtRefreshGuard`) → clears cookie                            |
| Forgot password     | `POST /auth/forgot-password` `{ email }` (always 200)                                      |
| Reset password      | `POST /auth/reset-password` `{ token, newPassword }` (revokes all sessions)                |
| **Admin login**     | `POST /auth/admin/login` `{ email, password }` → `LoginResponseDto`                        |
| Admin refresh       | `POST /auth/admin/refresh` (cookie)                                                        |
| Admin logout        | `POST /auth/admin/logout` (cookie)                                                         |

**No public admin registration** — admin accounts are created internally/seeded.
There is currently **no HTTP endpoint to create/list/edit admin users** (see Issues).

### 5.3 Login behaviour the frontend must handle

- **401** `Invalid credentials` — wrong email/password OR inactive account
  (generic, anti-enumeration; a dummy bcrypt compare runs to equalise timing).
- **401** `Email not verified. Check your inbox.` — correct creds but
  `emailVerified=false` (student only). Frontend should offer "resend".
- **429** — IP-based **layer-2 rate limit**: 10 failed logins / 15 min ⇒ a
  30-minute block (persisted, survives restarts). Distinct from the throttler's
  5/60s. Show a "try again later" state.

### 5.4 Refresh rotation & reuse detection

On `POST /auth/refresh`: old refresh token is revoked and a new access+refresh
pair is issued (rotation on every refresh). Presenting a **revoked** token, or
two concurrent refreshes racing (first-writer-wins), triggers **full session
invalidation** for the account and returns 401 `Session invalidated. Please log
in again.` → the frontend must hard-logout and route to login.

### 5.5 Password change (`PATCH /me/password`)

Authenticated; verifies `currentPassword`, then **revokes ALL refresh tokens**
(every device, including the caller) and clears the cookie. Frontend should treat
a 200 here as a forced logout.

---

## 6. Controllers & Endpoints (full inventory)

> Legend — **Auth**: `Public` = no token; `JWT` = any valid access token;
> `Student` = student token only (admin ⇒ 403); `@Roles(...)` = listed admin roles
> (super_admin always allowed). All paths are under `/api/v1` unless noted.

> **Frontend consumption status (rescan 2026-07-22):** a full sweep of the FE
> `*.api.ts` consumers against these 27 controllers lives in
> [`implementation-progress.md` → "Backend ↔ Frontend reconciliation"](./implementation-progress.md#backend--frontend-reconciliation-full-rescan-2026-07-22).
> **BE-ready but FE-missing:** the student real-exam engine (`/exam/*` +
> WS), learning/courses (`/learning/*`), the mock-exam runner (`/mock/*`),
> admin OTP login (`/auth/admin/login/otp`, `/auth/admin/refresh|logout`),
> `POST /auth/verify-email`, and `GET /admin/exams/:examId/preview`. Everything
> else is wired.

### 6.1 Auth (`/auth`, `/auth/admin`) — see §5.2. All `Public`.

### 6.2 Profile — `@Controller('me')` — **Student**

| Method | Path           | Body                | Response             | Notes                                                                                     |
| ------ | -------------- | ------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/me`          | —                   | `ProfileResponseDto` | full student profile incl. `direction`, `avatarUrl`, timestamps                           |
| PATCH  | `/me`          | `UpdateProfileDto`  | `ProfileResponseDto` | partial; `firstName/lastName/email` **not** editable here; explicit `null` clears a field |
| PATCH  | `/me/password` | `UpdatePasswordDto` | `MessageResponseDto` | verifies current pw, revokes all sessions, clears cookie                                  |

### 6.3 Catalog — public `@Controller('catalog')`, admin `@Controller('admin/catalog')`

| Method | Path                              | Auth                              | Query/Body              | Response                                                                  |
| ------ | --------------------------------- | --------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| GET    | `/catalog`                        | Public                            | `CatalogQueryDto`       | `CatalogListResponseDto` (active only)                                    |
| GET    | `/catalog/:id`                    | Public                            | —                       | `CatalogDetailResponseDto` (404 if inactive)                              |
| GET    | `/catalog/:id/outline`            | Public                            | —                       | curriculum **titles only** (module/lesson titles + durations, no content) |
| GET    | `/admin/catalog`                  | `content_creator, learning_admin` | `CatalogQueryDto`       | list incl. inactive                                                       |
| GET    | `/admin/catalog/:id`              | `content_creator, learning_admin` | —                       | detail incl. raw `translations`                                           |
| POST   | `/admin/catalog`                  | `content_creator, learning_admin` | `CreateCertificateDto`  | `{ data }` (409 on dup `programCode`)                                     |
| PATCH  | `/admin/catalog/:id`              | `content_creator, learning_admin` | `UpdateCertificateDto`  | `{ data }`                                                                |
| PATCH  | `/admin/catalog/:id/translations` | `content_creator, learning_admin` | `UpdateTranslationsDto` | shallow per-locale merge                                                  |
| DELETE | `/admin/catalog/:id`              | `learning_admin`                  | —                       | **soft** delete (`active=false`)                                          |

### 6.4 Learning — student `@Controller('learning')`, admin `@Controller('admin')`

| Method | Path                                 | Auth                              | Body              | Notes                                                                                |
| ------ | ------------------------------------ | --------------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| GET    | `/learning/certs/:certId/curriculum` | Student                           | —                 | module/lesson tree + completion; **403 if not enrolled**                             |
| GET    | `/learning/lessons/:id`              | Student                           | —                 | full lesson + **signed video URL** (`meta.videoUrlExpiresInSeconds`); purchase-gated |
| GET    | `/learning/lessons/:id/quiz`         | Student                           | —                 | quiz with correct answers stripped (404 if no quiz)                                  |
| POST   | `/learning/lessons/:id/quiz/check`   | Student                           | `CheckQuizDto`    | instant feedback, **nothing persisted**                                              |
| POST   | `/learning/lessons/:id/complete`     | Student                           | —                 | idempotent; returns `alreadyCompleted`                                               |
| GET    | `/learning/progress`                 | Student                           | —                 | per-cert progress summary (%)                                                        |
| POST   | `/admin/modules`                     | `content_creator, learning_admin` | `CreateModuleDto` | `{ data }`                                                                           |
| PATCH  | `/admin/modules/:id`                 | `content_creator, learning_admin` | `UpdateModuleDto` |                                                                                      |
| DELETE | `/admin/modules/:id`                 | `learning_admin`                  | —                 | soft delete                                                                          |
| POST   | `/admin/lessons`                     | `content_creator, learning_admin` | `CreateLessonDto` |                                                                                      |
| PATCH  | `/admin/lessons/:id`                 | `content_creator, learning_admin` | `UpdateLessonDto` |                                                                                      |
| DELETE | `/admin/lessons/:id`                 | `learning_admin`                  | —                 | soft delete                                                                          |

> Lesson **quizzes have no admin authoring endpoints** — they're seed-only. See Issues.

### 6.5 Exam (real) — student `@Controller('exam')`, admin `@Controller('admin/exam')` + authoring `@Controller('admin')`

Student runner:
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/exam/pre-exam-confirmation` | `PreExamConfirmationDto` | attests name/ID (NOT persisted); flips `preExamConfirmed` |
| POST | `/exam/validate-access` | `ValidateAccessDto` | validates code **without consuming**; returns exam meta + `expiresAt` |
| POST | `/exam/start` | `StartExamDto` | **consumes** code, creates session, returns `sessionId`, `durationSeconds`, `expiresAt`, `questions` (isCorrect stripped) |
| GET | `/exam/sessions/:sessionId` | — | status + remaining seconds |
| POST | `/exam/sessions/:sessionId/autosave` | `AutosaveDto` | saves answers, no TTL reset |
| POST | `/exam/sessions/:sessionId/submit` | `SubmitExamDto` | scores + persists attempt (backend authoritative) |
| POST | `/exam/sessions/:sessionId/late-submit` | `SubmitExamDto` | within **120 s** grace; sets `lateFlag`; 403 after window |

Admin (assignment) — `@UseGuards(RolesGuard)`:
| Method | Path | Roles | Body | Notes |
| --- | --- | --- | --- | --- |
| POST | `/admin/exam/assign` | `learning_admin` | `AssignExamDto` | issues one-time code (**shown once**); omit `examId` ⇒ auto-assign next unattempted exam |
| GET | `/admin/exam?certId=` | `learning_admin` | — | list a cert's **published** exams (ordered) |

Admin authoring — `@Controller('admin')`, `@UseGuards(RolesGuard)`:
| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| POST | `/admin/certs/:certId/exams` | `content_creator, learning_admin` | create **DRAFT** exam (optional inline questions) |
| GET | `/admin/certs/:certId/exams` | `content_creator, learning_admin` | list all statuses + `questionCount` |
| GET | `/admin/exams/:examId` | `content_creator, learning_admin` | full authoring view (**includes** `isCorrect`) |
| PATCH | `/admin/exams/:examId` | `content_creator, learning_admin` | update meta; 409 `EXAM_LOCKED` if published |
| PATCH | `/admin/exams/:examId/translations` | `content_creator, learning_admin` | per-locale title merge |
| POST | `/admin/exams/:examId/questions` | `content_creator, learning_admin` | add question (DRAFT only) |
| PATCH | `/admin/exams/:examId/questions/:questionId` | `content_creator, learning_admin` | update; options replace whole set |
| DELETE | `/admin/exams/:examId/questions/:questionId` | `content_creator, learning_admin` | DRAFT only |
| GET | `/admin/exams/:examId/preview` | `content_creator, learning_admin` | student-shape preview (isCorrect stripped) |
| POST | `/admin/exams/:examId/publish` | `learning_admin` | publish gate; 409 `EXAM_NOT_PUBLISHABLE` + `reasons[]` |
| POST | `/admin/exams/:examId/unpublish` | `learning_admin` | 409 if unused codes / active session |
| DELETE | `/admin/exams/:examId` | `learning_admin` | hard-delete DRAFT with zero attempts/codes |

### 6.6 Mock exam — student `@Controller('mock')`, admin `@Controller('admin/mock')`

Student (all **Student**):
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/mock/start` | `StartMockDto` | samples ≤50 from the cert's mock bank; **403** not enrolled, **409** active attempt exists |
| GET | `/mock/history` | `MockHistoryQueryDto` | RLS-scoped, cursor-paginated |
| GET | `/mock/attempts/:id` | — | full review (submitted only; reveals answers) |
| GET | `/mock/:id` | — | live session status (remaining, merged answers, `timeUp`) |
| POST | `/mock/:id/autosave` | `AutosaveMockDto` | per-question merge; no TTL reset |
| POST | `/mock/:id/extend` | — | +N min soft timer, capped; 422 when exhausted |
| POST | `/mock/:id/submit` | `SubmitMockDto` | grade on answers so far (empty body = "Exit"); never issues a cert |
| POST | `/mock/:id/questions/:questionId/reveal` | — | mock-only "Hint": `{ selectedCorrect, correctOptionId }` |

> ⚠️ **Route order:** literal `/mock/history` and `/mock/attempts/:id` precede
> `/mock/:id`. Frontend service methods should mirror these exactly.

Admin — `@UseGuards(RolesGuard)`:
| Method | Path | Roles | Body |
| --- | --- | --- | --- |
| GET | `/admin/mock/certs/:certId/questions` | `content_creator, learning_admin` | — |
| POST | `/admin/mock/questions` | `content_creator, learning_admin` | `CreateMockQuestionDto` |
| PATCH | `/admin/mock/questions/:id` | `content_creator, learning_admin` | `UpdateMockQuestionDto` |
| DELETE | `/admin/mock/questions/:id` | `learning_admin` | soft delete |

### 6.7 Payments — `@Controller('payments')` (Student) + webhook (Public)

| Method | Path                     | Auth                        | Body                      | Notes                                                                                                                                              |
| ------ | ------------------------ | --------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/payments/checkout`     | Student                     | `CreateCheckoutDto`       | server recomputes price + promo; returns Stripe URL, or **enrolls immediately if $0** (full waiver). 404 cert, 409 already enrolled, 400 bad promo |
| POST   | `/payments/retake`       | Student                     | `CreateRetakeCheckoutDto` | flat retake fee; $0 unlocks immediately                                                                                                            |
| GET    | `/payments/transactions` | Student                     | `TransactionsQueryDto`    | cursor-paginated own transactions                                                                                                                  |
| POST   | `/payments/webhook`      | **Public**, `@SkipThrottle` | raw body                  | Stripe HMAC-verified (`stripe-signature` header); returns `{ received: true }`                                                                     |

### 6.8 Certificates — public `@Controller('verify')`, admin `@Controller('admin/certs')`

| Method | Path                             | Auth                          | Notes                                                                                                                                                                              |
| ------ | -------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/verify/:certId`                | Public                        | content-negotiated: **HTML** for browsers/QR, **JSON** for API clients. 404 unknown; 200 `status:"revoked"` if revoked. `certId` is the public string ID (`IOS-…`), **not** a UUID |
| PATCH  | `/admin/certs/issued/:id/revoke` | `super_admin, learning_admin` | idempotent; writes audit row; 404 unknown                                                                                                                                          |

### 6.9 Users (admin) — `@Controller('admin/users')`, `@UseGuards(RolesGuard)`

| Method | Path                                               | Roles                           | Query                        | Response                                                        |
| ------ | -------------------------------------------------- | ------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| GET    | `/admin/users`                                     | `learning_admin, support_admin` | `ListUsersQueryDto`          | `UsersListResponseDto` (no PII/hashes)                          |
| GET    | `/admin/users/:userId`                             | `learning_admin, support_admin` | —                            | `StudentDetailResponseDto` + activity counts                    |
| GET    | `/admin/users/:userId/attempts`                    | `learning_admin, support_admin` | `StudentAttemptsQueryDto`    | `AttemptsListResponseDto` (no answer snapshot)                  |
| GET    | `/admin/users/:userId/access-codes`                | `learning_admin, support_admin` | `StudentAccessCodesQueryDto` | `AccessCodesListResponseDto` (derives `status`; no `tokenHash`) |
| POST   | `/admin/users/:userId/access-codes/:codeId/revoke` | `learning_admin`                | —                            | 404 unknown, 409 if already used                                |

### 6.10 Audit logs (admin) — `@Controller('admin/audit-logs')`

| Method | Path                | Roles         | Query                                                                                                                      |
| ------ | ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/audit-logs` | `super_admin` | `AuditLogQueryDto` (filter `tableName`, `actorId`, `recordId`, `action`; cursor) — sensitive keys redacted in old/new data |

### 6.11 Health — `@Controller('health')`

| Method | Path (note prefix)           | Auth          | Notes                                              |
| ------ | ---------------------------- | ------------- | -------------------------------------------------- |
| GET    | `/health` (**no `/api/v1`**) | Public        | liveness: `{ status, version, uptime, timestamp }` |
| GET    | `/api/v1/health/full`        | `super_admin` | deep: DB + storage bucket status                   |

### 6.12 Web (root HTML, `WebModule`) — **not API**, `Public`, no `/api/v1`

`GET /verify-email?token=`, `GET /reset-password?token=`, `POST /reset-password`
(urlencoded form). These are the email-link landing pages served by the backend;
the SPA generally doesn't call them, but be aware they exist at the root.

---

## 6.9 Latest backend sync (2026-07-25) — student engines + auth, verified against source

> Superseded in scope by [§6.9b](#69b-latest-backend-sync-2026-07-25b--cms-module-blog-fix-analytics-window):
> this section is accurate for the student engines but was taken without the
> 2026-07-20 → 2026-07-22 backend merges (CMS, blog fix, analytics window).

Endpoints the frontend now consumes, re-verified against `IOS_Backend` source
while wiring Phase 4. Envelopes vary per endpoint (BE-I-01). All are bearer-auth
unless noted; RFC-7807 errors (branch on `code`). Related backend gaps:
**BE-I-22** (real-exam never returns the answer key), **BE-I-23** (`GET
/exam/sessions/:id` returns no questions), **BE-I-24** (`certId` not exposed at
exam/mock entry) — see the Backend Issues Report.

### Student real-exam engine — `@Controller('exam')`

| Method | Path                             | Body / notes                                                                                                                                                                                                                                       |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/exam/pre-exam-confirmation`    | `{ certId, fullName, idNumber? }`; flips `pre_exam_confirmed` (attestation NOT persisted); 404 if no purchase.                                                                                                                                     |
| POST   | `/exam/validate-access`          | `{ code, examId? }` → `{ valid, accessCodeId, expiresAt, exam:{ id, title, durationMinutes, passingScore } }`; **no certId**; 403 invalid/expired.                                                                                                 |
| POST   | `/exam/start`                    | `{ code, examId? }` → `{ sessionId, durationSeconds, expiresAt, questions:[{ id, questionText, questionType, position, options:[{ id, optionText }] }] }` (`isCorrect` stripped); 409 active session / code used / pre-exam-confirmation required. |
| GET    | `/exam/sessions/:id`             | → `{ sessionId, remainingSeconds, answers:Record<qid,optId>, status }` — **no questions** (BE-I-23).                                                                                                                                               |
| POST   | `/exam/sessions/:id/autosave`    | `{ answers:Record<qid,optId> }` → `{ saved:true }`; 409 expired. Bulk map (no clientSeq on the wire).                                                                                                                                              |
| POST   | `/exam/sessions/:id/submit`      | `{ answers }` → `{ score, passed, correctCount, totalCount }`; 409 already submitted.                                                                                                                                                              |
| POST   | `/exam/sessions/:id/late-submit` | `{ answers }` → `ScoreResult`; 403 grace (120 s) closed.                                                                                                                                                                                           |
| GET    | `/exam/attempts`                 | cursor page `{ data:[{ id, examTitle, program, score, passed, submittedAt, durationSeconds, status, lateFlag }], meta }` — never the answer snapshot.                                                                                              |

WS: **Socket.IO** namespace `/exam`, handshake `auth:{ token }`, C→S `join_session
{ sessionId }`, S→C `timer_tick { remainingSeconds }` (30 s) / `warning`
(600 s, 300 s) / `session_expired`. Terminal grace + backend auto-submit from
snapshot.

### Student mock engine — `@Controller('mock')` (soft, non-terminal timer)

| Method | Path                              | Body / notes                                                                                                                                                      |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/mock/start`                     | `{ certId }` → `{ attemptId, certId, durationSeconds, expiresAt, extensionsRemaining, questionCount, questions[] }`; 403 not enrolled, 409 active attempt.        |
| GET    | `/mock/history`                   | cursor page `{ data:[{ attemptId, certId, status, score, correctCount, totalCount, falseCount, readyForFinal, extensionsUsed, startedAt, submittedAt }], meta }`. |
| GET    | `/mock/attempts/:id`              | `{ data:{ …, questions:[{ questionId, questionText, options[], selectedOptionId, correctOptionId, isCorrect }] } }` — **reveals** the key; 422 if not submitted.  |
| GET    | `/mock/:id`                       | `{ attemptId, certId, status, remainingSeconds, timeUp, extensionsUsed, extensionsRemaining, answers, questions[] }`.                                             |
| POST   | `/mock/:id/autosave`              | `{ answers }` → `{ saved, answeredCount, timeUp }`; never rejects.                                                                                                |
| POST   | `/mock/:id/extend`                | → `{ attemptId, extensionsUsed, extensionsRemaining, remainingSeconds }`; 422 when capped.                                                                        |
| POST   | `/mock/:id/submit`                | `{ answers? }` → `{ …, score, correctCount, totalCount, falseCount, readyForFinal, readiness:{…}, durationSeconds }`; 409 already submitted.                      |
| POST   | `/mock/:id/questions/:qid/reveal` | → `{ selectedCorrect, correctOptionId }` (mock-only hint).                                                                                                        |

WS: Socket.IO namespace `/mock` (same shape as `/exam` but the timer is soft/non-terminal).

### Learning / courses — `@Controller('learning')` (all `{ data, meta }`, enrolment-gated → 403)

`GET /learning/certs/:certId/curriculum` (modules→lessons + per-lesson `completed`);
`GET /learning/lessons/:id` (`contentHtml`, signed `videoUrl` +
`meta.videoUrlExpiresInSeconds`); `GET /learning/lessons/:id/quiz` (correct answer
stripped; `options` null ⇒ free-text); `POST /learning/lessons/:id/quiz/check`
(`{ answers }` → per-question `{ correct, correctAnswer }` + score; nothing
persisted); `POST /learning/lessons/:id/complete` (idempotent); `GET
/learning/progress` (`[{ certId, programCode, title, totalLessons,
completedLessons, percentComplete }]`).

### Auth — email verify + admin OTP

- `POST /auth/verify-email { token }` → `{ message }`; `POST
/auth/resend-verification { email }` (anti-enumeration).
- `POST /auth/admin/login { email, password }` → **union**: `LoginResponse`
  (OTP off) **or** `{ otpRequired:true, challengeId, expiresInSeconds }` (OTP on —
  no tokens/cookie). `POST /auth/admin/login/otp { challengeId, code(6-digit) }` →
  `LoginResponse` + cookie (401 bad/expired/exhausted). `POST /auth/admin/refresh`,
  `POST /auth/admin/logout`. **Open question for security review:** whether the
  admin refresh cookie is accepted at the shared `POST /auth/refresh` (the FE
  currently assumes yes) or requires `/auth/admin/refresh`.

## 6.9b Latest backend sync (2026-07-25b) — CMS module, blog fix, analytics window

**Correction to §6.9.** The 2026-07-25 sync covered the _student engine_ surfaces
but was taken against a stale view of `IOS_Backend`: it missed everything merged
between **2026-07-20 and 2026-07-22**. Backend HEAD is now **`72a711c`
(2026-07-22)** on `main`; `3e52625` merged PR #21 (`feat/cms`). Re-verified
against source on 2026-07-25.

| BE commit                                        | Change                                                                                                                                                                                                                                                                                                                                   | Frontend impact                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `30bfff5` (2026-07-21)                           | `fix(blog)`: admin writes build the response from the entity in hand instead of re-reading on the default pool — **resolves BE-I-21** (`blog.service.ts:196-198`, and `:325-329`, `:408-411` for update/publish).                                                                                                                        | **Unblocks blog authoring E2E.** FE `admin/blog` (`5404e77`) needs no change; re-test create/publish against api-dev.                                                                                                                                                                                                                                                             |
| `d7a78e6` (2026-07-20)                           | `fix(blog)`: list queries order by entity property path (TypeORM distinct-pagination crash).                                                                                                                                                                                                                                             | None — `GET /admin/blog` / `GET /blog` list pagination is now safe.                                                                                                                                                                                                                                                                                                               |
| `4ec6423`/`e0f74d8` (→ `3e52625`, 2026-07-21/22) | `feat(cms)`: **new typed-section CMS** — `cms_pages` → ordered `cms_sections` + `cms_globals`, 16 section types, public read + SEO, admin CRUD/publish/translations/reorder, seed of 8 pages.                                                                                                                                            | **New, entirely unconsumed FE surface** (no `*.api.ts` references `/cms`). Two workstreams: a public CMS-driven marketing renderer and an admin CMS editor. See the inventory below + **BE-I-26/27/28**.                                                                                                                                                                          |
| `72a711c` (2026-07-22)                           | `feat(analytics)`: `GET /admin/dashboard/overview` accepts `from`/`to` (ISO) which override `months`; `feat(users)`: student detail now also returns `certificates[]`, `attempts[]`, `exams.{assigned,purchases}`; `feat(learning)`: **`contentText` is now required and non-empty on `CreateLessonDto`** (and non-blankable on update). | **(a)** B6 dashboard can offer a real date-range picker (`dashboard.api.ts:27` sends only `months`). **(b)** Admin student detail can show real lists (FE maps only `counts` — `users.model.ts:20-31`); additive, nothing breaks. **(c)** ⚠️ **breaking** — FE omits `contentText` when the field is blank (`curriculum.mappers.ts:83-94`), which now 400s. Filed as **BE-I-29**. |

## 6.9c Latest backend sync (2026-07-27) — ⚠️ `GET /landing` removed, exam review, contact, SEO

Backend HEAD is now **`7160f11`** (merge of PR #23). Four more merges landed after
§6.9b was written; **one of them breaks a shipped frontend screen.**

| BE commit                        | Change                                                                                                                                                                                                                | Frontend impact                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `66a7632` (2026-07-26) ⚠️        | `refactor(analytics)`: **`LandingController` deleted**; `GET /landing` replaced by **`GET /analytics/public-stats`** → `{ stats:{ programs, students, certificatesIssued } }` (`public-stats.controller.ts:20-31`). Featured programs are expected from `GET /catalog`, static home content from `GET /cms/pages/home`. | ⛔ **The landing page 404s today** — `features/landing/data-access/landing.api.ts:21-25` still calls `GET /landing`. Filed as **BE-I-30**; fixed in CMS plan Slice 1.                |
| `66a7632`                        | `feat(exam)`: **`GET /exam/attempts/:attemptId/review`** (`exam.controller.ts:224-249`) — owner-only, terminal attempts only (422 otherwise), returns options with `isCorrect`, `selectedOptionId`, `correctOptionId`, per-question `isCorrect`, `explanation`. | ✅ **Resolves BE-I-22.** The real-exam result page's review section can be re-enabled (it was commented out, not deleted, in `b951242`).                                            |
| `66a7632`                        | `feat(catalog)`: **`POST /admin/catalog/:id/image-upload-url`** `{ imageType, contentType }` → `{ uploadUrl, requiredHeaders, key, publicUrl }` (public-read ACL).                                                    | Partially resolves **BE-I-27** — catalog certificate images can now be uploaded; CMS sections and blog bodies still have no upload path.                                            |
| `43bd2d8` → `a0a153a` (2026-07-27) | `feat: improve cms seo` — new **SEO module**: `GET /sitemap.xml` + `GET /robots.txt` (served under `/api/v1`; the edge/CDN is expected to rewrite them to the site root), plus **`seo.jsonLd`** (schema.org) now embedded in CMS page (`cms.service.ts:125-143`), blog detail (`blog.service.ts:550`) and catalog detail (`catalog.service.ts:461`) responses. | FE should render `seo.jsonLd` into a `<script type="application/ld+json">`. Non-prod `robots.txt` is a blanket `Disallow: /`. Sitemap/robots need an edge rewrite, not FE routes.  |
| `2976be0` → `7160f11` (2026-07-27) | `CMS-C — contact-form submission handling`: public **`POST /contact`** (throttled, default 3 req / 60 s via `CONTACT_THROTTLE_LIMIT`/`_TTL`; honeypot field `company` silently drops the submission; **always 201**; 400 validation, 429 over-rate) and admin **`/admin/contact`** list/detail/`PATCH :id` status/`DELETE :id`. | ✅ **Resolves BE-I-26** — the CMS `contact_form` section is now buildable end-to-end, plus a new optional admin inbox page.                                                          |

**Contact contract** (`contact.controller.ts:36-66`, `contact-admin.controller.ts:48-111`):

| Method | Path                 | Auth / roles                                   | Notes                                                                                                                             |
| ------ | -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/contact`           | `@Public()`, throttled                         | `{ name(≤120), email(≤255), subject?(≤160), message(≤5000), pageSlug?(≤255), company?(honeypot — leave empty) }` → 201 `{ data }`. |
| GET    | `/admin/contact`     | support_admin, learning_admin                  | `?status=&cursor=&limit=` — cursor page `(created_at DESC, id DESC)`, same shape as blog/cms admin lists.                          |
| GET    | `/admin/contact/:id` | support_admin, learning_admin                  | `{ data }` detail (includes the message body + IP/user-agent capture).                                                             |
| PATCH  | `/admin/contact/:id` | support_admin, learning_admin                  | `{ status }` — `new` \| `read` \| `archived` \| `spam`.                                                                           |
| DELETE | `/admin/contact/:id` | learning_admin                                 | **Hard delete** (GDPR erasure — no soft-delete here) → `{ id, deleted:true }`.                                                     |

### CMS endpoints (`3e52625`) — public `@Controller('cms')` + admin `@Controller('admin/cms')`

Public (`@Public()`, GET only; `cms.controller.ts:15-39`). Both return
`{ data, meta:{ locale } }` — block-level locale resolution with `en` fallback and
a `fallbackUsed` flag, same idiom as catalog/blog translations.

| Method | Path                | Notes                                                                                                                                                                                                                                                                                                                                   |
| ------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/cms/pages/:slug`  | PUBLISHED only (else 404). `data:{ slug, title, locale, direction, sections:[{ type, config, content, locale, direction, fallbackUsed, data\|null }], seo:{ metaTitle, metaDescription, canonicalUrl, ogType, ogImageUrl } }`. Seeded slugs: `home`, `about`, `about-agile`, `about-scrum`, `why-scrum`, `contact`, `privacy`, `terms`. |
| GET    | `/cms/globals/:key` | `nav` \| `footer` \| `announcement`; `data:{ key, config, content, locale, direction, fallbackUsed }`; 404 when missing/invisible (`cms.service.ts:137-163`).                                                                                                                                                                           |

Admin `admin/cms` (`cms-admin.controller.ts:70-295`; RolesGuard, RLS-audited writes):

| Method    | Path                                        | Roles                                   | Notes                                                          |
| --------- | ------------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| POST      | `/admin/cms/pages`                          | content_creator, learning_admin         | Creates a DRAFT.                                               |
| GET       | `/admin/cms/pages`                          | any admin role                          | `?status=&search=&cursor=&limit=` (cursor page).               |
| GET       | `/admin/cms/pages/:id`                      | any admin role                          | Page + ordered sections.                                       |
| PATCH     | `/admin/cms/pages/:id`                      | content_creator, learning_admin         | Slug immutable once PUBLISHED (409 `SLUG_LOCKED`).             |
| PATCH     | `/admin/cms/pages/:id/translations`         | content_creator, learning_admin         | Replace-merge per locale.                                      |
| POST      | `/admin/cms/pages/:id/{publish,unpublish}`  | learning_admin                          | Publish gate → 409 `CMS_PAGE_NOT_PUBLISHABLE` with `errors[]`. |
| DELETE    | `/admin/cms/pages/:id`                      | learning_admin                          | Archive; `isSystem` page → 409 `SYSTEM_PAGE_PROTECTED`.        |
| POST      | `/admin/cms/pages/:id/sections`             | content_creator, learning_admin         | Validates `config`+`content` against the section type schema.  |
| PATCH     | `/admin/cms/sections/:sid`(`/translations`) | content_creator, learning_admin         | Per-section edit / localized content.                          |
| DELETE    | `/admin/cms/sections/:sid`                  | content_creator, learning_admin         |                                                                |
| PUT       | `/admin/cms/pages/:id/sections/order`       | learning_admin                          | `{ order: uuid[] }`; 400 `SECTION_NOT_IN_PAGE`.                |
| GET/PATCH | `/admin/cms/globals/:key`(`/translations`)  | read: any admin · write: learning_admin | Upsert (creates when missing).                                 |

**16 section types** (`cms.entity.ts:26-43`): `hero`, `indicator_band`,
`feature_cards`, `logo_cloud`, `rich_band`, `level_matrix`, `steps_timeline`,
`cta_band`, `faq`, `content_columns`, `certifications`\*, `journal`\*,
`testimonials`, `stats`, `media_embed`, `contact_form`. \* dynamic — hydrated at
read time from catalog / blog (`data.certifications[]` / `data.articles[]`).

> **Overlap resolved (2026-07-26):** `GET /landing` was **deleted** in `66a7632`
> (see §6.9c / **BE-I-30**). The CMS `home` page is now the single source for
> static home content, `GET /catalog` supplies featured programs and
> `GET /analytics/public-stats` the live counters.

---

## 7. DTOs

### 7.1 Auth / profile

- **`RegisterDto`** — `email`(IsEmail,≤255), `password`(8–128, regex: upper+lower+
  digit+special), `firstName`(1–100), `lastName`(1–100); optional: `phone`(≤50),
  `locale`(≤10), `country/city`(≤100), `street/address`(≤255), `postalCode`(≤20),
  `occupation/position/company`(≤255).
- **`LoginDto`** — `email`(IsEmail,≤255), `password`(1–128).
- **`VerifyEmailDto`** / **`ResetPasswordDto`** — `token`(32–128); reset also has
  `newPassword`(same complexity regex).
- **`ForgotPasswordDto`** — `email`.
- **`UpdateProfileDto`** — all optional & **nullable** (null clears): `phone`,
  `locale`(∈ supported set), `country/city/street/address/postalCode`,
  `occupation/position/company`, `avatarUrl`(≤500). `firstName/lastName/email`
  are intentionally **absent** (locked — appear on certs).
- **`UpdatePasswordDto`** — `currentPassword`(1–128), `newPassword`(complexity).
- **Responses:** `LoginResponseDto { accessToken, expiresIn, user: AuthUserResponseDto }`;
  `AuthUserResponseDto { id, email, firstName, lastName, fullName, locale,
emailVerified, type, role|null }`; `RegisterResponseDto { message, userId }`;
  `MessageResponseDto { message }`; `ProfileResponseDto` (full profile + `direction`,
  `createdAt/updatedAt` ISO).

### 7.2 Catalog

- **`CatalogQueryDto`** — `search`(≤200, trigram on EN title), `program_code`(≤50),
  `active`(bool; **strict** `'true'`/`'false'` parse), `cursor`(≤500),
  `limit`(1–100, default 20), `sort`(`-created_at`|`created_at`).
- **`CreateCertificateDto`** — `title`(1–255), `programCode`(1–50), `price`(number,
  ≥0, ≤2dp), optional `currency`(3), `description`(≤5000), `thumbnailUrl`(≤500),
  `active`, `translations` (per-locale `{title?, description?}`).
- **`UpdateCertificateDto`** — all of the above optional. **`UpdateTranslationsDto`** —
  `{ translations }` shallow per-locale merge.
- **Responses:** `CatalogItemDto` (`id, programCode, title, description, price,
currency, thumbnailUrl, active, locale, direction, fallbackUsed, createdAt,
updatedAt`); `CatalogDetailDto` extends it (+ raw `translations` on admin);
  list `{ data: CatalogItemDto[], meta: { locale, pagination } }`.

### 7.3 Learning

- **`CreateModuleDto`** — `certId`(uuid), `title`(1–255), optional `description`
  (≤5000), `position`(≥0), `active`, `translations`. **`UpdateModuleDto`** partial.
- **`CreateLessonDto`** — `moduleId`(uuid), `title`(1–255), optional `contentText`
  (≤50000), `videoUrl`(≤500), `position`, `durationSeconds`, `active`,
  `translations` (`{title?, content_html?}`). **`UpdateLessonDto`** partial.
- **`CheckQuizDto`** — `answers: Record<questionId, answerString>` (`@IsAnswerMap`).

### 7.4 Exam

- **Student:** `PreExamConfirmationDto { certId(uuid), fullName, idNumber? }`;
  `ValidateAccessDto { code, examId? }`; `StartExamDto { code, examId? }`;
  `AutosaveDto`/`SubmitExamDto { answers: Record<questionId, optionId> }`.
- **Admin assign:** `AssignExamDto { userId(uuid), certId(uuid), examId?(uuid) }`.
- **Authoring:** `CreateExamDto { title, examOrder(1–6), passingScore?(1–100,def 80),
durationMinutes(≥1), translations?, questions?[] }`; `UpdateExamDto` (partial meta);
  `CreateQuestionDto { questionText, questionType(mcq|true_false), position?, marks?(≥1),
options: CreateOptionDto[≥2] }`; `CreateOptionDto { optionText, isCorrect? }`;
  `UpdateQuestionDto` (options replace whole set); `UpdateExamTranslationsDto`.

### 7.5 Mock exam

- `StartMockDto { certId(uuid) }`; `AutosaveMockDto`/`SubmitMockDto { answers?
(@IsAnswerMap) }` (submit answers optional = Exit); `MockHistoryQueryDto {
limit?(1–50,def 20), cursor? }`; `CreateMockQuestionDto { certId, questionText,
questionType?, position?, options: MockQuestionOptionDto[≥2, exactly one correct] }`;
  `UpdateMockQuestionDto` (partial; `active` toggle; options replace).

### 7.6 Payments

- `CreateCheckoutDto { certId(uuid), promoCode?(≤100) }`;
  `CreateRetakeCheckoutDto { certId(uuid) }`;
  `TransactionsQueryDto { limit?(1–50,def 20), cursor? }`.

### 7.7 Users / audit (admin)

- `ListUsersQueryDto { search?(≤200), cursor?, limit?(1–100,def 50) }`;
  `StudentAttemptsQueryDto { certId?, cursor?, limit? }`;
  `StudentAccessCodesQueryDto { examId?, cursor?, limit? }`;
  `AuditLogQueryDto { tableName?, actorId?, recordId?, action?(INSERT|UPDATE|DELETE),
cursor?, limit? }`.
- Responses: `UsersListResponseDto`/`UserItemDto`; `StudentDetailResponseDto`
  (`StudentDetailDto` + `counts { purchases, attempts, certificatesEarned }`);
  `AttemptsListResponseDto`; `AccessCodesListResponseDto` + `RevokeCodeResponseDto`.

---

## 8. Models (entities & enums)

> UUID PK + `createdAt`/`updatedAt` (`UuidEntity`) unless marked **serial**
> (`IntEntity`, internal-only). Content tables are gated by `RolesGuard`; the
> student-owned tables marked **RLS** enforce row-level security keyed on
> `app.current_user_id`.

### 8.1 Identity

- **`User`** (`users`) — email(unique), passwordHash, firstName, lastName, phone,
  avatarUrl, country/city/street/address/postalCode, occupation/position/company,
  locale(def `en`), emailVerified(+At), active. Getter `fullName`.
- **`AdminUser`** (`admin_users`) — email(unique), passwordHash, firstName,
  lastName, **`role: AdminRole`**, locale, active, createdById(self-FK). `fullName`.
- **`AuthToken`** (`auth_tokens`, **serial**) — userId, `purpose:
AuthTokenPurpose(email_verification|password_reset)`, tokenHash, expiresAt, usedAt.
- **`RefreshToken`** (`refresh_tokens`, **serial**) — userId?/adminId?,
  `ownerType: TokenOwnerType(user|admin)`, tokenHash, expiresAt, revokedAt.
- **`RateLimitBlock`** (`rate_limit_blocks`, **serial**) — ipAddress(inet),
  endpoint, blockedUntil.

### 8.2 Catalog / learning

- **`Certificate`** (`certificates`) — title, programCode(indexed), description,
  translations, price, currency(def USD), active, thumbnailUrl, **badgeImageUrl,
  track, `level: CertLevel(foundation|practitioner|authority)`, durationHours,
  syllabusUrl**. _(NB: the bold fields exist on the entity but are **not writable**
  via the Create/Update DTOs — see Issues.)_
- **`LearningModule`** (`learning_modules`) — certId, title, description,
  translations, position, active.
- **`Lesson`** (`lessons`) — moduleId, title, videoUrl, contentText, translations,
  position, durationSeconds, active.
- **`LessonQuiz`** (`lesson_quizzes`) — lessonId, title, active. **`QuizQuestion`**
  (`quiz_questions`) — quizId, questionText, correctAnswer, options(jsonb), position.

### 8.3 Exam engine

- **`Exam`** (`exams`) — certId, title, examOrder(**1–6**), `status:
ExamStatus(draft|published)`, passingScore(1–100, def 80), durationMinutes,
  createdById, translations.
- **`ExamQuestion`** (`exam_questions`) — examId, questionText, `questionType:
QuestionType(mcq|true_false)`, position, marks. **`ExamQuestionOption`**
  (`exam_question_options`) — questionId, optionText, `isCorrect` (never sent to
  students).
- **`ExamAccessCode`** (`exam_access_codes`) — userId, examId, certId, tokenHash,
  expiresAt, usedAt.
- **`ExamAttempt`** (`exam_attempts`, **RLS**) — userId, examId, certId, score(0–100),
  passed, answers(jsonb snapshot), durationSeconds, startedAt, submittedAt,
  `status: AttemptStatus(submitted|auto_submitted)`, lateFlag.
- **`TestSession`** (`test_sessions`) — live Redis-mirrored session: userId, examId,
  certId?, sessionToken, startedAt, durationSeconds, expiresAt, `status:
TestSessionStatus(active|submitted|expired|auto_submitted)`, submittedAt, snapshot(jsonb).

### 8.4 Mock exam (separate bank)

- **`MockQuestion`** (`mock_questions`) — certId, questionText, questionType,
  position, active. **`MockQuestionOption`** — questionId, optionText, isCorrect
  (revealed only via the reveal endpoint).
- **`MockExamAttempt`** (`mock_exam_attempts`, **RLS**) — userId, certId, `status:
MockAttemptStatus(in_progress|submitted)`, score?, correctCount?, totalCount?,
  `readyForFinal?` (advisory: score≥80, never a gate), extensionsUsed,
  questionIds(jsonb), answers(jsonb), startedAt, expiresAt, submittedAt, durationSeconds.
- **`MockExamAnswer`** (`mock_exam_answers`, **RLS**) — attemptId, userId, questionId,
  selectedOptionId?, isCorrect.

### 8.5 Commerce & certification

- **`StudentPurchase`** (`student_purchases`, **RLS**) — unique(userId,certId);
  paymentIntentId, `paymentType: PaymentType(enrollment|retake)`, preExamConfirmed,
  examCompleted.
- **`Transaction`** (`transactions`, **RLS**) — userId, certId, stripeSessionId(unique),
  amount, currency, `status: TransactionStatus(pending|completed|failed|refunded)`,
  promoCodeId?.
- **`PromoCode`** (`promo_codes`) — code(unique), `discountType:
DiscountType(percentage|full_waiver)`, discountValue, applicableCertIds?, maxUses?,
  usageCount, expiresAt?, createdById.
- **`StudentProgress`** (`student_progress`, **RLS**) — unique(userId,lessonId), completedAt.
- **`IssuedCertificate`** (`issued_certificates`) — public `certId`(unique string
  `IOS-<PROGRAM>-<YEAR>-<seq>`), userId, certificateId, examAttemptId(unique →
  exactly-once issuance), s3Url, qrUrl, isActive, issuedAt.

### 8.6 Infra / misc

- **`AdminAuditLog`** (`admin_audit_logs`, **serial, RLS**) — actorId, action,
  tableName, recordId, oldData/newData(jsonb, sensitive keys redacted), ipAddress.
- **`ProcessedWebhook`** (`processed_webhooks`, **serial**) — eventId(unique) — Stripe idempotency.
- **`NotificationTemplate`** / **`NotificationQueue`** (**serial**) — `status:
NotificationStatus(pending|sent|failed)`.
- **`BlogArticle`** (`blog_articles`) — title, slug(unique), contentHtml, `status:
BlogStatus(draft|published|archived)`, authorId, translations. _(BE-I-11 shipped
  `334d0c6` — now has public + admin controllers; see "Blog endpoints (BE-I-11)".)_

---

## 9. WebSocket contracts (Socket.IO)

Both gateways: JWT in the handshake — `{ auth: { token: '<accessJWT>' } }` (or
`Authorization: Bearer` header); invalid ⇒ immediate disconnect. Transports:
`['websocket','polling']`. CORS = same allowlist as HTTP.

### 9.1 Exam gateway — namespace **`/exam`** (`ExamGateway`)

- **C→S:** `join_session { sessionId }` → ack `{ joined, remainingSeconds }`
  (ownership-checked against the caller's Redis session).
- **S→C:** `timer_tick { sessionId, remainingSeconds }` every **30 s**;
  `warning { sessionId, remainingSeconds, threshold }` at **600 s** and **300 s**;
  `session_expired { sessionId }` when the Redis TTL hits zero (terminal).

### 9.2 Mock gateway — namespace **`/mock`** (`MockExamGateway`)

- **C→S:** `join_session { attemptId }` → ack `{ joined, remainingSeconds }`.
- **S→C:** `timer_tick { attemptId, remainingSeconds }`; `warning { attemptId,
remainingSeconds, threshold }` at 600/300 s; **`time_up { attemptId }`** — a
  **one-shot, NON-terminal** signal. The mock timer is soft: nothing is
  auto-submitted; the student can `POST /mock/:id/extend` and re-`join_session`.

> Frontend exam engine (`docs/08-exam-engine.md`, CLAUDE.md §10): keep the 30 s
> heartbeat, read the timer from `timer_tick`/server state (never a local clock),
> and treat `/exam` as terminal but `/mock` as soft.

---

## 10. Notifications (transactional email)

Enqueued server-side (durable `notification_queue`, drained by a scheduled
worker). Types (`NotificationType`): `email-verification`, `password-reset`,
`exam-access-code`, `purchase-confirmation`, `enrollment-confirmation`,
`certificate-issued`. Not directly frontend-facing, but they explain the
side-effects of register / forgot-password / exam assignment / purchase / cert
issuance flows (e.g. the verification and reset **links** point at the
`WebModule` root pages, not the SPA).

---

## Backend Issues Report

> Per the mission rules, these are **documented, not fixed**. Shared with the
> backend team; nothing in `IOS_Backend/` was modified.
>
> **UPDATE 2026-07-13 — most issues RESOLVED by the backend team.** See the
> resolution status below and the new endpoints in
> [Endpoints added 2026-07-13](#endpoints-added-2026-07-13-blocker-fixes). The
> table that follows is the **original finding text** (kept for history); read it
> together with the status block. Frontend follow-ups:
> [`frontend-unblock-checklist.md`](./frontend-unblock-checklist.md).
>
> **UPDATE 2026-07-27 (backend HEAD `7160f11`).** Resolved since the last sync:
> **BE-I-21** (`30bfff5`), **BE-I-22** (`66a7632` — exam attempt review) and
> **BE-I-26** (`2976be0` — contact submissions); **BE-I-27** is narrowed to CMS
> sections + blog bodies (catalog images got an upload URL in `66a7632`).
> Still open: **BE-I-23/24** (real-exam resume + entry `certId`), **BE-I-25**
> (no DOB → `complete-account` blocked), **BE-I-28** (no CMS draft preview),
> **BE-I-29** (lesson `contentText` breaking change) and the newly filed
> **BE-I-30** (⛔ `GET /landing` deleted — the shipped landing page 404s).
> The ones that still stop or degrade frontend work are tracked in
> [`backend-blockers-report.md`](./backend-blockers-report.md); the CMS build plan
> is [`cms-frontend-plan.md`](./cms-frontend-plan.md).

### Resolution status (2026-07-13)

| ID      | Status                   | Fixed by (BE commit) | Frontend action                                                                                                                                                                                                                 |
| ------- | ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BE-I-01 | Open (behavioural)       | —                    | Map per endpoint; key off `code`.                                                                                                                                                                                               |
| BE-I-02 | Open (behavioural)       | —                    | Already handled (`SameSite=Lax`).                                                                                                                                                                                               |
| BE-I-03 | ✅ Resolved              | `10965cb`            | Build admin staff page (checklist B3).                                                                                                                                                                                          |
| BE-I-04 | ✅ Resolved              | `e4b347c`            | Add card fields to catalog form (B8).                                                                                                                                                                                           |
| BE-I-05 | ✅ Resolved              | `1b603f1`            | Build promo-codes page (B4).                                                                                                                                                                                                    |
| BE-I-06 | ✅ Resolved              | `cb10205`            | Build lesson-quiz authoring (B5).                                                                                                                                                                                               |
| BE-I-07 | ✅ Resolved              | `1515dff`            | Wire admin dashboard metrics (B6).                                                                                                                                                                                              |
| BE-I-08 | ✅ Resolved              | `e4b347c`            | Wire avatar upload (A1).                                                                                                                                                                                                        |
| BE-I-09 | Open (info)              | —                    | Pick per screen.                                                                                                                                                                                                                |
| BE-I-10 | Open (info)              | —                    | Use bare origin for `/health`.                                                                                                                                                                                                  |
| BE-I-11 | ✅ Resolved              | `334d0c6`            | BlogModule shipped — build the public blog rewire + admin Blog page.                                                                                                                                                            |
| BE-I-12 | Open (behavioural)       | —                    | Branch on `code`, not status.                                                                                                                                                                                                   |
| BE-I-13 | ✅ Resolved              | `a36ddfd`            | Build admin Curriculum page (B1).                                                                                                                                                                                               |
| BE-I-14 | ✅ Resolved              | `a36ddfd`            | Surface publish `reasons[]` (B7).                                                                                                                                                                                               |
| BE-I-15 | ✅ Resolved              | `a36ddfd`            | Build cert-revocation page (B2).                                                                                                                                                                                                |
| BE-I-16 | ✅ Resolved              | `a36ddfd`            | Build Certificates list (A3).                                                                                                                                                                                                   |
| BE-I-17 | ✅ Resolved              | `a36ddfd`            | Add real-exam history (A7).                                                                                                                                                                                                     |
| BE-I-18 | ✅ Resolved              | `181cd9f`            | Build Notifications (A4).                                                                                                                                                                                                       |
| BE-I-19 | ✅ Resolved              | `65bf4e8`            | Wire delete-account + export (A2).                                                                                                                                                                                              |
| BE-I-20 | ✅ Resolved              | `1515dff`            | Build Insights + rewire Landing (A5, A6).                                                                                                                                                                                       |
| BE-I-21 | ✅ Resolved              | `30bfff5`            | **Blog create/update now return the in-hand entity** — authoring works E2E; FE `admin/blog` (`5404e77`) needs no change, only a re-test. See below.                                                                             |
| BE-I-22 | ✅ Resolved              | `66a7632`            | **`GET /exam/attempts/:attemptId/review`** now returns the answer key for terminal attempts — **FE follow-up:** re-enable the result page's review section (commented out in `b951242`). See below.                              |
| BE-I-23 | ⚠️ **Open (limitation)** | —                    | **`GET /exam/sessions/:id` returns no questions** — reload-resume can't redraw the exam from the server; FE persists a local question snapshot to work around it. See below.                                                    |
| BE-I-24 | ⚠️ **Open (limitation)** | —                    | **No `certId` exposed at exam-entry** — `validate-access` returns only `exam.{id,title,…}`, so the FE can't call `pre-exam-confirmation` (needs `certId`); it relies on `start`'s 409. See below.                               |
| BE-I-25 | ⚠️ **Open (gap)**        | —                    | **No date-of-birth storage** — the User entity + `PATCH /me` (`UpdateProfileDto`) accept no DOB, but the `complete-account` onboarding wizard's step 1 collects a birthday, so the wizard can't be faithfully wired. See below. |
| BE-I-26 | ✅ Resolved              | `2976be0`            | **`POST /contact`** (public, throttled, honeypot) + `/admin/contact` inbox shipped — **FE follow-up:** build the contact section + optional admin inbox. See §6.9c and below.                                                    |
| BE-I-27 | ⚠️ **Open (narrowed)**   | partly `66a7632`     | **Still no media upload for CMS sections or blog bodies.** Catalog certificate images gained `POST /admin/catalog/:id/image-upload-url` (`66a7632`); avatars already had one. See below.                                        |
| BE-I-28 | ⚠️ **Open (gap)**        | —                    | **No CMS draft preview** — public reads are PUBLISHED-only, so an editor cannot preview an unpublished page. See below.                                                                                                         |
| BE-I-29 | ⚠️ **Open (breaking)**   | —                    | **`contentText` became required on `POST /admin/lessons`** (`72a711c`) with no version/deprecation note; the FE omits it when blank and now gets a 400. FE fix required. See below.                                             |
| BE-I-30 | ⛔ **Open (breaking)**   | —                    | **`GET /landing` was deleted** (`66a7632`) in favour of `GET /analytics/public-stats` + `GET /catalog` + `GET /cms/pages/home`. The shipped landing page (A6, `469f429`) 404s at runtime. FE fix required. See below.           |
| BE-I-31 | ⚠️ **Open (contract)**   | —                    | **CMS conflict sentinels aren't error `code`s** — `SLUG_LOCKED`, `SYSTEM_PAGE_PROTECTED` and `SECTION_NOT_IN_PAGE` are plain message prefixes, so all three flatten to a generic `code`; the FE must string-match to tell them apart. Found while building CMS-ADMIN Slice 9. See below.                    |

**Also new (not original issues):** two-step admin **OTP login** (`e97de75`,
checklist C1) and **GDPR cookie consent** (`65bf4e8`, checklist C2); catalog
`?active=false` parse fix (`5133b4e`, B8); the **CMS module** (`3e52625`) — new
public + admin surface, no FE consumer yet (see §6.9b and BE-I-26/27/28).

**Last verified against backend source:** 2026-07-27, backend HEAD `7160f11`
(merge of PR #23). Verification method: read `IOS_Backend/src/modules/**`
controllers, services, DTOs and entities directly; `git log` for provenance.

#### BE-I-21 — ✅ RESOLVED (`30bfff5`, 2026-07-21) — Blog `POST /admin/blog` 404 "Article not found" (read-after-write across two connections)

> **Resolution (verified 2026-07-25 against `IOS_Backend/src/modules/blog/blog.service.ts`).**
> The backend took the first suggested fix below: `create()` now ends with
> `return this.toAdminDetail(saved)` on the entity returned by `repo.save(...)`
> (`blog.service.ts:181-198`), with an inline comment naming the RLS-transaction
> race. The stale-response variants are gone too — `update()` (`:325-329`),
> `publish()` (`:408-411`) and the translation/unpublish paths build their
> response from the mutated in-hand entity rather than re-reading on the default
> pool. `d7a78e6` additionally fixed a TypeORM distinct-pagination crash in the
> list queries. **Nothing blocks blog authoring anymore.**
> **Frontend:** `admin/blog` (`5404e77`) and the public blog (`1940501`) were
> already built against the correct contract — no FE code change; an E2E
> create → publish → public-read re-test against api-dev is the only follow-up
> (tracked in `implementation-progress.md`). Author name is `null` in the create
> response until the next read (the `author` relation isn't loaded) — the FE list
> refetches, so this is cosmetic.

**Original finding — Severity: High — blog article creation is impossible; every attempt 404s and persists nothing.**

Discovered 2026-07-20 while testing the new admin Blog page (BLOG-ADMIN). Creating
an article returns `404 { code: RESOURCE_NOT_FOUND?, detail: "Article not found" }`
and the row is never saved (the public/admin lists stay empty).

**Root cause** — a read-after-write that straddles two DB connections inside one
uncommitted transaction:

1. `RlsInterceptor` (`src/common/interceptors/rls.interceptor.ts`) opens a
   transaction on a dedicated **RLS query-runner** (`startTransaction`, ~L68),
   runs the route handler, and **commits only _after_ the handler returns** (~L90).
2. `BlogService.create()` (`src/modules/blog/blog.service.ts`) INSERTs through that
   runner (`requireRunner(rlsRunner).manager.getRepository(...)`), then ends with
   `return this.getAdminById(saved.id)`.
3. `getAdminById()` reads via `this.blogs` — the **default connection pool**, a
   _different_ connection. Under READ COMMITTED, that connection cannot see the
   runner's still-uncommitted INSERT, so `findOne` returns `null` →
   `throw new NotFoundException('Article not found')`.
4. That thrown error propagates to the interceptor's `catch`, which
   `rollbackTransaction()`s (~L94) — undoing the INSERT. Hence the 404 **and** the
   empty list.

`update()` / `updateTranslations()` / `publish()` / `unpublish()` share the same
final `return this.getAdminById(id)` read-back on the default pool. They don't 404
(the row already exists on the default pool from a prior committed request) but
their **response body is stale** — it reflects the pre-write state, since the
in-flight change is still uncommitted on the runner. Only `create` is fatal.

**Suggested backend fix (one of):**

- Build the response DTO from the entity already in hand instead of re-querying —
  `create` already has `saved` from `repo.save(...)`; return
  `this.toAdminDetail(saved)` (load the `author` relation via the runner if needed).
- Or route the read-back through the **same `rlsRunner`** (pass the runner into a
  runner-aware `getAdminById`) so it sees the pending write.

**Frontend status:** no workaround possible — the write genuinely rolls back, so
the article cannot be created until the backend is fixed. The FE request is
correct (verified payload, id handling, and the Quill editor output). BLOG-ADMIN
create/edit and, transitively, any end-to-end test of the public blog rewire
(BLOG-PUBLIC) are **blocked** on this.

#### BE-I-22 — ✅ RESOLVED (`66a7632`, 2026-07-26) — Real-exam answer key / per-question correctness

> **Resolution (verified against `IOS_Backend/src/modules/exam/exam.controller.ts:224-249`).**
> New endpoint **`GET /exam/attempts/:attemptId/review`**: owner-only (403
> otherwise), **terminal attempts only** (422 while in progress), 404 for unknown
> attempts, and it runs on the request RLS runner. Response
> (`dto/exam-attempt-review-response.dto.ts`): `{ attemptId, examId, examTitle,
> program, score, passed, correctCount, totalCount, questions:[{ questionId,
> questionText, questionType, position, options:[{ id, optionText, isCorrect }],
> selectedOptionId, correctOptionId, isCorrect, explanation }] }`. This is the only
> real-exam endpoint that exposes the key — `start`/`sessions/:id` still strip it,
> so the anti-cheat posture during the exam is unchanged.
> **Frontend follow-up (not done):** re-enable the review section on
> `exam-result.page.ts` — it was commented out rather than deleted in `b951242`
> for exactly this. Tracked in `implementation-progress.md`.

**Original finding —** the text below described the gap before the fix.

#### BE-I-22 (original) — Real-exam APIs never return the answer key or per-question correctness

**Severity: Medium — the real-exam result page cannot show a per-question answer
review; it can only show the aggregate score.** Not a bug — a deliberate anti-cheat
posture at exam time that has no post-submission counterpart. Discovered 2026-07-23
while wiring the real-exam engine (`features/assessments`).

**Affected endpoints (`src/modules/exam/exam.controller.ts` + `exam.service.ts`):**

| Endpoint                                     | What it returns today                                                                                               | The gap                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /exam/start`                           | `questions[]` with each option as `{ id, optionText }` — `isCorrect` is **stripped** (correct for exam time)        | No later endpoint ever re-exposes `isCorrect`.                                                                                                               |
| `POST /exam/sessions/:sessionId/submit`      | `{ score, passed, correctCount, totalCount }`                                                                       | Aggregate only — no per-question breakdown, no correct-option ids.                                                                                           |
| `POST /exam/sessions/:sessionId/late-submit` | same `ScoreResult`                                                                                                  | same.                                                                                                                                                        |
| `GET  /exam/sessions/:sessionId`             | `{ sessionId, remainingSeconds, answers, status }` where `answers` is the **student's own** `Record<qid, optionId>` | No correctness, no key.                                                                                                                                      |
| `GET  /exam/attempts`                        | `{ data: [{ id, examTitle, program, score, passed, submittedAt, durationSeconds, status, lateFlag }], meta }`       | Comment in `listMyAttempts` is explicit: the `answers` snapshot is **deliberately never selected**; and even it holds only the student's picks, not the key. |

**Current contract (post-submission):** after a real exam is submitted (manual,
late, or server auto-submit), the frontend can obtain **only** the aggregate
`{ score, passed, correctCount, totalCount }`. There is no endpoint that returns,
for a terminal attempt, the per-question correct answer or whether the student got
each question right.

**Expected contract (requested):** a post-submission, owner-only review endpoint —
e.g. `GET /exam/attempts/:attemptId/review` (or `GET /exam/sessions/:sessionId/review`)
— that, **only once the attempt is terminal** (submitted / auto-submitted) and only
for the owning student (FORCE-RLS on `app.current_user_id`, same as `/exam/attempts`),
returns per question:

```jsonc
{
  "questions": [
    {
      "questionId": "uuid",
      "questionText": "…",
      "questionType": "mcq | true_false",
      "options": [{ "id": "uuid", "optionText": "…", "isCorrect": true }],
      "selectedOptionId": "uuid | null",
      "correctOptionId": "uuid",
      "isCorrect": true,
      "explanation": "… (optional)",
    },
  ],
}
```

Precedent already exists on the mock side: `GET /mock/questions/:questionId/reveal`
exposes the correct option for practice exams. The real-exam engine needs the
equivalent, gated behind attempt-terminal + ownership so it can never leak the key
mid-exam.

**Frontend impact:** the real-exam result page's **"Review Correct Answers"**
section (present in the Figma design and already built for mock/demo data) **cannot
be implemented** for real exams. As a temporary measure the FE will **disable
(comment out, not delete)** that section on the real-exam result page and show only
`score / passed / correctCount / totalCount`, re-enabling it once this endpoint
ships. No frontend workaround is possible — the data does not exist in any current
response.

#### BE-I-23 — ⚠️ `GET /exam/sessions/:sessionId` returns no questions, so reload-resume can't rebuild the exam from the server

**Severity: Medium — a mid-exam tab reload cannot redraw the question list from
the backend; the frontend works around it by persisting a local question
snapshot.** Discovered 2026-07-23 while building the real-exam runner store (Slice 3).

**Current contract.** The only endpoint that returns exam questions is
`POST /exam/start` — and it consumes the one-time access code, so it cannot be
replayed (a second call returns **409** "active session already exists / code
already used"). The live-session read, `GET /exam/sessions/:sessionId`
(`getSessionStatus`), returns only:

```jsonc
{
  "sessionId": "…",
  "remainingSeconds": 1234,
  "answers": { "<qid>": "<optId>" },
  "status": "active",
}
```

There is no `questions` array anywhere in the session-read path. So after a full
page reload (or the tab being closed and reopened) the SPA has lost the in-memory
question list and **cannot fetch it again** — `start` 409s and `sessions/:id` omits
it. Offline reload is worse: the server is unreachable, so even `answers`/
`remainingSeconds` are unavailable.

**Expected contract.** Either include the questions on the session read, or add a
dedicated read:

- `GET /exam/sessions/:sessionId` also returns `questions` (same shape as
  `POST /start`: `{ id, questionText, questionType, position, options:[{ id, optionText }] }`,
  `isCorrect` stripped), **or**
- a new `GET /exam/sessions/:sessionId/questions` returning that array.

Ownership + active-status gating identical to the existing session read.

**Frontend impact / current workaround.** To satisfy the standing ~60-second
offline-reload acceptance scenario (`08-exam-engine.md` §8, step 7), the frontend
persists a **local question snapshot** in IndexedDB at start
(`PersistedExamSession` in the `sessionMeta` store) and rehydrates the runner from
it on resume, refreshing `answers`/`remainingSeconds` from the server when
reachable. This is why the exam draft DB now stores questions in addition to
answer drafts — a deliberate, architect-review-flagged stretch of the
"answer-drafts-only" storage rule (the snapshot carries no correct-answer flag and
no PII). If the backend adds questions to the session read, the local snapshot can
be reduced to answers-only again.

#### BE-I-24 — ⚠️ No `certId` exposed at exam entry, so the FE can't drive `pre-exam-confirmation`

**Severity: Low/Medium — the pre-exam identity-confirmation step cannot be
completed by the frontend; the flow relies on `start`'s 409 guard instead.**
Discovered 2026-07-23 while wiring the exam entry pages (Slice 5b).

**Current contract.** `POST /exam/pre-exam-confirmation` requires a `certId`
(UUID). But nothing the frontend can reach at exam-entry time yields that UUID:

- `POST /exam/validate-access` returns `exam: { id, title, durationMinutes, passingScore }`
  — **no `certId`** (the service has `accessCode.certId` internally but doesn't
  return it).
- `POST /exam/start` likewise returns `sessionId, durationSeconds, expiresAt,
questions` — no `certId`.
- The user-facing certificate pages are static marketing pages keyed by **slug**
  (`epo`, `esm`, …), not the backend certificate UUID, so they can't supply it
  either.

**Expected contract.** Return `certId` on `validate-access` (and ideally on
`start` / the session read), so the frontend can call `pre-exam-confirmation`
before starting when a purchase-enrolled student needs it.

**Frontend impact / current workaround.** Slice 5b collects the identity
attestation (full name / ID) on the verify page per journeys p.4, but **does not**
POST `pre-exam-confirmation` (no `certId`). This is safe because the backend still
enforces it: for purchase-enrolled students `start` returns **409** "Pre-exam
identity confirmation is required", which the ready page surfaces. Admin-issued
codes without a purchase row (the current real assignment path) skip the gate
entirely, so the flow works end-to-end today. Add `certId` to the responses to let
the FE complete the confirmation inline.

#### BE-I-25 — ⚠️ No date-of-birth storage, so the `complete-account` wizard can't be faithfully wired

**Severity: Medium — the post-registration onboarding wizard (`/auth/complete-account`)
cannot be wired to persist its primary field.** Discovered 2026-07-25 while
assessing the `complete-account` follow-up.

**Current contract.** `PATCH /me` (`UpdateProfileDto`) accepts only `phone`,
`locale`, `country`, `city`, `street`, `address`, `postalCode`. The `User` entity
has **no** date-of-birth column (confirmed: nothing in `user.entity.ts`, the
migrations, or the DTO). But the `complete-account` wizard's **step 1** collects a
**birthday** (month / day / year) as a required field, plus phone + address.

**Expected contract (one of):**

- Add a `dateOfBirth` (nullable date) column to `User` + a validated field on
  `UpdateProfileDto`, so the wizard's birthday can be persisted; **or**
- Confirm birthday is out of scope so the design can drop the step.

**Frontend impact.** `complete-account.page` is still a **stub** (`onSubmit` →
navigate to `/dashboard`, saving nothing). It can be partially wired now (PATCH the
address/contact fields the backend accepts), but that would silently drop the
birthday — a data-loss/UX issue — and also requires a boundary decision, since
`ProfileApi` lives in `features/profile` and cross-feature imports are banned
(CLAUDE §5): either promote a profile-update call to `core/`, or add an
auth-feature-local `PATCH /me` transport. Deferred pending (a) the DOB decision
above and (b) that boundary decision.

#### BE-I-26 — ✅ RESOLVED (`2976be0` → `7160f11`, 2026-07-27) — CMS `contact_form` submission

> **Resolution (verified against `contact.controller.ts:36-66`,
> `contact-admin.controller.ts:48-111`, `contact-submission.entity.ts`).** A full
> contact module shipped: public **`POST /contact`** (throttled — default 3 per
> 60 s, `CONTACT_THROTTLE_LIMIT`/`CONTACT_THROTTLE_TTL`), a **honeypot** field
> `company` whose presence silently drops the submission, a **uniform 201** for
> every non-validation outcome (mail failure never fails the request), 400 on
> validation and 429 over-rate. Submissions persist to `contact_submissions` with
> `status ∈ {new, read, archived, spam}` and are managed through
> **`/admin/contact`** (list/detail/PATCH status for support_admin +
> learning_admin; hard **DELETE** for learning_admin, deliberately not a
> soft-delete because the point is PII erasure). Full contract in §6.9c.
> **Frontend follow-up (not done):** the `contact_form` section can now submit for
> real, and an optional admin inbox page is newly possible. Tracked in
> `cms-frontend-plan.md` (Slices 6 and 10).

**Original finding:**

#### BE-I-26 (original) — CMS `contact_form` section has no submission endpoint

**Severity: Medium — the Contact page can be composed in the CMS but cannot
function.** Discovered 2026-07-25 while inventorying the new CMS module.

`CmsSectionType.CONTACT_FORM` exists (`cms.entity.ts:42`) and the seed ships a
`contact` page, but a repo-wide search of `IOS_Backend/src/modules/**/*.controller.ts`
finds **no contact/enquiry endpoint** — nothing receives, stores, rate-limits or
emails a submission. The backend's own `CMS-HANDOFF.md` lists it under
"Deferred (not built)".

**Expected contract:** a `@Public()` `POST /contact` (or `/cms/contact`) taking
`{ name, email, subject?, message, pageSlug? }` with spam + rate-limit guards,
persisting and/or emailing via the existing mail renderer.

**Frontend impact:** the FE can render the section, but the submit action has
nowhere to go. Either skip `contact_form` in the first CMS renderer slice or
render it read-only (mailto fallback) until this lands.

#### BE-I-27 — ⚠️ NARROWED (`66a7632`) — no media upload for CMS sections or blog bodies

**Severity: Medium — images in CMS sections and blog bodies must still be
hand-pasted URLs.** Filed 2026-07-25; narrowed 2026-07-27.

**What is now covered.** Two presigned-upload paths exist: user avatars
(`POST /me/avatar-upload-url`, BE-I-08) and, since `66a7632`, **catalog
certificate images** — `POST /admin/catalog/:id/image-upload-url`
`{ imageType, contentType }` → `{ uploadUrl, requiredHeaders, key, publicUrl }`
(public-read ACL; the caller must echo `requiredHeaders`, including
`x-amz-acl: public-read`, on the `PUT`).

**What is still missing.** No generic admin media endpoint. CMS section image
fields (`hero`, `logo_cloud`, `media_embed`, page `ogImageUrl`, …) and blog
`contentHtml` images have no upload path.

**Expected contract:** an admin-scoped `POST /admin/media/upload-url`
`{ contentType, scope? }` → `{ uploadUrl, requiredHeaders, key, publicUrl }`,
reusing the catalog mechanics with a content-type allowlist.

**Frontend impact:** the catalog form can gain a real picker now; the CMS/blog
editors must keep a "paste an image URL" field and say so in the UI.

#### BE-I-28 — ⚠️ No CMS draft preview (public reads are PUBLISHED-only)

**Severity: Low/Medium — editors cannot see a page before publishing it.**
Discovered 2026-07-25.

`CmsService.getPublicPage()` throws 404 unless `page.status === PUBLISHED`
(`cms.service.ts:89-92`); the admin read (`GET /admin/cms/pages/:id`) returns the
raw page + sections but **not** the hydrated, locale-resolved, SEO-decorated
shape the public renderer consumes. There is no tokenised preview route.

**Expected contract:** either a tokenised `GET /cms/preview/:token` or an
admin-authenticated `GET /admin/cms/pages/:id/preview` returning the _public_
projection for any status.

**Frontend impact:** the admin CMS editor can only offer a structural preview
built from the admin payload; a true WYSIWYG preview needs one of the above. The
gap should be called out in the editor UI rather than faked.

#### BE-I-29 — ⚠️ `contentText` became required on lesson create (breaking, unannounced)

**Severity: Medium — admin lesson creation without body text now 400s.**
Discovered 2026-07-25 by diffing `72a711c` against the FE mappers.

`CreateLessonDto.contentText` is now `@IsString() @IsNotEmpty()` and no longer
optional (`learning/dto/lesson.dtos.ts:41-49`); on update it stays optional but
cannot be blanked (`:99-107`). The change shipped inside a mixed
`feat(analytics)/feat(users)/feat(learning)` commit with no contract note.

**Frontend impact (real bug today):** `toCreateLessonBody()` deliberately omits
`contentText` when the field is blank
(`features/admin/data-access/curriculum.mappers.ts:83-94`), so creating a lesson
with an empty body — previously valid — now fails validation. **FE fix required:**
make the lesson form's content field required (client-side validator + i18n error)
and always send it. Tracked as an FE task in `implementation-progress.md`.

**Backend ask:** flag required-field tightenings separately from feature work so
the contract change is reviewable.

#### BE-I-30 — ⛔ `GET /landing` deleted without a deprecation window (breaks a shipped screen)

**Severity: High — the public landing page 404s against the current backend.**
Discovered 2026-07-27 by diffing `66a7632`.

`LandingController` and `landing-response.dto.ts` were **removed**; the composite
`GET /landing` (`{ featuredPrograms, stats }`) no longer exists. Its replacement is
deliberately narrower: **`GET /analytics/public-stats`** →
`{ stats:{ programs, students, certificatesIssued } }`
(`analytics/public-stats.controller.ts:20-31`). Per the controller's own doc
comment, the other two halves of the old payload now come from **`GET /catalog`**
(featured programs) and **`GET /cms/pages/home`** (static content).

**Frontend impact.** `features/landing/data-access/landing.api.ts:21-25` still
calls `${apiBaseUrl}/landing`, so the landing page's dynamic block fails at
runtime. The endpoint was consumed by A6 (`469f429`) — a screen the backend team
knew was live. **FE fix:** repoint `LandingApi` to `GET /analytics/public-stats`
(+ `GET /catalog` for featured programs) and reshape `landing.dto/model/mappers`;
scheduled as **Slice 1** of [`cms-frontend-plan.md`](./cms-frontend-plan.md), since
the same slice introduces the CMS home page that owns the static content.

**Backend ask:** removing a public endpoint that a shipped client consumes needs a
deprecation note ahead of the merge — the same request as BE-I-29.

#### BE-I-31 — ⚠️ CMS conflict sentinels are message prefixes, not error `code`s

**Severity: Low (contract hygiene) — a workaround exists but it is a fragile one.**
Discovered 2026-07-29 while building CMS-ADMIN Slice 9.

§1.5 of this document, and the CMS plan, both instruct the frontend to *"key off
`code`, not the HTTP status"*. For the CMS module that instruction cannot be
followed for three of its four documented error conditions:

| Condition               | Raised as                                                          | RFC-7807 `code` actually emitted |
| ----------------------- | ------------------------------------------------------------------ | -------------------------------- |
| `CMS_PAGE_NOT_PUBLISHABLE` | `CmsPageNotPublishableException` (`cms.errors.ts:12-29`)        | ✅ `CMS_PAGE_NOT_PUBLISHABLE`    |
| `SLUG_LOCKED`           | `new ConflictException('SLUG_LOCKED: …')` (`cms.service.ts:292-295`) | ❌ `RESOURCE_ALREADY_EXISTS`     |
| `SYSTEM_PAGE_PROTECTED` | `new ConflictException('SYSTEM_PAGE_PROTECTED: …')` (`cms.service.ts:416-420`) | ❌ `RESOURCE_ALREADY_EXISTS` |
| `SECTION_NOT_IN_PAGE`   | `new BadRequestException('SECTION_NOT_IN_PAGE: …')` (`cms.service.ts:544-548`) | ❌ `VALIDATION_FAILED`      |

Only the first is a real `AppException` with its own code. The other three are
plain Nest exceptions, and `GlobalExceptionFilter` maps them purely by status
(`global-exception.filter.ts:270`) — so a genuine slug collision, a locked slug
and a protected system page are **indistinguishable by `code`**. The sentinel
survives only as a prefix inside the human-readable `detail` string.

**Frontend impact.** Any CMS admin client that wants to tell these apart — to say
"unpublish the page first" rather than leak `SLUG_LOCKED: the slug of a published
page cannot be changed` at the user — must substring-match `detail`. That is a
string dependency on a message no contract promises to keep stable, and one that
would break silently the moment `detail` is localised (which the backend already
does elsewhere via `X-Lang`).

> **Status note (2026-07-29).** The CMS admin frontend that surfaced this was
> built and then rolled back the same day, so **no frontend code currently
> depends on the sentinels**. The backend defect is unaffected by that and the
> issue stays open: it will be hit again by whoever rebuilds CMS-ADMIN, and it
> already applies to the identical pattern in the blog module.

**Backend ask:** promote the three sentinels to real `ErrorCode` entries with
their own `AppException` subclasses, exactly as `CMS_PAGE_NOT_PUBLISHABLE`
already is. The prefixes suggest that was the intent. Blog has the same pattern
for its own `SLUG_LOCKED`, so a fix would help both modules.

### Endpoints added 2026-07-13 (blocker fixes)

> Response envelopes still vary per endpoint (BE-I-01) — noted inline.

**User-facing (student token unless noted):**

| Method | Path                          | Response                    | Notes                                                                                                           |
| ------ | ----------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/me/certificates`            | `{ data }`                  | Earned certs: `{ certId, program, programCode, issuedAt, status, certificateUrl, qrUrl, verifyUrl }` (BE-I-16). |
| POST   | `/me/avatar-upload-url`       | bare                        | `{ contentType }` → `{ uploadUrl, key, expiresInSeconds }`; PUT bytes then `PATCH /me` (BE-I-08).               |
| GET    | `/me/export`                  | bare                        | GDPR data export.                                                                                               |
| POST   | `/me/delete`                  | message                     | `{ password }` step-up; anonymise-in-place (BE-I-19).                                                           |
| GET    | `/insights`                   | bare                        | Student aggregates (BE-I-20a).                                                                                  |
| GET    | `/landing`                    | bare (Public)               | `{ featuredPrograms: CatalogItem[], stats }` (BE-I-20).                                                         |
| GET    | `/exam/attempts`              | `{ data, meta.pagination }` | Real-exam history (BE-I-17).                                                                                    |
| GET    | `/notifications`              | `{ data, meta.pagination }` | `?cursor&limit&unreadOnly` (BE-I-18).                                                                           |
| GET    | `/notifications/unread-count` | bare `{ count }`            | Badge source.                                                                                                   |
| POST   | `/notifications/:id/read`     | `{ data }`                  | Idempotent.                                                                                                     |
| POST   | `/notifications/read-all`     | `{ updated }`               |                                                                                                                 |
| POST   | `/consent`                    | (Public)                    | `{ categories, policyVersion }` cookie consent (BE-042).                                                        |

**Admin:**

| Method | Path                                                           | Roles                           | Notes                                                                                              |
| ------ | -------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/admin/certs/:id/curriculum`                                  | content_creator, learning_admin | All statuses + full fields (BE-I-13).                                                              |
| GET    | `/admin/certs/issued`                                          | super_admin, learning_admin     | `{ data, meta.pagination }`; revoke via existing `PATCH /admin/certs/issued/:id/revoke` (BE-I-15). |
| GET    | `/admin/dashboard/overview`                                    | super_admin, finance_admin      | Revenue/enrollments/exams/students/topPrograms (BE-I-07).                                          |
| \*     | `/admin/staff`                                                 | super_admin                     | Create/list/get/patch/deactivate (BE-I-03).                                                        |
| \*     | `/admin/promo-codes`                                           | super_admin, finance_admin      | Full CRUD (BE-I-05).                                                                               |
| \*     | `/admin/lessons/:id/quizzes`, `/admin/quizzes/:id[/questions]` | content_creator, learning_admin | Lesson-quiz authoring (BE-I-06).                                                                   |

**Auth:**

| Method | Path                                        | Notes                                                                                           |
| ------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| POST   | `/auth/admin/login`                         | Returns `LoginResponseDto` **or** `{ otpRequired, challengeId, expiresInSeconds }` when OTP on. |
| POST   | `/auth/admin/login/otp`                     | `{ challengeId, code }` → tokens; single-use, 5-min, ≤5 attempts.                               |
| POST   | `/auth/admin/refresh`, `/auth/admin/logout` | Dedicated admin session routes — confirm whether admin must use these vs. shared `/auth/*`.     |

### Admin dashboard overview — response shape (B6, `GET /admin/dashboard/overview`)

Roles **super_admin / finance_admin** (revenue is finance-sensitive). **Bare**
object (no envelope). Query `?months=N` (1–24, default 6) sizes the revenue
series. Aggregates run on a dedicated analytics DB runner (not the per-request
RLS runner), so admins see platform-wide totals.

```jsonc
{
  "revenue": {
    "total": 18234.75, // all-time completed-tx revenue (2dp)
    "currency": "USD", // "MIXED" if completed tx span >1 currency (no FX)
    "last30Days": 2450.0,
    "monthly": [{ "month": "2026-03", "revenue": 1499.5, "transactions": 12 }],
  },
  "transactions": { "completed": 320, "pending": 14, "failed": 6, "refunded": 3 },
  "enrollments": { "total": 512, "last30Days": 48 },
  "students": { "total": 486, "newLast30Days": 37 },
  "exams": { "attempts": 640, "passed": 520, "passRate": 0.8125, "avgScore": 84.32 },
  "certificates": { "issued": 498 }, // active issued certs
  "topPrograms": [
    { "certId": "…", "program": "…", "programCode": "PSM", "enrollments": 210, "revenue": 10290.0 },
  ], // top 5 by enrollments
}
```

Note `exams.passRate` is a **0–1 fraction** (format as %); `revenue.currency` may
be `"MIXED"`. `revenue.monthly` drives a chart (apexcharts is already bundled).

### Later backend changes (2026-07-14 → ) — post-checklist

| BE commit                                     | Change                                                                                                                                                                                                                                                        | Frontend impact                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5c11460`                                     | `refactor(exam)`: exam **domain-state conflicts 422 → 409** (assign "not published", start "identity confirmation required", autosave "session expired", owned-session status guard). Locked convention: 400 = input validation, 409 = domain-state conflict. | When wiring exam/assessment flows, treat **409** as a domain conflict and branch on the RFC-7807 `code` (not the status). Mock-exam still uses 422 (separate module).                                                                                                                         |
| `f78e76b`                                     | `feat(audit)`: harden admin-write audit capture.                                                                                                                                                                                                              | None (server-side audit only).                                                                                                                                                                                                                                                                |
| `a0d2409`                                     | `feat(health)`: gate debug-sentry route to development.                                                                                                                                                                                                       | None.                                                                                                                                                                                                                                                                                         |
| `f639a85`                                     | `fix(deps)`: npm audit advisory bumps.                                                                                                                                                                                                                        | None.                                                                                                                                                                                                                                                                                         |
| `334d0c6`                                     | `feat(blog)`: **BlogModule (BE-I-11)** — admin CRUD + publish/unpublish + translations, and a public SEO read API. `BlogArticle` is no longer a dead surface. Endpoints below.                                                                                | **Two new FE surfaces:** (1) rewire the public blog (`features/insights`, currently `getPosts()`→null) to `GET /blog` + `GET /blog/:slug`; (2) a new **admin Blog authoring** page. See "Blog endpoints (BE-I-11)" below.                                                                     |
| `d7a78e6` · `30bfff5` · `3e52625` · `72a711c` | 2026-07-20 → 2026-07-22: blog list-query fix, **BE-I-21 fix**, the **CMS module**, and the analytics date-window / student-detail / lesson-`contentText` changes.                                                                                             | Detailed in [§6.9b Latest backend sync (2026-07-25b)](#69b-latest-backend-sync-2026-07-25b--cms-module-blog-fix-analytics-window).                                                                                                                                                            |
| `be902fe` + `d67d7ff`                         | `feat(i18n)` Week 9 — locale-aware mail renderer, **validation error i18n**, locale parity guard, and content bundles for **tr/fr/es/ar/de** (+ 60 email templates). `SUPPORTED_LOCALES = ['en','tr','fr','es','ar','de']` (was fewer).                       | RFC-7807 `detail`/validation messages are now localized by `X-Lang`. The **catalog/blog/exam translation editors** may offer more target locales than the app's UI locales (en/fr/ar) — the FE still ships en/fr/ar UI; extra backend locales are authoring targets only. No breaking change. |

### Blog endpoints (BE-I-11, `334d0c6`)

Public (`@Public()` — no auth):

| Method | Path          | Notes                                                                                                                                                                                                                                                                                |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/blog`       | `{ data, meta.pagination }` (cursor, published_at DESC). Item: `{ slug, title, metaDescription (excerpt), publishedAt, authorName, locale, fallbackUsed }` — no `contentHtml`. Optional `?search=` (English title). Localized by `X-Lang`.                                           |
| GET    | `/blog/:slug` | Bare `BlogDetailDto`: `{ slug, title, contentHtml, metaDescription, publishedAt, authorName, locale, fallbackUsed, seo:{ metaTitle, metaDescription, canonicalUrl, ogType, publishedAt, authorName } }`. **404 for draft/archived/unknown** (never reveals a non-published article). |

Admin `admin/blog` (content_creator/learning_admin for read+create+update; **learning_admin only** for publish/unpublish/delete):

| Method | Path                           | Roles                           | Notes                                                                                                                               |
| ------ | ------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/blog`                  | content_creator, learning_admin | List all statuses (`BlogAdminItemDto`: `id,slug,title,status,metaDescription,authorId,authorName,publishedAt,createdAt,updatedAt`). |
| GET    | `/admin/blog/:id`              | content_creator, learning_admin | `BlogAdminDetailDto` (adds `contentHtml` + raw `translations`).                                                                     |
| POST   | `/admin/blog`                  | content_creator, learning_admin | Create (English fields + slug). See `create-blog.dto.ts`.                                                                           |
| PATCH  | `/admin/blog/:id`              | content_creator, learning_admin | Update English fields + slug.                                                                                                       |
| PATCH  | `/admin/blog/:id/translations` | content_creator, learning_admin | Per-locale title/metaDescription/contentHtml (same replace-merge idiom as catalog/exam translations).                               |
| POST   | `/admin/blog/:id/publish`      | learning_admin                  | Publish. `BlogStatus` = draft \| published \| archived.                                                                             |
| POST   | `/admin/blog/:id/unpublish`    | learning_admin                  | Revert to draft/archived.                                                                                                           |
| DELETE | `/admin/blog/:id`              | learning_admin                  | Delete.                                                                                                                             |

---

### Original findings (historical — see status block above for current state)

| ID          | Severity    | Area            | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Frontend impact                                                                                                                                                                                                                                                                                                                      |
| ----------- | ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BE-I-01** | Low         | Response shape  | No consistent response envelope: bare DTO vs `{ data }` vs `{ data, meta }` across endpoints (auth/profile are bare; admin writes are `{ data }`; lists are `{ data, meta }`).                                                                                                                                                                                                                                                                                                                               | Mappers must be per-endpoint; cannot assume one global unwrap.                                                                                                                                                                                                                                                                       |
| **BE-I-02** | Medium      | Auth/security   | Refresh cookie is **`SameSite=Lax`** and only `Secure` in prod/staging — the frontend `CLAUDE.md §8`/docs assume **`SameSite=Strict`**. Doc ↔ code mismatch.                                                                                                                                                                                                                                                                                                                                                 | Confirm intended policy with backend; don't rely on Strict semantics. Local/dev cookie is non-Secure.                                                                                                                                                                                                                                |
| **BE-I-03** | Medium      | Admin panel gap | **No admin-user management API** (create/list/update/deactivate admins, assign roles). Admins are seeded/internal only.                                                                                                                                                                                                                                                                                                                                                                                      | An "Admin Users / Staff" admin page cannot be built against the current API.                                                                                                                                                                                                                                                         |
| **BE-I-04** | Medium      | Catalog gap     | `Certificate` entity fields **`badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl`** are **not present in Create/Update DTOs** (`whitelist+forbidNonWhitelisted` ⇒ sending them 400s). They're effectively seed-only.                                                                                                                                                                                                                                                                           | Catalog admin form can't edit these catalog-card fields.                                                                                                                                                                                                                                                                             |
| **BE-I-05** | Medium      | Admin panel gap | **No admin CRUD for promo codes** (`PromoCode` entity + `PromoService` exist; only consumed at checkout).                                                                                                                                                                                                                                                                                                                                                                                                    | No "Promo codes" admin page possible yet.                                                                                                                                                                                                                                                                                            |
| **BE-I-06** | Low         | Admin panel gap | **No lesson-quiz authoring endpoints** (`LessonQuiz`/`QuizQuestion` seed-only). Only exam/mock question authoring exist.                                                                                                                                                                                                                                                                                                                                                                                     | Quiz management page not buildable via API.                                                                                                                                                                                                                                                                                          |
| **BE-I-07** | Low         | Admin panel gap | **No dashboard/analytics/aggregate endpoints** (revenue, enrollments, pass rates). Only per-student counts (`/admin/users/:id`).                                                                                                                                                                                                                                                                                                                                                                             | Admin dashboard would have no real metrics source.                                                                                                                                                                                                                                                                                   |
| **BE-I-08** | Low         | Uploads         | `StorageService.getSignedUploadUrl()` exists but **no controller exposes it**. `avatarUrl` (and cert/thumbnail/badge URLs) are free strings set via PATCH.                                                                                                                                                                                                                                                                                                                                                   | Frontend cannot obtain a signed PUT URL to upload avatars/images through the API (code comments defer this to "Week 8").                                                                                                                                                                                                             |
| **BE-I-09** | Low         | Duplication     | Two overlapping "list exams for a cert" endpoints: `GET /admin/exam?certId=` (published only, `ExamAdminController`) and `GET /admin/certs/:certId/exams` (all statuses, `ExamAuthoringController`).                                                                                                                                                                                                                                                                                                         | Choose deliberately per screen (assign vs authoring).                                                                                                                                                                                                                                                                                |
| **BE-I-10** | Info        | Routing         | `GET /health` is at the **root** (no `/api/v1`) but `GET /health/full` is under `/api/v1` (only the exact `health` path is prefix-excluded).                                                                                                                                                                                                                                                                                                                                                                 | Use `environment.apiBaseUrl` for `/health/full`; use the bare origin for `/health`.                                                                                                                                                                                                                                                  |
| **BE-I-11** | ✅ Resolved | Content         | `BlogArticle`/`BlogStatus` now has a full `BlogModule` (`334d0c6`): public `GET /blog` + `/blog/:slug` and admin `admin/blog` CRUD + publish/translations. See "Blog endpoints (BE-I-11)".                                                                                                                                                                                                                                                                                                                   | Rewire the public blog (`features/insights`) and add an admin Blog authoring page.                                                                                                                                                                                                                                                   |
| **BE-I-12** | Info        | Error status    | Both class-validator failures and manual domain `BadRequestException`s return **HTTP 400** with `code: VALIDATION_FAILED` (no 422).                                                                                                                                                                                                                                                                                                                                                                          | Branch on `code`/`errors[]`, not status, in the error interceptor.                                                                                                                                                                                                                                                                   |
| **BE-I-14** | Low         | Error detail    | **Publish-gate `reasons[]` are dropped by the exception filter.** `publishExam` throws `ConflictException({ message, reasons })` on `EXAM_NOT_PUBLISHABLE`, but `GlobalExceptionFilter.extractRawMessage` reads only `message ?? errors`, so the structured `reasons[]` (e.g. "Exam must have at least 1 question", per-question option errors) never reach the RFC-7807 body.                                                                                                                               | The admin exam-authoring UI can only show the generic "not publishable" message, not _which_ checks failed. Surface `reasons[]` (e.g. under `errors[]` or a problem-detail extension) so the FE can list them.                                                                                                                       |
| **BE-I-13** | Medium      | Admin panel gap | **No admin read endpoint for curriculum (modules/lessons).** Admin has only `POST/PATCH/DELETE /admin/{modules,lessons}` — no admin GET. The only read is public `GET /catalog/:id/outline`, which is **active-only**, **titles-only** (no `description`/`contentText`/`videoUrl`/`active`/`durationSeconds` for modules), and **404s when the parent cert is inactive** (`getPublicOutline` requires `cert.active`). Student `GET /learning/certs/:certId/curriculum` is enrollment-gated (403 for admins). | A Curriculum **management** page is only half-buildable: it can create, and can list _active_ module/lesson titles (IDs are exposed, so delete works), but **edit forms can't pre-fill** existing fields and **soft-deleted items are invisible / can't be reactivated**. Needs an admin curriculum GET (all statuses, full fields). |
| **BE-I-15** | Medium      | Admin panel gap | **No issued-certificate list/read endpoint.** The only issued-cert routes are `PATCH /admin/certs/issued/:id/revoke` (needs the internal UUID) and public `GET /verify/:certId` (needs the public `IOS-…` id). No admin list/search of issued certificates exists, so the revoke `:id` can't be discovered through the UI.                                                                                                                                                                                   | A **Certificate revocation** admin page is not buildable as a browsable list — an admin would have to paste an id obtained out-of-band. Needs `GET /admin/certs/issued` (paginated, filter by user/cert).                                                                                                                            |
| **BE-I-16** | High        | App gap         | **No student "my certificates" list endpoint.** `CertificateModule` exposes only public `GET /verify/:certId` + admin revoke. A logged-in student cannot list the certificates they've earned (the public id `IOS-…` is not returned by any student endpoint).                                                                                                                                                                                                                                               | The user-facing **Certificates** screen can't list earned certs — only verify a manually-entered id. Needs `GET /me/certificates`.                                                                                                                                                                                                   |
| **BE-I-17** | Medium      | App gap         | **No student real-exam attempt history.** `@Controller('exam')` has only live-session routes (`start`, `sessions/:id`, `submit`, `late-submit`); there is no "my attempts" list. (Mock exams DO have `GET /mock/history`.)                                                                                                                                                                                                                                                                                   | The user-facing dashboard / assessments screens can't show a student's past **real-exam** results. Needs `GET /exam/attempts` (student-scoped).                                                                                                                                                                                      |
| **BE-I-18** | Medium      | App gap         | **No in-app notifications API.** `NotificationModule` is a transactional-**email** queue + worker only — no student-facing `GET /notifications` / mark-read routes.                                                                                                                                                                                                                                                                                                                                          | The user-facing **Notifications** feature has no backend and cannot be wired. Scope it out or add a notifications read/ack API.                                                                                                                                                                                                      |
| **BE-I-19** | Low         | App gap         | **No self-service account-deletion endpoint.** `/me` exposes GET, PATCH (profile), PATCH `/password` only — no `DELETE /me`.                                                                                                                                                                                                                                                                                                                                                                                 | The **Settings → delete account** action can't be wired; hide it or add `DELETE /me` (with step-up re-auth per SOW).                                                                                                                                                                                                                 |
| **BE-I-20** | Low         | App gap         | **No `/landing` or `/insights` endpoints.** The existing `landing` and `insights` features call `GET /landing` / `GET /insights`, which don't exist (analytics gap, cf. BE-I-07).                                                                                                                                                                                                                                                                                                                            | Landing dynamic content must be static or composed from `GET /catalog`; the **Insights** analytics screen has no data source and should be scoped out until analytics endpoints exist.                                                                                                                                               |

---

## Frontend implication summary (for Step 2 infrastructure planning)

The infrastructure needed to expose **every** backend capability, mapped to the
frontend `core/` + feature `data-access/` conventions (CLAUDE.md §5):

- **HTTP core** already scaffolded (`core/http`): auth → locale → retry → error
  interceptors. Needs: send `Authorization: Bearer` from `AuthStore` (access in
  memory), `X-Lang` from locale, `withCredentials: true` for the refresh cookie,
  and an error interceptor that maps RFC-7807 `code` → typed app errors and
  handles the **refresh-race / session-invalidated** 401.
- **Auth core** (`core/auth`): the real login (student + admin), refresh
  rotation, logout, and RBAC (`role.guard`, `has-role.directive`) against the
  `role`/`type` claims — replacing the current `mock-auth.backend.ts`.
- **Typed models/DTOs** generated from §7–§8 (interfaces preferred; no `any`).
- **Feature `data-access` API services** per module: catalog, learning, exam
  (+`/exam` WS), mock (+`/mock` WS), payments, certificates, profile, admin
  (users, audit, catalog/learning/exam/mock authoring).
- **Pagination helper** for the cursor `{ data, meta.pagination }` shape.
- **Admin panel** (Step 3, page-by-page) starts at **Login** → then the
  buildable admin surfaces (catalog, curriculum, exam authoring, exam
  assignment, mock questions, users/oversight, audit logs, cert revocation),
  bounded by the gaps in the Issues Report above.
