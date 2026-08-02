# Frontend Data-Access Patterns & Working Rules

> Read this before building or reviewing any feature. These are the
> conventions every shipped feature (admin B1–B8, user-facing A1–A7, real-exam,
> courses, mock-exam, blog) follows.

## Feature layering

`data-access/<feat>.{dto,model,mappers,api,store}.ts`:

- **`.dto.ts`** — wire shapes, mirror backend names verbatim (incl. envelope: bare / `{ data }` / `{ data, meta }`).
- **`.model.ts`** — frontend domain types. Nullable fields stay nullable (UI renders an explicit "Not set" rather than coercing).
- **`.mappers.ts`** — dto ↔ domain. Draft→body builders decide what to omit vs. send-as-`null` (create typically omits blank optionals; update typically sends `null` to clear a field, since "send nothing" often means "leave unchanged" server-side — verify per endpoint).
- **`.api.ts`** — `@Injectable`, `HttpClient`, `environment.apiBaseUrl`. Observables only — never leak into components.
- **`.store.ts`** — signal store: private writable signals, `.asReadonly()` views, action methods (`firstValueFrom`, not `.subscribe()` in components). Root singleton unless the feature needs route-scoping (e.g. exam session store/WS, provided per `/run/:sessionId` so a fresh instance exists per attempt and is destroyed on route exit).

## Pagination

Backend is **cursor/keyset**, never offset, no total count. Reuse
`@core/http` `pagination.ts`: `toPage()`, `toHttpParams()`, `Page<T>`,
`PagedResponse<T,M>`, `CursorQuery`. Store pattern:
`items/loading/loadingMore/error/nextCursor/hasMore` + a `search`/filters
object; `load()` / `loadMore()`.

## Errors

Surface `problemDetailMessage(err)` (`@core/http`) inline; fall back to an
i18n string. Backend errors are RFC-7807 (`{ detail, title, code, errors[] }`)
— branch on `code`/`errors[]`, **not** HTTP status alone (see
[`../backend/api-conventions.md`](../backend/api-conventions.md)).

## Route params

Read from `route.snapshot.paramMap`, **not** a signal `input('')`. With
`withComponentInputBinding()` an absent optional param resolves to
`undefined`, not the default — this crashed the catalog form once
(`isEdit`'s `id().length` threw on `/new`) and hardened the same way in
`new-password.page.ts`'s `token()` read. Child-component `[input]` bindings
from a parent are fine as `input.required<T>()`.

## RBAC

Hide actions with `auth.hasRole('super_admin') || auth.hasAnyRole([…])`
(`super_admin` sees everything — there is **no** numeric role hierarchy on the
backend; `learning_admin` does not implicitly inherit `content_creator`, both
are listed explicitly wherever both are allowed). The backend still enforces
independently. Admin nav (`components/admin-layout.ts`) is role-filtered —
register each new page's nav item there.

## Admin routing

`features/admin/admin.routes.ts`: `/admin/login` is public (`adminLoginGuard`);
everything else sits under the shell, gated by `adminAuthGuard` (unauth →
`/admin/login?returnUrl=<absolute>`; non-admin → `/forbidden`). Build
`returnUrl` from `router.getCurrentNavigation().extractedUrl` (absolute), not
the guard's `segments` (relative to the `/admin` mount — a past bug sent
`/admin/catalog` redirects to a non-existent `/catalog`). Add new pages as
children of the `''` (shell) route.

## Admin lists show active-first

Client-side stable sort (active rows before inactive) — the backend only
sorts by `created_at`. Apply to any future list with a status flag. Exception:
fully cursor-paginated infinite lists (e.g. issued-certificates) keep the
backend's newest-first order — re-sorting only the loaded pages of an
infinite list would mislead.

## Object-storage uploads (avatar / catalog images)

Presigned-URL pattern: request a signed PUT URL from the API (normal
authenticated call) → PUT the file bytes directly to storage → PATCH the
owning resource with the returned key/URL. The storage PUT must **bypass the
normal interceptor chain** — use a bare `HttpClient` built on `HttpBackend` so
no `Authorization`, `X-Lang`, or refresh cookie reaches the storage host, and
echo exactly the `requiredHeaders` the presign call returned (some flows sign
more than `Content-Type`, e.g. `x-amz-acl: public-read` — dropping an echoed
header fails the upload).

## Verification / commit workflow

- Build one page/slice → `npm run typecheck && npm run lint && npm run build`
  clean → update `docs/status/current-status.md` → **stop for review**.
- **Never commit without the user's explicit "commit."**
- `npm run build` runs the **development** configuration — use
  `npx ng build --configuration production` to check prod bundles/budgets.
- Known-benign warnings: 3 pre-existing `prefer-ngsrc` lint warnings, and a
  raw-size bundle-budget build warning (gzip initial size is what matters).
- Live browser/API testing needs real student/admin credentials against the
  deployed API — not available in-session; most work ships "not
  runtime-tested against api-dev."

## HTTP core

Four-interceptor chain: auth → locale → retry → error. Send `X-Lang` (locale)
and `Authorization: Bearer` (already wired); student endpoints are RLS-scoped
server-side. Every user-visible string goes through i18n (en/fr/ar); Arabic
needs professional review before shipping (CLAUDE.md §9).
