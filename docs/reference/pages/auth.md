# Auth Pages

`features/auth`, 6 pages + redirect, lazy at `/auth`, `canMatch: publicOnlyGuard`.

## Route → backend map

| Route | Page | Backend call |
| --- | --- | --- |
| `/auth` → `/auth/login` | *(redirect)* | — |
| `/auth/login` | `login.page` | `POST /auth/login` |
| `/auth/register` | `register.page` | `POST /auth/register` |
| `/auth/forgot-password` | `reset-password.page` | `POST /auth/forgot-password` |
| `/auth/new-password` | `new-password.page` | `POST /auth/reset-password` |
| `/auth/verify-email` | `verify-email.page` | `POST /auth/verify-email`, `POST /auth/resend-verification` |
| `/auth/complete-account` | `complete-account.page` | **Not wired (stub)** — blocked by BE-I-25, see [`../backend/open-issues.md`](../backend/open-issues.md) |
| (app boot / 401) | `AuthStore` | `POST /auth/refresh` · `POST /auth/logout` |

## Details

**`/auth/login`.** `AuthStore.login()` → `POST /auth/login`, then
`navigateByUrl(returnUrl ?? '/dashboard')`. Reads `?reason=` (idle/
refresh-failed/forced banners), `?returnUrl=`, `?registered=1`. Social
buttons (`onSocialLogin`) are no-ops — no OAuth handoff exists on the backend.

**`/auth/register`.** `POST /auth/register`, then navigates to
`/auth/login?registered=1` — **the backend issues no session on register**
(no auto-login, this was a deliberate change from the old mock behaviour).
**Dead link:** the privacy checkbox links `routerLink="/privacy"` but the
real route is `/privacy-policy` — falls to the 404 page.

**`/auth/complete-account` — the biggest stub.** A ~1000-line 3-step wizard
with fully-built forms (`DAYS`/`YEARS`/`CITIES`/`COUNTRIES`/`OCCUPATIONS`/
`POSITIONS`/`PHONE_COUNTRIES` constants). Step 3's `onSubmit` validates then
does exactly one thing — `navigateByUrl('/dashboard')`. No store, no API.
Blocked by **BE-I-25** (no DOB field). Independently, the page is an
**orphan**: nothing navigates to it, and `publicOnlyGuard` would bounce a
just-registered signed-in user away from it anyway even if it were linked.

**`/auth/verify-email` and `/auth/new-password`.** Both reached exclusively
via an emailed link carrying `?token=`. Verify-email calls
`POST /auth/verify-email` in the constructor, falls back to resend
(`POST /auth/resend-verification`) when the token is absent. New-password
requires a non-blank `?token=`, posts `POST /auth/reset-password`. Both
correctly wired.

## `publicOnlyGuard` scope note

Covers all of `/auth/*`, so a signed-in user cannot reach
`/auth/verify-email` or `/auth/complete-account`. Fine for verify-email
(unauthenticated flow by design); would be fatal for complete-account if it's
ever meant to run immediately post-registration (registration currently
routes to `/auth/login`, not this wizard, so it's moot today).
