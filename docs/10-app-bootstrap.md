# 10 — Application Bootstrap & Foundation

> **Audience**: Engineering. **Scope**: How the workspace was scaffolded in Epic 2 and the
> concrete pieces every developer needs in order to run, build, and extend the app. This
> document captures the *as-built* state — when the code disagrees with this doc, the doc
> is the source of truth and the code should be reconciled by PR.

---

## 1. Versions & toolchain

| Item | Pinned to | Notes |
| --- | --- | --- |
| Angular | **21.2.x** | Standalone components, signals, zoneless change detection. |
| TypeScript | 5.9.x | `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. |
| Tailwind CSS | **v4** (`tailwindcss` + `@tailwindcss/postcss`) | CSS-first config via `@theme` in `src/styles.css`. **No** `tailwind.config.*` file. |
| RxJS | 7.8.x | Used for HTTP plumbing only. Components consume signals. |
| ESLint | 10.x flat config (`eslint.config.js`) | `angular-eslint` 21.x, `typescript-eslint` 8.x, `eslint-config-prettier`. |
| Prettier | 3.x | Repo-wide formatting. |
| Husky | 9.x | `pre-commit` → `lint-staged`; `commit-msg` → `commitlint`. |
| commitlint | 20.x with `@commitlint/config-conventional` | Enforces Conventional Commits. |
| Node | **≥ 20.19** | Set in `package.json` `engines`. |
| Package manager | **npm 10.x** | `packageManager` field in `package.json`. |

> The CLAUDE.md "Stack" section names Angular 21 / Tailwind v4. Any divergence found in
> code review must update the code, not this row.

---

## 2. Workspace layout

```
.
├── angular.json                    # Builder + bundle budgets + env file replacements
├── package.json                    # Scripts + engines + deps
├── tsconfig.json                   # baseUrl + path aliases (compiler-wide)
├── tsconfig.app.json               # App-only TS settings
├── eslint.config.js                # Flat config; banned-pattern enforcement
├── commitlint.config.cjs           # Conventional Commits rules
├── .husky/                         # pre-commit + commit-msg hooks
├── public/                         # Static, served as-is
├── src/
│   ├── index.html
│   ├── main.ts                     # bootstrapApplication(App, appConfig)
│   ├── styles.css                  # Tailwind v4 @import + @theme tokens
│   ├── environments/
│   │   ├── environment.model.ts    # AppEnvironment interface
│   │   ├── environment.ts          # Default (dev) — replaced by builder per env
│   │   ├── environment.development.ts
│   │   ├── environment.test.ts
│   │   ├── environment.uat.ts
│   │   └── environment.production.ts
│   └── app/
│       ├── app.ts                  # Root component (template scaffolds dir/lang)
│       ├── app.config.ts           # Application providers (router, http, zoneless)
│       ├── app.routes.ts           # Top-level lazy routes + 404
│       ├── core/                   # Singletons — DI, no cross-feature reach-around
│       │   ├── auth/               # roleGuard (stub) + AppRole type
│       │   ├── http/               # provideAppHttp + 4 interceptors
│       │   ├── i18n/               # DirectionService (RTL/LTR + lang)
│       │   └── event-bus/          # AppEventBus typed pub/sub
│       ├── shared/                 # Cross-feature pure utilities, pipes, types
│       ├── ui/                     # In-house design-system primitives (ios-*)
│       ├── layouts/                # App shell, auth shell (planned)
│       └── features/               # Each feature is lazy-loaded
│           ├── auth/               # Sign in / register / password reset (epic 3)
│           ├── dashboard/          # Role-aware home (epic 4)
│           ├── courses/            # Course catalog + player (epic 5)
│           ├── assessments/        # Exam engine (epic 6)
│           ├── admin/              # Admin console (epic 7)
│           └── not-found/          # 404 page (already in place)
└── docs/                           # This folder. Numbered, signed off.
```

Cross-feature imports are **forbidden** (CLAUDE.md §5). The path alias map intentionally
omits `@features` (without `/*`) so the only way a feature can be referenced is via its
own folder name — barreling through `@features/index.ts` would invite reach-arounds.

---

## 3. Path aliases

Defined in `tsconfig.json` `compilerOptions.paths`:

| Alias | Resolves to |
| --- | --- |
| `@core` | `src/app/core/index.ts` |
| `@core/*` | `src/app/core/*` |
| `@shared` | `src/app/shared/index.ts` |
| `@shared/*` | `src/app/shared/*` |
| `@ui` | `src/app/ui/index.ts` |
| `@ui/*` | `src/app/ui/*` |
| `@layouts` | `src/app/layouts/index.ts` |
| `@layouts/*` | `src/app/layouts/*` |
| `@features/*` | `src/app/features/*` |
| `@env/*` | `src/environments/*` |

ESLint's `no-restricted-imports` rule blocks `@features` (without the `/*`) and any
relative path that climbs out of the current feature folder.

---

## 4. App bootstrap

`src/main.ts` calls `bootstrapApplication(App, appConfig)`.

`src/app/app.config.ts` is the single place where application-level providers are wired.
The provider list, in order, is:

1. `provideZonelessChangeDetection()` — kills Zone.js. Components must use signals or
   `OnPush` + `markForCheck()`.
2. `provideBrowserGlobalErrorListeners()` — surfaces uncaught errors to the platform.
3. `provideRouter(routes, withComponentInputBinding(), withViewTransitions())` — routes
   live in `app.routes.ts`; component inputs bind to URL params; the View Transitions API
   provides a soft cross-route fade.
4. `provideAppHttp()` — wraps `provideHttpClient(withFetch(), withInterceptors([...]))`
   with the four interceptors from `core/http/`.

Any future provider that touches auth, http, or CSP requires architect + security review
(CLAUDE.md §13).

---

## 5. Routing

Top-level routes are declared in `src/app/app.routes.ts`. Every feature is **lazy-loaded**
and gated by `roleGuard` from `core/auth/`:

| Path | Loads | Allowed roles |
| --- | --- | --- |
| `/` | Empty children (placeholder; will redirect to `/dashboard` once the dashboard ships its first page) | — |
| `/auth` | `@features/auth/auth.routes` | (public) |
| `/dashboard` | `@features/dashboard/dashboard.routes` | learner, instructor, admin, support |
| `/courses` | `@features/courses/courses.routes` | learner, instructor, admin, support |
| `/assessments` | `@features/assessments/assessments.routes` | learner, instructor, admin, support |
| `/admin` | `@features/admin/admin.routes` | admin, support |
| `**` | `@features/not-found/not-found.page` (lazy `loadComponent`) | — |

`roleGuard` is currently a stub (returns `true`, logs a TODO). The signature is final, so
feature routes wire it now and the body lands in epic 3 alongside `AuthStore`. This avoids
churn on routes when RBAC is finalised.

---

## 6. HTTP plumbing

`core/http/index.ts` exports `provideAppHttp()` which composes `provideHttpClient(...)`
with **four interceptors in a fixed order**:

```
auth → locale → retry → error
```

The order is locked by the SOW security model — any change requires architect + security
review (CLAUDE.md §13).

| Interceptor | Responsibility | Stub status |
| --- | --- | --- |
| `auth.interceptor` | Adds `Authorization: Bearer …` from `AuthStore`. Honors `SKIP_AUTH` `HttpContextToken` for refresh / public endpoints. | Stub — token wiring lands in epic 3. |
| `locale.interceptor` | Adds `Accept-Language` based on `DirectionService.locale()`. | Active. |
| `retry.interceptor` | Exponential backoff for idempotent verbs (`GET`/`HEAD`/`OPTIONS`/`PUT`/`DELETE`) on transient 5xx + network errors. Honors `SKIP_RETRY`. | Active. |
| `error.interceptor` | Redacts URLs, logs once with correlation id, re-throws untouched for caller `catchError`. Honors `SKIP_ERROR_REPORT`. | Active. |

The interceptors are kept thin and side-effect-free (apart from logging) so unit testing
them later is straightforward.

---

## 7. Environments

Four configurations are wired in `angular.json` via `fileReplacements`:

| `ng build --configuration=` | File replacement |
| --- | --- |
| `development` (default for `ng serve`) | `environments/environment.ts` → `environments/environment.development.ts` |
| `test` | `environment.ts` → `environment.test.ts` |
| `uat` | `environment.ts` → `environment.uat.ts` |
| `production` (default for `ng build`) | `environment.ts` → `environment.production.ts` |

Every config file conforms to the `AppEnvironment` interface in `environment.model.ts`:

```ts
export interface AppEnvironment {
  readonly name: 'development' | 'test' | 'uat' | 'production';
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly wsBaseUrl: string;
  readonly verboseLogging: boolean;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly monitoringDsn?: string;
}
```

Application code imports from `@env/environment` only — never directly from a per-env
file. The builder handles the swap.

---

## 8. Bundle budgets

Defined in `angular.json` for `production` config:

| Bundle | Warn | Error |
| --- | --- | --- |
| Initial (gzip) | 300 kB | 500 kB |
| Per lazy chunk (gzip) | 100 kB | — |
| Component styles | 4 kB | 8 kB |

Loosening any of these is a regression and requires explicit user direction
(CLAUDE.md §13).

---

## 9. Styling: Tailwind v4 + design tokens

`src/styles.css` is the single global stylesheet. Its structure:

1. `@import "tailwindcss";` — pulls Tailwind v4's preflight + core utilities.
2. `@theme { … }` — design tokens scoped to the `ios-*` namespace:
   - Color ramps: `--color-ios-primary-{50..950}`, surface, fg, fg-muted, success,
     warning, danger, info.
   - Fonts: `--font-sans`, `--font-arabic`, `--font-mono`.
   - Radii: `--radius-sm/md/lg/xl`.
   - Easing: `--ease-ios`.
3. `@layer base { … }` — body defaults, `:focus-visible` ring, `html[lang='ar'] body`
   font swap, `prefers-reduced-motion` overrides.

**RTL/LTR is data-driven, not stylesheet-driven.** Components compose with logical
utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) so flipping the
direction is `<html dir="rtl">` and nothing else. Tailwind v4 `rtl:` and `ltr:` variants
are available for the rare cases where a logical utility doesn't fit (e.g. mirrored icon).

`core/i18n/DirectionService` owns the `<html dir>` and `<html lang>` attributes. It exposes
`locale()` and `direction()` signals plus `setLocale(loc)` / `toggle()`. The locale
interceptor reads from it, so changing locale updates outgoing `Accept-Language` headers
without an extra subscription.

---

## 10. Linting & formatting

`eslint.config.js` (flat config) enforces every banned pattern in CLAUDE.md §4:

- Component selectors **must** start with `ios-` (`@angular-eslint/component-selector`).
- `OnPush` is required; `prefer-standalone`, `prefer-signals`, `prefer-inject` enabled.
- `no-explicit-any` is on; opt-out requires a `// FIXME(any):` comment with architect sign-off.
- `no-restricted-imports` blocks Material, PrimeNG, NG-Zorro, NgRx, Akita, NGXS, and
  cross-feature imports (`@features` without `/*` and any `../` climb out of a feature).
- `no-restricted-globals` blocks `localStorage` / `sessionStorage` (storage policy lives
  in `06 §2.7.1`).
- `no-restricted-syntax` blocks `bypassSecurityTrust*`, `setInterval`, and any direct
  call to `subscribe()` on a component. Use `toSignal()` or the `async` pipe instead.
- Template rules: `@angular-eslint/template/prefer-control-flow`,
  `prefer-self-closing-tags`, `eqeqeq`, plus the accessibility ruleset.

Prettier handles formatting. ESLint and Prettier are decoupled via
`eslint-config-prettier` (Prettier owns whitespace; ESLint owns code rules).

---

## 11. Git workflow

Branching: **GitHub Flow**, documented in `CONTRIBUTING.md`. Branches off `main`,
PR back to `main`, squash-merge.

Branch naming: `<type>/<short-kebab-summary>` (e.g. `feat/exam-runner-heartbeat`).

Commit messages: Conventional Commits, enforced by `commitlint` via the `commit-msg`
Husky hook. Allowed types: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `test`,
`build`, `ci`, `style`, `revert`.

Husky `pre-commit` runs `lint-staged`:
- `*.{ts,html}` → `eslint --fix`
- `*.{ts,html,css,scss,json,md,yml,yaml}` → `prettier --write`

Run `npm run prepare` once after `npm install` if hooks aren't picked up automatically.

---

## 12. Scripts

Authoritative list lives in `package.json`. Cheat sheet:

| Command | Purpose |
| --- | --- |
| `npm start` | Dev server (`ng serve --configuration=development`). |
| `npm run build` | Production build (default). |
| `npm run build:dev` / `:test` / `:uat` | Build per environment. |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.app.json`. |
| `npm run lint` / `npm run lint:fix` | ESLint flat config. |
| `npm run format` / `:check` | Prettier. |
| `npm run analyze` | Production build with `--stats-json`, opens `webpack-bundle-analyzer`. |
| `npm test` | No-op (testing deferred per SOW §6.2.14). |

---

## 13. What lands later (intentionally deferred)

| Item | Lands in | Why deferred |
| --- | --- | --- |
| `AuthStore` (signal-based access token + refresh flow) | Epic 3 | Real shape needs the auth API to settle. |
| `roleGuard` body | Epic 3 | Depends on `AuthStore`. |
| Transloco | Epic 4 | Needs translator workflow + EN/AR copy from product. |
| App shell (header, sidebar, command palette) | Epic 4 | Depends on `AuthStore` for the user menu. |
| Tests | Per SOW §6.2.14 | Contractual follow-up risk. Code stays test-ready (DI, no static state, deterministic stores). |
| AES-GCM exam-draft encryption | Epic 6 | Optional per `09 §7`; ships with the exam runner. |
| Bundle analyzer in CI | Epic 8 (release engineering) | First needs a CI pipeline. |

When any of these land, this section moves the entry into the relevant section above and
deletes it from the deferred list.

---

## 14. Cross-references

- CLAUDE.md (operating manual) — `/CLAUDE.md`
- Project structure & architecture — [`01-project-structure-architecture.md`](./01-project-structure-architecture.md)
- Engineering guidelines — [`05-engineering-guidelines.md`](./05-engineering-guidelines.md)
- Performance, security, accessibility — [`06-performance-security-accessibility.md`](./06-performance-security-accessibility.md)
- Authentication & authorization — [`08-authentication-authorization.md`](./08-authentication-authorization.md)
- Exam engine — [`09-exam-engine.md`](./09-exam-engine.md) *(planned slot)*
- Branching & commit conventions — [`/CONTRIBUTING.md`](../CONTRIBUTING.md)
