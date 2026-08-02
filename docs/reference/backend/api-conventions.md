# Backend API Conventions

> Derived exclusively from `IOS_Backend/` source (read-only), not Swagger.
> Backend stack: NestJS + TypeORM (PostgreSQL) + Redis + Socket.IO + Stripe +
> S3-compatible storage (DO Spaces) + nestjs-i18n + Passport-JWT.
>
> Deployed API base URLs (never run the backend locally):
> - Dev: `https://api-dev.instituteofscrum.org/api/v1`
> - Prod: `https://api.instituteofscrum.org/api/v1`

## Routing / prefix

Global prefix **`/api/v1`**, **except**: `health`, `verify-email`,
`reset-password` (email-link web pages, root-mounted). So liveness is
`GET /health` (no prefix); deep health is `GET /api/v1/health/full`.

## Global request pipeline (every request)

1. **`ThrottlerGuard`** (global) — default 100 req/60s per IP; `auth` tier
   5 req/60s (login/register/verify/forgot/reset). Exceed → 429.
2. **`JwtAuthGuard`** (global) — every route requires a valid access JWT
   unless `@Public()`.
3. **`ValidationPipe`** (global) — `whitelist: true`,
   `forbidNonWhitelisted: true`, `transform: true`,
   `enableImplicitConversion: true`. Unknown body/query properties are
   **rejected with 400**, not stripped. Query strings coerce to declared types.
4. **`RlsInterceptor`** — authenticated requests open a per-request DB
   transaction and set Postgres session GUCs (`app.current_user_id`,
   `app.current_admin_id`, `app.current_ip`) so RLS policies scope
   reads/writes. Unauthenticated requests bypass it.
5. **`RolesGuard`** — opt-in per controller via `@UseGuards` + `@Roles(...)`.
   Not global.

## Authorization header

Access token: `Authorization: Bearer <JWT>`. Refresh token is an **httpOnly
cookie** — never readable by JS.

## Response envelope — inconsistent, document per endpoint

No single global envelope. Three shapes exist:

- **Bare DTO** — auth, profile, most student exam/mock/learning endpoints.
- **`{ data }`** — most admin write endpoints (catalog/learning/exam
  authoring/mock admin).
- **`{ data, meta }`** — list endpoints with pagination: catalog, admin/users,
  admin/audit-logs, mock/history, payments/transactions.

Frontend mappers must be written **per endpoint**, not globally (BE-I-01,
open — behavioural, not a bug).

## Error shape — RFC 7807 Problem Details (`application/problem+json`)

```jsonc
{
  "type": "https://ios-lms.com/errors/<code-slug>",
  "title": "<localized>",
  "status": 400,
  "detail": "<localized or verbatim>",
  "instance": "/api/v1/...",
  "code": "VALIDATION_FAILED",     // switch on THIS, stable contract
  "request_id": "<uuid>",          // also echoed in X-Request-Id header
  "errors": [                      // present for validation failures, else null
    { "field": "email", "code": "IS_EMAIL", "message": "...", "constraints": {...} }
  ],
  "timestamp": "2026-…Z"
}
```

Stable error-code families (`common/errors/error-codes.ts`):

| Family | Codes |
| --- | --- |
| Validation | `VALIDATION_FAILED`, `INVALID_LOCALE` |
| Auth (401) | `INVALID_CREDENTIALS`, `JWT_EXPIRED`, `JWT_INVALID`, `REFRESH_TOKEN_REUSED`, `REFRESH_TOKEN_INVALID`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_DISABLED` |
| Authorization (403) | `INSUFFICIENT_ROLE`, `OWNERSHIP_VIOLATION` |
| Domain (404/409/410/422) | `RESOURCE_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS`, `EMAIL_ALREADY_REGISTERED` |
| Infrastructure | `RATE_LIMITED`, `INTERNAL` |

Validation failures **and** manually-thrown domain `BadRequestException`s both
surface as **400** with `code: VALIDATION_FAILED` (standardised on 400, not
422) — except exam domain-state conflicts, which the backend moved to **409**
(`5c11460`: assign "not published", start "identity confirmation required",
autosave "session expired" — treat 409 as domain conflict, branch on `code`,
not status). Mock-exam still uses 422 for its own conflicts (separate
module). The `errorInterceptor` should key off `code` + `errors[]`, never
status alone (BE-I-12, behavioural).

**Known contract gap (BE-I-31, open):** three CMS conflict sentinels
(`SLUG_LOCKED`, `SYSTEM_PAGE_PROTECTED`, `SECTION_NOT_IN_PAGE`) are message
prefixes, not real `code`s — see
[`open-issues.md`](./open-issues.md#be-i-31). Same pattern exists on blog's
own `SLUG_LOCKED`.

## Pagination — cursor/keyset, not offset

```jsonc
"meta": { "pagination": { "limit": 20, "nextCursor": "<opaque>|null", "hasMore": true } }
```

Opaque cursor on `(created_at, id)`, newest-first. Pass `?cursor=<nextCursor>`
for the next page. `limit` defaults/caps vary per endpoint. **No total
count.**

## Internationalisation

Six supported locales (`common/i18n/types.ts`): **`en, tr, fr, es, ar, de`**.
`ar` is RTL (`directionFor(locale)` → `'ltr'|'rtl'`). Locale resolution
chains: user/admin preference → `X-Lang` header → `Accept-Language` → default
`en`. Send **`X-Lang: <locale>`** to force a locale (frontend
`localeInterceptor` does this). Translatable content lives in a
`translations` JSONB column per entity; public responses resolve to the
requested locale with **English fallback** + expose `fallbackUsed` +
`direction` on catalog/profile/CMS/blog payloads.

**App UI locale set stays en/fr/ar** even though the backend supports
tr/es/de too — those extra locales are authoring targets only (translation
editors offer them; the shipped UI doesn't).

## CORS / credentials

Allowlist-driven (`CORS_ORIGINS`), `credentials: true`. Frontend origin must
be on the backend allowlist. Same validator guards WebSocket namespaces.

## Roles (`AdminRole`)

Five admin tiers + implicit "student" account type. **Authorization is
exact-match** against `@Roles(...)`, with **one** exception: `SUPER_ADMIN`
passes every check. **No numeric hierarchy** — `learning_admin` does NOT
implicitly inherit `content_creator`; both are listed explicitly wherever
both are allowed.

| Role | Purpose | Typical endpoints |
| --- | --- | --- |
| `super_admin` | Full access; passes all role checks | audit logs, deep health, cert revoke, everything |
| `learning_admin` | Owns catalog/curriculum/exam lifecycle | create/update/**delete/publish** content, assign exams, cert revoke, user oversight |
| `content_creator` | Authors content, cannot delete/publish | create/update catalog, modules, lessons, exam questions |
| `finance_admin` | Finance/payments branch | *(no finance-specific endpoints exist yet)* |
| `support_admin` | Read-only student support | list/read students, attempts, access codes |

**Account type** (`type` claim): `'student' | 'admin'`. Student-only
endpoints (`/me`, `/learning/*`, `/mock/*`, `/payments/*`, `/exam/*` student
routes) reject admin tokens with **403**.

## Guards

| Guard | Scope | Behaviour |
| --- | --- | --- |
| `JwtAuthGuard` | Global | Validates `Authorization: Bearer`; skipped when `@Public()`; 401 on missing/invalid/expired. |
| `JwtRefreshGuard` | Per-route (`/auth/refresh`, `/auth/logout`, admin equivalents) | Validates the refresh JWT from the `refreshToken` cookie. |
| `RolesGuard` | Per-controller | Exact-match `@Roles(...)`; `SUPER_ADMIN` bypass. 403 otherwise. |
| `ThrottlerGuard` | Global | 100/60s default, `auth` tier 5/60s. Stripe webhook is `@SkipThrottle()`. |

Decorators: `@Public()`, `@CurrentUser()` / `@CurrentUser('id')` /
`@CurrentUser('adminId')`, `@Roles(...AdminRole[])`.

## Auth token flow

- **Access JWT** — `JWT_SECRET`, TTL **900s (15 min)**. Claims
  `{ sub, type: 'student'|'admin', email, locale, role? }`. Returned in the
  login/refresh **response body**. Store **in memory**, send as
  `Authorization: Bearer`.
- **Refresh JWT** — `JWT_REFRESH_SECRET`, TTL **604800s (7 days)**. Claims
  `{ sub, type, jti }`. Delivered as cookie `refreshToken`: `httpOnly`,
  `secure` (prod/staging only), **`sameSite: 'lax'`** (⚠️ not `Strict` — a
  past doc/code mismatch, BE-I-02, behavioural), `path=/api/v1/auth`,
  7-day maxAge. Because of the cookie path, the browser only sends it to
  `/api/v1/auth/*` routes.

Login endpoints (all `@Public()`): `POST /auth/register`,
`/auth/verify-email`, `/auth/resend-verification`, `/auth/login`,
`/auth/refresh` (cookie), `/auth/logout` (cookie), `/auth/forgot-password`,
`/auth/reset-password`, `/auth/admin/login`, `/auth/admin/refresh`,
`/auth/admin/logout`. **No public admin registration** — admin accounts are
seeded/internal only, and there is no HTTP endpoint to create/list/edit admin
users beyond `/admin/staff` (super_admin only).

**Login behaviour to handle:**
- 401 `Invalid credentials` — wrong email/password OR inactive account (anti-enumeration; dummy bcrypt compare equalises timing).
- 401 `Email not verified` — correct creds, `emailVerified=false` (student only) — offer "resend".
- 429 — IP-based layer-2 rate limit: 10 failed logins/15 min ⇒ 30-minute block (persisted). Distinct from the 5/60s throttler tier.

**Refresh rotation & reuse detection:** `POST /auth/refresh` revokes the old
token and issues a new pair (rotation every refresh). Presenting a revoked
token, or two concurrent refreshes racing, triggers **full session
invalidation** → 401 `Session invalidated. Please log in again.` — frontend
must hard-logout and route to login.

**Password change** (`PATCH /me/password`): verifies `currentPassword`, then
**revokes ALL refresh tokens** (every device, incl. caller) and clears the
cookie. Treat a 200 here as a forced logout.

**Admin OTP login:** `POST /auth/admin/login` returns **either**
`LoginResponseDto` (OTP off) **or** `AdminLoginChallengeResponseDto`
`{ otpRequired: true, challengeId, expiresInSeconds }` (OTP on — default in
prod/staging, no cookie/tokens on the challenge). `POST /auth/admin/login/otp`
`{ challengeId, code (6 digits) }` → `LoginResponseDto` + sets cookie
(single-use, 5-min expiry, ≤5 attempts). New statuses: 503 "OTP email could
not be sent — retry"; 401 invalid/expired/exhausted challenge. Dedicated
`POST /auth/admin/refresh` / `/auth/admin/logout` exist — **open question**
whether admin sessions must use these vs. the shared `/auth/refresh` (shipped
FE uses the shared endpoint; flagged for the pending C1 security review).
