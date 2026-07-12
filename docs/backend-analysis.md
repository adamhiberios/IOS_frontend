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
BlogStatus(draft|published|archived)`, authorId, translations. _(Entity exists;
  **no controller** — planned/unused.)_

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

> Per the mission rules, these are **documented, not fixed**. To be shared with
> the backend team. Nothing in `IOS_Backend/` was modified.

| ID          | Severity | Area            | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Frontend impact                                                                                                                                                                                                                                                                                                                      |
| ----------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BE-I-01** | Low      | Response shape  | No consistent response envelope: bare DTO vs `{ data }` vs `{ data, meta }` across endpoints (auth/profile are bare; admin writes are `{ data }`; lists are `{ data, meta }`).                                                                                                                                                                                                                                                                                                                               | Mappers must be per-endpoint; cannot assume one global unwrap.                                                                                                                                                                                                                                                                       |
| **BE-I-02** | Medium   | Auth/security   | Refresh cookie is **`SameSite=Lax`** and only `Secure` in prod/staging — the frontend `CLAUDE.md §8`/docs assume **`SameSite=Strict`**. Doc ↔ code mismatch.                                                                                                                                                                                                                                                                                                                                                 | Confirm intended policy with backend; don't rely on Strict semantics. Local/dev cookie is non-Secure.                                                                                                                                                                                                                                |
| **BE-I-03** | Medium   | Admin panel gap | **No admin-user management API** (create/list/update/deactivate admins, assign roles). Admins are seeded/internal only.                                                                                                                                                                                                                                                                                                                                                                                      | An "Admin Users / Staff" admin page cannot be built against the current API.                                                                                                                                                                                                                                                         |
| **BE-I-04** | Medium   | Catalog gap     | `Certificate` entity fields **`badgeImageUrl`, `track`, `level`, `durationHours`, `syllabusUrl`** are **not present in Create/Update DTOs** (`whitelist+forbidNonWhitelisted` ⇒ sending them 400s). They're effectively seed-only.                                                                                                                                                                                                                                                                           | Catalog admin form can't edit these catalog-card fields.                                                                                                                                                                                                                                                                             |
| **BE-I-05** | Medium   | Admin panel gap | **No admin CRUD for promo codes** (`PromoCode` entity + `PromoService` exist; only consumed at checkout).                                                                                                                                                                                                                                                                                                                                                                                                    | No "Promo codes" admin page possible yet.                                                                                                                                                                                                                                                                                            |
| **BE-I-06** | Low      | Admin panel gap | **No lesson-quiz authoring endpoints** (`LessonQuiz`/`QuizQuestion` seed-only). Only exam/mock question authoring exist.                                                                                                                                                                                                                                                                                                                                                                                     | Quiz management page not buildable via API.                                                                                                                                                                                                                                                                                          |
| **BE-I-07** | Low      | Admin panel gap | **No dashboard/analytics/aggregate endpoints** (revenue, enrollments, pass rates). Only per-student counts (`/admin/users/:id`).                                                                                                                                                                                                                                                                                                                                                                             | Admin dashboard would have no real metrics source.                                                                                                                                                                                                                                                                                   |
| **BE-I-08** | Low      | Uploads         | `StorageService.getSignedUploadUrl()` exists but **no controller exposes it**. `avatarUrl` (and cert/thumbnail/badge URLs) are free strings set via PATCH.                                                                                                                                                                                                                                                                                                                                                   | Frontend cannot obtain a signed PUT URL to upload avatars/images through the API (code comments defer this to "Week 8").                                                                                                                                                                                                             |
| **BE-I-09** | Low      | Duplication     | Two overlapping "list exams for a cert" endpoints: `GET /admin/exam?certId=` (published only, `ExamAdminController`) and `GET /admin/certs/:certId/exams` (all statuses, `ExamAuthoringController`).                                                                                                                                                                                                                                                                                                         | Choose deliberately per screen (assign vs authoring).                                                                                                                                                                                                                                                                                |
| **BE-I-10** | Info     | Routing         | `GET /health` is at the **root** (no `/api/v1`) but `GET /health/full` is under `/api/v1` (only the exact `health` path is prefix-excluded).                                                                                                                                                                                                                                                                                                                                                                 | Use `environment.apiBaseUrl` for `/health/full`; use the bare origin for `/health`.                                                                                                                                                                                                                                                  |
| **BE-I-11** | Info     | Naming          | `BlogArticle`/`BlogStatus` entity exists with **no controller** — dead/planned surface.                                                                                                                                                                                                                                                                                                                                                                                                                      | Ignore for now; no API to bind.                                                                                                                                                                                                                                                                                                      |
| **BE-I-12** | Info     | Error status    | Both class-validator failures and manual domain `BadRequestException`s return **HTTP 400** with `code: VALIDATION_FAILED` (no 422).                                                                                                                                                                                                                                                                                                                                                                          | Branch on `code`/`errors[]`, not status, in the error interceptor.                                                                                                                                                                                                                                                                   |
| **BE-I-14** | Low      | Error detail    | **Publish-gate `reasons[]` are dropped by the exception filter.** `publishExam` throws `ConflictException({ message, reasons })` on `EXAM_NOT_PUBLISHABLE`, but `GlobalExceptionFilter.extractRawMessage` reads only `message ?? errors`, so the structured `reasons[]` (e.g. "Exam must have at least 1 question", per-question option errors) never reach the RFC-7807 body.                                                                                                                               | The admin exam-authoring UI can only show the generic "not publishable" message, not _which_ checks failed. Surface `reasons[]` (e.g. under `errors[]` or a problem-detail extension) so the FE can list them.                                                                                                                       |
| **BE-I-13** | Medium   | Admin panel gap | **No admin read endpoint for curriculum (modules/lessons).** Admin has only `POST/PATCH/DELETE /admin/{modules,lessons}` — no admin GET. The only read is public `GET /catalog/:id/outline`, which is **active-only**, **titles-only** (no `description`/`contentText`/`videoUrl`/`active`/`durationSeconds` for modules), and **404s when the parent cert is inactive** (`getPublicOutline` requires `cert.active`). Student `GET /learning/certs/:certId/curriculum` is enrollment-gated (403 for admins). | A Curriculum **management** page is only half-buildable: it can create, and can list _active_ module/lesson titles (IDs are exposed, so delete works), but **edit forms can't pre-fill** existing fields and **soft-deleted items are invisible / can't be reactivated**. Needs an admin curriculum GET (all statuses, full fields). |

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
