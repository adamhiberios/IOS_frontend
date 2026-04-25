# 05 — Frontend Engineering Guidelines

These are the coding standards, conventions, and workflow rules for the Institute of Scrum LMS frontend. They are intentionally opinionated to keep the codebase consistent. If you want to deviate, raise it in a PR description and get reviewer sign-off.

---

## 1. Tooling

| Tool               | Purpose                                | Config file                 |
| ------------------ | -------------------------------------- | --------------------------- |
| ESLint             | Lint TypeScript + Angular templates    | `.eslintrc.cjs`             |
| Prettier           | Code formatting                        | `.prettierrc`               |
| EditorConfig       | Editor consistency                     | `.editorconfig`             |
| Husky + lint-staged | Pre-commit hooks                      | `.husky/`, `package.json`   |
| commitlint         | Enforce commit message format          | `commitlint.config.cjs`     |
| TypeScript         | `strict: true`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes` | `tsconfig.json` |
| Angular CLI        | Build, lint, generate                  | `angular.json`              |

Recommended VS Code extensions: **Angular Language Service**, **ESLint**, **Prettier**, **Tailwind CSS IntelliSense**, **EditorConfig**.

---

## 2. Code Formatting

- **Prettier** is the sole source of truth for formatting. Every file is run through Prettier on save and pre-commit.
- **Line length**: 120 characters.
- **Quotes**: single quotes in TS, double quotes in HTML attributes (Prettier defaults).
- **Trailing commas**: `all`.
- **Semicolons**: always.
- **Arrow parens**: always.
- **Indentation**: 2 spaces (no tabs).

```json
// .prettierrc
{
  "printWidth": 120,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "always",
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "bracketSpacing": true,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

The `prettier-plugin-tailwindcss` plugin auto-sorts Tailwind classes into a canonical order — keep class lists consistent without manual ordering.

---

## 3. Naming Conventions

### 3.1 Files & folders

| Artifact                | Convention                             | Example                            |
| ----------------------- | -------------------------------------- | ---------------------------------- |
| Folders                 | `kebab-case`                           | `course-list/`, `exam-session/`    |
| Component files         | `kebab-case.component.ts`              | `course-card.component.ts`         |
| Page components         | `kebab-case.page.ts`                   | `course-list.page.ts`              |
| Directives              | `kebab-case.directive.ts`              | `has-role.directive.ts`            |
| Pipes                   | `kebab-case.pipe.ts`                   | `duration.pipe.ts`                 |
| Services / stores       | `kebab-case.service.ts` / `.store.ts`  | `courses.store.ts`                 |
| Guards                  | `kebab-case.guard.ts`                  | `auth.guard.ts`                    |
| Interceptors            | `kebab-case.interceptor.ts`            | `auth.interceptor.ts`              |
| Models / DTOs / mappers | `kebab-case.model.ts` / `.dto.ts` / `.mappers.ts` | `courses.model.ts`        |
| Routes                  | `kebab-case.routes.ts`                 | `courses.routes.ts`                |
| Tests (when added)      | `*.spec.ts`                            | `courses.store.spec.ts`            |

One primary export per file. The filename matches the kebab-case of the export's primary identifier.

### 3.2 Identifiers

| Item                         | Convention                              | Example                                 |
| ---------------------------- | --------------------------------------- | --------------------------------------- |
| Classes                      | `PascalCase`                            | `CourseListPage`, `CoursesStore`        |
| Interfaces / types           | `PascalCase`, no `I` prefix             | `Course`, `CourseFilters`               |
| Type aliases for unions      | `PascalCase`                            | `ButtonVariant`                         |
| Enums                        | `PascalCase`; avoid enums, prefer unions | `EnrollmentStatus` (prefer union)     |
| Variables & functions        | `camelCase`                             | `fetchCourses`, `isLoading`             |
| Constants (module scope)     | `UPPER_SNAKE_CASE`                      | `MAX_PAGE_SIZE`                         |
| Booleans                     | Prefix `is`, `has`, `can`, `should`     | `isLoading`, `hasCertificate`           |
| Private class members        | Leading `_` for backing signals only    | `_courses`, `_filters`                  |
| Component selectors          | `ios-kebab-case`                        | `ios-button`, `ios-course-card`         |
| Directive selectors          | `[iosCamelCase]` or `*iosCamelCase`     | `[iosAutoFocus]`, `*hasRole`            |
| Pipe names                   | `camelCase`                             | `duration`, `relativeTime`              |
| Translation keys             | `dot.delimited.lowercase`               | `courses.list.empty.title`              |
| Event names (outputs)        | Past-tense verb, `camelCase`            | `selected`, `pageChanged`, `submitted`  |

The `ios-` / `iosXxx` prefix stands for Institute of Scrum and prevents collisions with HTML elements and with any future third-party library we might adopt.

---

## 4. TypeScript Rules

1. **`strict: true`** plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`.
2. **No `any`.** Use `unknown` and narrow. If `any` is the only option, escalate to the architect; if approved, annotate with `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason`.
3. **No non-null assertions (`!`) on dynamic data.** Allowed on static, architect-reviewed cases (e.g., known template refs after view init).
4. **`readonly` everywhere it's not written**. Domain models should be deeply readonly. Use `Readonly<T>` and `ReadonlyArray<T>` on public API surfaces.
5. **Discriminated unions over enums** for state and events: `type Status = 'idle' | 'loading' | 'success' | 'error'`.
6. **Narrow at the boundary.** Zod-validate every payload that enters the app from untrusted sources (backend responses, `postMessage`, query params used for logic).
7. **No `enum`** — use union types + `as const` objects.
8. **`unknown` over `any` for errors**: `catch (err: unknown)`.
9. **Absolute imports** via path aliases (`@app/...`, `@ui/...`, `@shared/...`). No `../../../` chains.

```json
// tsconfig.json — paths
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@app/*":    ["app/*"],
      "@core/*":   ["app/core/*"],
      "@shared/*": ["app/shared/*"],
      "@ui/*":     ["app/ui/*"],
      "@layouts/*": ["app/layouts/*"],
      "@features/*": ["app/features/*"],
      "@env/*":    ["environments/*"]
    }
  }
}
```

---

## 5. Angular-Specific Rules

### 5.1 Templates

- Use the **new control flow**: `@if`, `@for`, `@switch`, `@defer`. `*ngIf`, `*ngFor`, `*ngSwitch` are banned in new code.
- Every `@for` must declare `track`: `@for (course of courses(); track course.id) { ... }`.
- Prefer **`@defer`** for heavy below-the-fold content (charts, rich editors) with `@placeholder` and `@loading`.
- Never embed **business logic** in templates — move to a `computed` or a component method that is itself a pure function.
- Never use `ngStyle`; use `ngClass` or bind explicit `[class.xxx]`.
- Do not use the `| async` pipe on signals. Call `sig()` directly.

### 5.2 Components

- `standalone: true` (default in Angular 19).
- `changeDetection: ChangeDetectionStrategy.OnPush`.
- Use **signal inputs / outputs / models** exclusively in new code.
- Use **`inject()`** rather than constructor DI: `private readonly api = inject(CoursesApi);`.
- Do **not** subscribe inside a component. Use signals or `takeUntilDestroyed()` if you must.
- A component's `selector` is always prefixed `ios-`.
- Component classes do not need the `Component` suffix, but filenames do (e.g., class `CourseCard` in file `course-card.component.ts`). This follows the Angular v19 style guide proposal.
  - *Existing code using `FooComponent` is acceptable; don't churn the name. Consistency within a file is what matters.*

### 5.3 Services & Stores

- `@Injectable({ providedIn: 'root' })` for singletons.
- Feature stores follow the [State Management §3](./03-state-management.md#3-the-store-pattern) pattern.
- Services do not touch the DOM. DOM work goes through Angular APIs (`Renderer2`, `ViewChild`) or a small platform-aware helper.

### 5.4 Routing

- Every route is lazy.
- Every route declares `title` (for `TitleStrategy`) and `data.roles` where relevant.
- Guards are standalone functional guards: `export const authGuard: CanActivateFn = () => { ... }`.

### 5.5 Forms

- Reactive Forms only. `NonNullableFormBuilder` preferred.
- Every form control declares an explicit type.
- Cross-field validation is encapsulated in a pure function and applied via `validators` on the group.

---

## 6. CSS & Tailwind Rules

1. **Tailwind utilities first.** SCSS is allowed only for genuinely dynamic or complex styles not expressible with Tailwind (complex keyframes, intricate pseudo-elements).
2. **Class order** is enforced by `prettier-plugin-tailwindcss`.
3. **No hardcoded colors**. Use tokens via `tailwind.config.ts` ([see 02 §6](./02-component-design-reusability.md#6-design-system--tokens)).
4. **Logical directions only**. Use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. Physical variants (`ml-*`, `pr-*`, `text-left`) are lint errors.
5. **`:focus-visible`** must be supported on every interactive element — default Tailwind focus rings are acceptable; invisible focus is not.
6. **No `!important`**. If specificity is an issue, rework the class order.
7. **Responsive design**: mobile-first. Use Tailwind breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) — don't mix custom media queries.

---

## 7. Accessibility in Code (checklist for every PR)

- Every interactive element is a real `<button>` or `<a>` — no clickable `<div>`s.
- Every form control has a `<label>` (or `aria-label` when truly label-less).
- Every `<img>` has `alt`; decorative images have `alt=""`.
- No `tabindex` > 0.
- Focus is never lost after a route change — send focus to the page heading via a `focusOnNavigation` utility.
- Live regions (`aria-live`) are used for toasts and async status updates.
- Keyboard parity: anything clickable must be operable with keyboard (Enter / Space) and visible focus.
- Color is never the only indicator of state — pair color with text/icon.
- Minimum contrast: 4.5:1 for normal text, 3:1 for large text and non-text.

Fuller rules in [06 — Performance, Security & Accessibility §3](./06-performance-security-accessibility.md#3-accessibility-wcag-21-aa).

---

## 8. Internationalization Rules

1. **Every user-visible string is translated.** Raw English strings in templates are a lint error.
2. **Keys are namespaced**: `courses.list.title`, `auth.login.submit`.
3. **No string concatenation** for translations — use placeholders: `transloco.translate('courses.enrolled_count', { count: 5 })`.
4. **Plurals**: use Transloco's `translocoPlural` API; never hand-roll pluralization.
5. **Dates & numbers**: format with `Intl.DateTimeFormat` / `Intl.NumberFormat` using the current locale. Do not roll custom format strings.
6. **Arabic numerals**: default to Western (`1234`) in dashboards/forms for clarity; allow Eastern Arabic (`١٢٣٤`) in purely Arabic content areas if design specifies.

---

## 9. Error & Logging Conventions

- Never `console.log` committed. Use `Logger` (wrapper around console that respects environment) from `core/logging/`.
- Log levels: `debug`, `info`, `warn`, `error`. `debug` is stripped in production.
- Never log tokens, PII, or full user objects. Log `userId` and `traceId` instead.
- Every caught error must be either re-thrown, converted to an `AppError`, or explicitly documented as ignored with a comment.

---

## 10. Git Workflow

### 10.1 Branching

- `main` — protected, production-ready. PRs only. Tagged on release.
- `develop` — integration branch for the current milestone. PRs only.
- `feature/<ticket-id>-<slug>` — feature work, branched from `develop`.
- `fix/<ticket-id>-<slug>` — bug fixes, branched from `develop`. Hotfixes branch from `main`.
- `chore/<slug>` — tooling, docs, non-feature changes.

### 10.2 Commit messages — Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `style`, `test`, `build`, `ci`, `revert`.

Examples:

- `feat(courses): add course-level filter dropdown`
- `fix(auth): refresh token flow races on rapid 401s`
- `perf(ui): memoize button variant class computation`
- `docs: add WebSocket reconnection strategy`

`commitlint` rejects non-conforming messages on pre-commit.

### 10.3 Pull requests

Every PR must:

1. Reference the ticket/issue ID in the title (`[LMS-123] feat(courses): ...`).
2. Fit within ~400 lines of diff (excluding generated code and snapshots). Bigger PRs are split.
3. Pass lint, Prettier, type-check, and build in CI.
4. Include screenshots (LTR + RTL) for any UI change.
5. Complete the PR checklist (template in `.github/PULL_REQUEST_TEMPLATE.md`).

### 10.4 PR review policy

- **At least one approving review** from a peer.
- For changes to `core/`, `ui/`, shared infrastructure, or this `/docs` directory — **architect review required**.
- Reviewer responsibilities: correctness, readability, a11y, RTL, performance, adherence to these guidelines. No rubber-stamp approvals.

### 10.5 PR checklist template (`.github/PULL_REQUEST_TEMPLATE.md`)

```
## Summary
<!-- What changed and why. Link the ticket. -->

## Screenshots (LTR & RTL)
<!-- Required for any UI change. -->

## Checklist
- [ ] Lint & format pass
- [ ] TypeScript strict build passes
- [ ] New UI strings are in the translation bundles (en + ar)
- [ ] Keyboard navigation verified
- [ ] RTL verified
- [ ] No `console.log` / `debugger` left behind
- [ ] No `any` / non-null assertions added without justification
- [ ] Bundle size budgets still green
- [ ] Docs updated if architecture/convention changed
```

---

## 11. Code Generation

Prefer Angular CLI schematics for consistent file layouts:

- `ng g c features/courses/components/course-card --flat=false --inline-template=false`
- `ng g s features/courses/data-access/courses-api`
- `ng g d shared/directives/has-role`

Project-specific schematics (e.g., "new feature with data-access + pages + routes scaffolding") may be added later as `tools/schematics/`. Until then, copy the feature template and rename — reviewer will confirm structure.

---

## 12. Performance Hygiene (enforced in review)

See [06 — Performance, Security & Accessibility §1](./06-performance-security-accessibility.md) for budgets. Quick checklist for every PR:

- No synchronous heavy work in `ngOnInit`; push to Web Workers or defer.
- `@for` lists have `track`.
- Images have `loading`, `decoding`, `width`, `height`.
- New dependency adds < 15 KB gzip (justify otherwise).
- Route chunks respect the 100 KB gzip budget.

---

## 13. Documentation Expectations

- Every `ui/` primitive has a `README.md` with: props table, events, slots, a11y notes, usage snippet, LTR & RTL screenshot.
- Every feature has a `README.md` summarizing its responsibility, public routes, and main data flow.
- Major decisions are captured as ADRs (see [01 §10](./01-project-structure-architecture.md#10-architecture-decision-records-adrs)).
- JSDoc is required on any non-obvious public function, complex type, or service method. Keep it terse and useful — bad comments are worse than none.

---

## 14. Banned Patterns (quick reference)

| Banned                                                      | Use instead                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `*ngIf`, `*ngFor`, `*ngSwitch`                              | `@if`, `@for` (with `track`), `@switch`                                |
| `NgModule`                                                  | Standalone components, directives, pipes                               |
| `subscribe()` in components                                 | Signals, `toSignal()`, `async` pipe                                    |
| `any`                                                       | `unknown` + narrowing; `never` where impossible                        |
| Enums                                                       | Union types + `as const` objects                                       |
| `localStorage` for tokens                                   | In-memory signal + httpOnly refresh cookie                             |
| `document.querySelector` in components                      | `@ViewChild`, `@ContentChild`, `Renderer2`                             |
| Tailwind physical directions (`ml-*`, `pr-*`, `text-left`)  | Logical variants (`ms-*`, `pe-*`, `text-start`)                        |
| Inline hex / rgb colors                                     | Tailwind tokens from `tailwind.config.ts`                              |
| Hardcoded English strings in templates                      | Transloco translation keys                                             |
| `console.log`                                               | `Logger` service                                                       |
| `!` non-null assertion on runtime data                      | Narrow with a type guard or default value                              |
| `bypassSecurityTrustHtml` without architect review          | Render safe DOM; if unavoidable, sanitize + document threat model      |
