# CLAUDE.md — Institute of Scrum (IOS) LMS Frontend

> Operating manual for Claude when working in this repository. Concise by design — when you need depth, follow the pointer to the right doc in `/docs`.

---

## 1. What this project is

Frontend (Angular 19 + Tailwind CSS) for the **Institute of Scrum (IOS) Learning Management System**. SOW v1.0 dated 2025-10-27. Bilingual EN + AR with full RTL. Browser-only (CSR — no SSR). Three primary user types: learners, instructors, admins (plus a read-only `support` role).

> The project is for **Institute of Scrum (IOS)**. The old "CIPM" naming is from a previous, on-hold project — never reintroduce it.

---

## 2. Read these before you change anything

The `/docs` folder is the **single source of truth**. Whenever you touch a feature area, read the matching doc first.

| Touching… | Read |
| --- | --- |
| Anything | `/docs/README.md` (decisions summary, index) |
| Workspace layout, routing, env config, app bootstrap | `/docs/01-project-structure-architecture.md` |
| New UI primitive or composite | `/docs/02-component-design-reusability.md` |
| Stores, signals, derived state, RxJS bridging | `/docs/03-state-management.md` |
| HTTP, interceptors, DTOs, WebSockets | `/docs/04-api-integration-data-flow.md` |
| Anything (PR rules, naming, commits, code review) | `/docs/05-engineering-guidelines.md` |
| Performance budgets, security, a11y, RTL | `/docs/06-performance-security-accessibility.md` |
| Login, refresh flow, RBAC, guards | `/docs/07-authentication-authorization.md` |
| Exam runner, IndexedDB, heartbeat, sync queue | `/docs/08-exam-engine.md` |

For non-technical context, see `/docs/00-executive-overview.md` (don't reinvent its claims; it's been signed off).

---

## 3. Stack — non-negotiable decisions

- **Angular 21** (latest stable as of Epic 2 — 21.2.x), **Standalone components**, **Signals**, **CSR only**.
- **Tailwind CSS v4** with a **custom in-house component library** under the `ios-` prefix. CSS-first config via `@theme` in `src/styles.css`. **No** Material, PrimeNG, NG-Zorro.
- **State**: Angular Signals + injectable services. **No** NgRx, Akita, NGXS.
- **Forms**: Typed Reactive Forms with `NonNullableFormBuilder`. Zod for cross-field validation.
- **Templates**: New control flow only — `@if`, `@for`, `@switch`, `@defer`. **Never** `*ngIf`, `*ngFor`, `*ngSwitch`, `ngClass`, `ngStyle`.
- **Change detection**: `OnPush` everywhere. `provideZonelessChangeDetection()` in `app.config.ts`.
- **i18n**: Transloco (planned, lands in a later epic). `<html dir="…" lang="…">` is owned by `core/i18n/DirectionService`. Logical CSS only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`); Tailwind v4 `rtl:` and `ltr:` variants are available for direction-specific overrides.
- **Auth**: JWT access **in memory**; refresh in **httpOnly Secure SameSite=Strict cookie**. Rotation on every refresh. RBAC via `roleGuard` (in `core/auth/`) and `*hasRole`.
- **API**: Hybrid — REST for CRUD, WebSockets for notifications + exam sessions. HTTP plumbing wired via `provideAppHttp()` in `core/http/` (interceptor order locked: auth → locale → retry → error).
- **Testing**: deferred per SOW §6.2.14 risk; code must remain test-ready.

---

## 4. Banned patterns (CI / review will reject these)

| Banned | Use instead |
| --- | --- |
| `*ngIf`, `*ngFor`, `*ngSwitch` | `@if`, `@for (… ; track …)`, `@switch` |
| `ngClass`, `ngStyle` | `[class.x]="…"`, `[style.x]="…"`, or `computed()` returning class strings |
| `localStorage` / `sessionStorage` for tokens, PII, exam answers | In-memory signals (tokens), httpOnly cookie (refresh), IndexedDB (exam answer drafts only — see `09`) |
| `bypassSecurityTrustHtml/Style/Script/Url/ResourceUrl` | Sanitised content via `DomSanitizer` allow-lists. Architect ADR required for any exception. |
| `[innerHTML]` without sanitiser allow-list | Component composition |
| `.subscribe()` inside components | `toSignal()`, or `async` pipe in narrow cases |
| Any `import` from a sibling feature folder | Import from `core/` or `shared/`; coordinate via DI / event bus |
| Hardcoded colors / hex in templates | Tailwind tokens (see `02 §6`) |
| Hardcoded API URLs | `environment.apiBaseUrl` / `environment.wsBaseUrl` |
| `outline: none` without a replacement focus ring | `:focus-visible` ring (every interactive control) |
| `setInterval` for the exam timer | Read `serverTick()` from the exam WebSocket (see `09 §6.3`) |
| Computing scores / grading on the client | Backend authoritative — display only |
| Logging tokens, passwords, PII | Strip in `errorInterceptor` before reporting |
| `Material` / `PrimeNG` / `NG-Zorro` imports | Build the primitive in `ui/` per `02` |
| `any` (without a `// FIXME(any):` justification reviewed by an architect) | Real types; generate from OpenAPI when available |
| Text colors that fail 4.5:1 contrast | Use design-system tokens; verify with axe |

---

## 5. Naming, structure, conventions

- **Component prefix**: every component selector is `ios-*` (`ios-button`, `ios-course-card`). Enforced by `@angular-eslint/component-selector`.
- **File names** — Angular 21 **2025 style guide** (no type suffix for components/directives/pipes/services/guards):
  - Components: `app.ts`, `login.page.ts`, `course-card.ts`
  - Directives / pipes: `auto-focus.ts`, `localized-date.ts`
  - Guards: `role.guard.ts` (kebab-case with `.guard` is acceptable for clarity, the 2025 style guide is silent on guards)
  - Custom suffixes that the project keeps because they're domain markers, not type markers: `*.store.ts`, `*.api.ts`, `*.model.ts`, `*.dto.ts`, `*.mappers.ts`, `*.routes.ts`, `*.ws.ts`, `*.tokens.ts`, `*.interceptor.ts`
- **TypeScript path aliases** (defined in `tsconfig.json`): `@core`, `@core/*`, `@shared`, `@shared/*`, `@ui`, `@ui/*`, `@layouts`, `@layouts/*`, `@features/*`, `@env/*`. Note that `@features` (without `/*`) is intentionally **not** defined — that would invite cross-feature imports.
- **Folders** under `src/app/`:
  ```
  core/         # singletons: auth, http, idle, network, error, i18n, event-bus
  shared/       # cross-feature pure utilities, pipes, directives, types
  ui/           # the in-house design-system primitives (ios-button, ios-input, …)
  layouts/      # app shell, auth shell
  features/<feature>/
    data-access/        # api, store, dto, mappers, model, ws
    pages/              # smart components (route entries)
    components/         # feature-local presentational components
    guards/             # canActivate, canMatch
    resolvers/          # route resolvers (rare)
    utils/              # pure helpers scoped to this feature
    <feature>.routes.ts # exported as default for loadChildren
  ```
- **Cross-feature imports are forbidden.** A feature talks to another feature only through `core/` (DI singleton) or `core/event-bus/AppEventBus`.
- **Stores**: private writable signals; expose `.asReadonly()` views and `computed()` derivations; mutate via action methods only.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `perf:`, `chore:`, `docs:`, `test:`, `build:`, `ci:`, `style:`, `revert:`). Enforced by Husky `commit-msg` + commitlint. Reference an issue when applicable. See `CONTRIBUTING.md` for the full GitHub Flow workflow.

---

## 6. Architecture in one paragraph

A single Angular app, lazy-loaded per feature route. App shell loads only `core/` + the active route. `core/auth/AuthStore` holds the access token in a signal; the refresh cookie is invisible to JS. Every HTTP request flows through four interceptors in order: `auth → locale → retry → error`. Feature stores own server state via signals; derived state is `computed`; side effects use `effect`. WebSockets handle notifications and exam sessions; the exam channel emits a 30-second heartbeat. Exam answers are buffered in IndexedDB and synced idempotently to the backend with a per-answer `clientSeq`. The backend is the only source of truth for grading, time, and authorization.

---

## 7. Performance commitments — never weaken these

- Initial load FCP ≤ 1.8 s, LCP ≤ 2.5 s, end-to-end "first usable" ≤ 3 s on 4G mid-range mobile.
- Initial JS bundle (gzip): warn at **300 KB**, error at **500 KB**.
- Per lazy route chunk: ≤ 100 KB gzip.
- INP ≤ 200 ms, CLS ≤ 0.1.
- New library to the **app shell** with > 30 KB gzip impact requires architect signoff. Heavy libs go behind `loadComponent` / `loadChildren` / `@defer`.
- `@for` always uses `track`. Lists > 100 items use `cdk-virtual-scroll`.
- Images: `loading="lazy"` (unless above the fold), `decoding="async"`, explicit `width`/`height`.

Full budgets: `06 §1`. Bundle config in `angular.json` per `06 §1.2`.

---

## 8. Security commitments — never weaken these

- HTTPS everywhere; HSTS at origin.
- CSP enforced (no `'unsafe-inline'` for scripts, no `'unsafe-eval'`). See `06 §2.4` for the canonical CSP.
- Access token in-memory only. Refresh token in httpOnly Secure SameSite=Strict cookie. **Never** `localStorage`/`sessionStorage` for tokens.
- IndexedDB is permitted **only** for exam answer drafts (see `06 §2.7.1` storage policy table). No tokens, no PII, no payment data.
- Optional client-side AES-GCM encryption for high-stakes exam drafts, with a non-extractable per-session key (see `09 §7`).
- Frontend is **not** a security boundary. Every protected action is re-authorized server-side. RBAC on the frontend hides UI; it does not enforce.
- Step-up re-auth required for: change email/password, account delete, certification issue/revoke, role promotion (`08 §3.6`).
- Any change to `core/auth/`, `core/http/`, or CSP requires architect + security review (`06 §2.11`).

---

## 9. Accessibility commitments — never weaken these

- WCAG 2.1 AA. Target axe / Lighthouse a11y ≥ 95 with **zero serious/critical** issues.
- Every interactive element keyboard-operable. `:focus-visible` ring on every control.
- Semantic HTML first; ARIA only when semantics insufficient. Follow APG patterns for composites.
- Focus management: on route change move focus to page heading; on dialog open trap and on close restore.
- Form fields have **visible labels**, not placeholder-only. Errors via `aria-describedby` + `aria-live="polite"`.
- Mirrored icons in RTL. `dir="auto"` for bidi paragraphs. Language attribute set on `<html>` when toggled.
- Arabic translations are **professionally reviewed**, never machine-translated for shipped content.

---

## 10. The exam engine — extra discipline

The exam runner is the highest-stakes feature. Read `09 — Exam Engine` end-to-end before changing anything in `features/assessments/`.

- The 30-second heartbeat must remain. Two consecutive missed pongs (>70 s) force a reconnect.
- `clientSeq` is monotonic per session. The backend is idempotent on `(sessionId, questionId, clientSeq)`.
- Submit is blocked while `pendingOps.length > 0` or `syncStatus !== 'synced'`. Don't bypass.
- The exam timer is read from `serverTick()`. Never anchor to a local clock.
- IndexedDB drafts are deleted on confirmed final submit. A defensive sweep prunes rows older than 7 days on app boot.
- The standing acceptance scenario is a **~60-second** offline window. It must pass for any release that touches the exam engine (`09 §8`).

---

## 11. Workflow — what to do before / during / after a change

**Before**

1. Identify the feature area and read the matching doc(s) above.
2. If the change affects auth, exam, perf budget, CSP, or i18n — flag it for architect review in the PR description.
3. Confirm the change does not introduce a banned pattern from §4.

**During**

1. Stay within the feature folder. If you need cross-feature data, route it through `core/`.
2. Add new types to `*.model.ts`, new DTOs to `*.dto.ts`, new mappers to `*.mappers.ts`.
3. Components: signal inputs (`input()`), signal outputs (`output()`), `model()` for two-way. `OnPush`. No `subscribe()`.
4. Strings shown to users go through Transloco. Provide both EN and AR keys.
5. New UI: keyboard + screen-reader pass before considering it done. LTR + RTL screenshots in the PR.

**After**

1. Run lint and the type-checker (commands below). Both must be clean.
2. If accessibility-affecting: axe DevTools on the changed screen; manual keyboard walk; LTR + RTL screenshots.
3. If perf-affecting: include bundle-size delta and any new dependency's gzip cost in the PR.
4. If exam-affecting: run the §10 acceptance scenario locally (DevTools → Offline ~60 s).
5. If auth-affecting: simulate parallel 401s to validate refresh-race behaviour.
6. PR description follows the template in `05 §10`.

---

## 12. Commands

The workspace was scaffolded in Epic 2 with Angular CLI 21.2 + npm 10. Node ≥ 20.19 required.

```bash
# Install
npm install                          # first time and after package.json changes
npm ci                               # CI / clean install from lockfile

# Dev server (uses environment.development.ts)
npm start                            # ng serve --configuration=development

# Build
npm run build                        # production (default) — replaces env with environment.production.ts
npm run build:dev
npm run build:test                   # → environment.test.ts
npm run build:uat                    # → environment.uat.ts

# Type check
npm run typecheck                    # tsc --noEmit -p tsconfig.app.json

# Lint (flat config, eslint.config.js)
npm run lint                         # report
npm run lint:fix                     # auto-fix what's safe

# Format (Prettier)
npm run format                       # write
npm run format:check                 # CI mode

# Bundle analysis
npm run analyze                      # ng build --stats-json + webpack-bundle-analyzer

# Tests (deferred per SOW §6.2.14 — script is a no-op for now)
npm test
```

Husky hooks: `pre-commit` runs `lint-staged` (Prettier + ESLint on staged files); `commit-msg` runs commitlint to enforce Conventional Commits. Run `npm run prepare` once to install hooks if they aren't picked up automatically.

---

## 13. Files Claude should never edit casually

- `/docs/*.md` — these have been reviewed and signed off. Treat as protected. Any change to a doc requires a separate, explicit user request and updates the README's decisions table if the change affects a stated decision.
- Anything under `core/auth/`, `core/http/`, or CSP config — architect + security review required (`06 §2.11`).
- `angular.json` performance budgets — only with explicit user direction; loosening them is a regression.
- `environment.*.ts` files — only with explicit user direction.
- License headers, `LICENSE`, `NOTICE` — never touch.

---

## 14. When you're unsure

- Default to the more restrictive interpretation of any rule (smaller bundle, stricter CSP, more conservative storage).
- If the docs and the code disagree, the **docs** are the source of truth — fix the code or open a PR to reconcile, but do not silently diverge.
- If a third-party library appears tempting, audit for: bundle size (gzip), RTL support, accessibility, license, maintenance status. If any is missing, prefer building the primitive in `ui/`.
- If a change crosses two feature areas, factor through `core/` rather than importing across features.
- Ask the user before introducing any new dependency that adds > 30 KB gzip or that touches auth/security paths.

---

## 15. Project context (one-glance summary)

- **Client**: Institute of Scrum (IOS).
- **SOW**: v1.0, 2025-10-27. Performance ≤ 3 s, uptime 99.9%, WCAG 2.1 AA, OWASP Top-10, GDPR + PIPEDA.
- **Languages**: English + Arabic (RTL from day one).
- **Browsers**: latest 2 versions of Chrome, Edge, Safari, Firefox + mobile Safari/Chrome.
- **Environments**: DEV / TEST / UAT / PROD with CDN and feature flags.
- **Warranty**: 180 days post-launch; critical/high defects ≤ 48 h turnaround.
- **Open risks**: testing deferred; SSR not selected (SEO trade-off); exam engine is the highest-stakes surface.

---

## 16. Quick links

- Index: [`/docs/README.md`](./docs/README.md)
- Executive overview (non-technical): [`/docs/00-executive-overview.md`](./docs/00-executive-overview.md)
- Engineering guidelines (PR checklist, banned patterns in detail): [`/docs/05-engineering-guidelines.md`](./docs/05-engineering-guidelines.md)
- Auth: [`/docs/08-authentication-authorization.md`](./docs/08-authentication-authorization.md)
- Exam engine: [`/docs/09-exam-engine.md`](./docs/09-exam-engine.md)
