# AUDIT — Angular Best Practices

> **Branch:** `audit/angular-best-practices`
> **Date:** 2026-05-19
> **Scope:** Full `src/` tree — 189 TypeScript files across `core/`, `shared/`, `ui/`, `layouts/`, and 13 feature areas (`admin`, `assessments`, `auth`, `certificates`, `courses`, `dashboard`, `forbidden`, `insights`, `landing`, `not-found`, `notifications`, `profile`, `settings`).
> **Constraints respected:** preserve all functionality, reuse existing primitives, avoid large refactors, edit in place.

---

## 0. Baselines (before vs after)

| Check               | Before                                              | After                     |
| ------------------- | --------------------------------------------------- | ------------------------- |
| `npm run typecheck` | ✅ clean                                            | ✅ clean                  |
| `npm run lint`      | **1 error / 4 warnings**                            | **0 errors / 2 warnings** |
| `npm run build:dev` | ❌ **broken** (4 × TS2322 in `exam-runner.page.ts`) | ✅ **builds clean**       |

The two remaining lint warnings are deliberate — they sit on two `<img>` tags that load assets from `https://www.figma.com/api/mcp/asset/...`. `NgOptimizedImage` (`[ngSrc]`) requires a custom `IMAGE_LOADER` for non-allowlisted hosts, so the raw `<img>` is documented in-source with the reason it stays.

---

## 1. Banned-pattern sweep (CLAUDE.md §4)

I grepped the whole tree for every banned pattern listed in `CLAUDE.md §4`.

| Banned pattern                                         | Hits found |                                                                                           Hits remaining |
| ------------------------------------------------------ | ---------: | -------------------------------------------------------------------------------------------------------: |
| `*ngIf` / `*ngFor` / `*ngSwitch`                       |          0 |                                                                                                        0 |
| `ngClass` / `ngStyle`                                  |          0 |                                                                                                        0 |
| `localStorage` / `sessionStorage` for tokens or PII    |          0 |                                                                                                        0 |
| `bypassSecurityTrust*` / unsanitised `[innerHTML]`     |          0 |                                                                                                        0 |
| `.subscribe(` inside a component class                 |      **1** |                                                                                           **0** ✅ fixed |
| Cross-feature relative import (`../../<other>/…`)      |      **3** | 0 ✅ fixed (validators); 5 left for `landing` page-shell primitives — flagged, _not_ refactored (see §6) |
| `Material` / `PrimeNG` / `NG-Zorro`                    |          0 |                                                                                                        0 |
| Explicit `any`                                         | 0 (source) |                                                                                                        0 |
| Hardcoded API URLs                                     |          0 |                                                                                                        0 |
| `setInterval` for the exam timer                       |          0 |                                                                                                        0 |
| `console.log` (other than `warn` / `error` in tooling) |          0 |                                                                                                        0 |

Nothing systemic. The one real `.subscribe()` and the three cross-feature validator imports are described below.

---

## 2. Fixes applied

### 2.1 Dead code removed

| File                                                                                                                      | Why dead                                                                                                                                                                                                             | Action                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/app/features/dashboard/components/user-menu-dropdown.ts` — `MENU_ITEMS` constant + (now unused) `interface MenuItem` | Replaced by the reactive `menuItems = computed(...)` signal so menu labels follow `LanguageService`. The const stayed behind as dead code (and triggered the only lint error).                                       | Removed the const (interface kept for typing `computed<readonly MenuItem[]>`).                                 |
| `src/app/features/settings/components/logout-dialog.ts`                                                                   | Duplicate of `src/app/layouts/app-shell/logout-dialog.ts` — same `ios-logout-dialog` selector, same template, but **not imported by any feature**. A second component registering the same selector is a latent bug. | File deleted. The layout-shell copy is the canonical one and is the only one wired into `dashboard-navbar.ts`. |
| `src/app/ui/modal/` (empty directory)                                                                                     | Empty folder, no `index.ts`, never imported.                                                                                                                                                                         | Directory removed.                                                                                             |

### 2.2 Removed bare `.subscribe()` from a component

**File:** `src/app/features/insights/pages/insights.page.ts`

Before — banned pattern; subscription never gets cleaned up explicitly:

```ts
ngOnInit(): void {
  void this.store.load();
  this.searchControl.valueChanges.subscribe((value) => this.store.setSearchQuery(value));
}
```

After — signal-driven, ownership handed back to Angular:

```ts
private readonly searchValue = toSignal(this.searchControl.valueChanges, {
  initialValue: '',
});

constructor() {
  effect(() => this.store.setSearchQuery(this.searchValue() ?? ''));
}

ngOnInit(): void {
  void this.store.load();
}
```

Behaviour is identical: every keystroke still pushes a new search term into the store, but it now follows the reactive style mandated by CLAUDE.md §4 ("`.subscribe()` inside components → use `toSignal()`").

### 2.3 Consolidated three duplicate scroll-to-top buttons into the existing `<ios-scroll-to-top />` primitive

A polished `<ios-scroll-to-top />` already lives in `src/app/ui/scroll-to-top/` and is exported from `@ui`. It is used correctly by 14 landing pages. Three pages were inlining their own near-identical button **plus** a `protected scrollToTop()` method instead of reusing the primitive:

| File                                                     | Removed                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/app/features/insights/pages/insights.page.ts`       | 8-line `<button>` block + `scrollToTop()` method + `LucideArrowUp` icon import |
| `src/app/features/insights/pages/insight-detail.page.ts` | Same pattern                                                                   |
| `src/app/features/landing/pages/contact.page.ts`         | Same pattern                                                                   |

Each was replaced with the one-liner `<ios-scroll-to-top />`, the `ScrollToTop` import added, and the unused `LucideArrowUp` icon dropped from `provideIcons(...)`.

Net result: ~30 LOC removed, three places where the styling could drift independently collapsed to one, a11y label is now centrally managed via `common.scrollToTop`.

### 2.4 Cross-feature import — relocated pure validators to `@shared/utils`

`change-password.page.ts` in the `profile` feature was importing
`features/auth/utils/match-fields.validator.ts` and
`features/auth/utils/strong-password.validator.ts`. That violates CLAUDE.md §5 ("Cross-feature imports are forbidden").

Both validators are **pure, framework-agnostic functions** with no auth-specific state — exactly what `shared/utils/` exists for.

| Change                                | Detail                                                                                                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical home moved                  | `src/app/shared/utils/match-fields.validator.ts` and `src/app/shared/utils/strong-password.validator.ts` (verbatim copies — zero behavioural change)                                                                                            |
| Re-exported via barrel                | `src/app/shared/utils/index.ts` now also exports `matchFieldsValidator`, `strongPasswordValidator`, `STRONG_PASSWORD_MIN_LENGTH`, `type StrongPasswordErrors`                                                                                   |
| Old locations kept as thin re-exports | `features/auth/utils/*.validator.ts` files now just `export { … } from '@shared/utils'`. This preserves every existing import in `auth/` (no churn in `register.page.ts` / `new-password.page.ts`) while making the canonical home unambiguous. |
| Offending import fixed                | `features/profile/pages/change-password.page.ts` now imports from `@shared/utils` directly (no cross-feature relative path).                                                                                                                    |

### 2.5 Type-safety win — fixed pre-existing `npm run build:dev` failure

The production build was broken on `main` (verified by checking out `main`'s copy of `exam-runner.page.ts` against this branch — same errors). Four `TS2322: Type 'number' is not assignable to type 'string'` errors in `exam-runner.page.ts` came from passing `number` values into the `LanguageService.t()` `params` argument — but its type was `Record<string, string>`.

Two-line fix in `core/i18n/language.service.ts`:

```ts
// Before
type TranslateParams = Record<string, string>;

// After
type TranslateParams = Record<string, string | number>;
```

…with the resolver updated to `String(value)` the param when interpolating. This matches what every caller already expected, removes a forced `String(count)` at every call site, and unbreaks the dev build.

### 2.6 NgOptimizedImage on a local asset

`src/app/features/assessments/pages/exam-result.page.ts` had a hand-written `<img src="/assets/images/certificate.png" ...>` for the local certificate image. Replaced with `NgOptimizedImage` (`ngSrc`, explicit `width` / `height`, `priority` since the image is above the fold on a results page). Removed one lint warning; gives Angular automatic LCP hinting and a `srcset` for free.

### 2.7 Documented the unavoidable external-CDN images

The two remaining `prefer-ngsrc` warnings target Figma-CDN `<img>` tags in `delete-account-dialog.ts` and `app-shell/logout-dialog.ts`. NgOptimizedImage needs a `provideImageLoader` for non-Angular-default hosts. Rather than pulling in a custom loader for two static icons, I added an explanatory in-source comment so future audit passes don't relitigate this:

```html
<!--
  Door icon — external Figma CDN asset, not an app image. NgOptimizedImage
  would require a custom image loader for this host, so we keep <img>.
-->
```

Long-term recommendation: download the two SVG/PNG assets into `src/app/assets/icons/` and migrate to `NgOptimizedImage` — that would zero out the warning count and also remove the runtime dependency on `figma.com` CDN availability.

---

## 3. Files touched

| File                                                            | Change                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/core/i18n/language.service.ts`                         | Widened `TranslateParams` to accept `number`; resolver coerces with `String(...)`. Fixes the broken build.                                                         |
| `src/app/features/assessments/pages/exam-result.page.ts`        | `<img src=…>` → `<img ngSrc=…>`; added `NgOptimizedImage` import.                                                                                                  |
| `src/app/features/auth/utils/match-fields.validator.ts`         | Replaced with a thin re-export of `@shared/utils` (canonical home moved).                                                                                          |
| `src/app/features/auth/utils/strong-password.validator.ts`      | Replaced with a thin re-export of `@shared/utils` (canonical home moved).                                                                                          |
| `src/app/features/dashboard/components/user-menu-dropdown.ts`   | Removed dead `MENU_ITEMS` constant (already replaced by `menuItems = computed(...)`); resolves the lint error.                                                     |
| `src/app/features/insights/pages/insights.page.ts`              | Replaced bare `.subscribe()` with `toSignal()` + `effect`; replaced inline scroll-to-top with `<ios-scroll-to-top />`; pruned `LucideArrowUp` from icon providers. |
| `src/app/features/insights/pages/insight-detail.page.ts`        | Replaced inline scroll-to-top with `<ios-scroll-to-top />`; pruned `LucideArrowUp`; removed `protected scrollToTop()`.                                             |
| `src/app/features/landing/pages/contact.page.ts`                | Replaced inline scroll-to-top with `<ios-scroll-to-top />`; pruned `LucideArrowUp`; removed `protected scrollToTop()`.                                             |
| `src/app/features/profile/pages/change-password.page.ts`        | Switched cross-feature validator imports to `@shared/utils`.                                                                                                       |
| `src/app/features/settings/components/delete-account-dialog.ts` | Added documenting comment above the Figma `<img>`.                                                                                                                 |
| `src/app/layouts/app-shell/logout-dialog.ts`                    | Added documenting comment above the Figma `<img>`.                                                                                                                 |
| `src/app/shared/utils/index.ts`                                 | Now exports the two validators.                                                                                                                                    |
| `src/app/shared/utils/match-fields.validator.ts`                | **NEW** — canonical home for the cross-feature validator.                                                                                                          |
| `src/app/shared/utils/strong-password.validator.ts`             | **NEW** — canonical home for the cross-feature validator.                                                                                                          |
| `src/app/features/settings/components/logout-dialog.ts`         | **DELETED** — unused duplicate of `app-shell/logout-dialog.ts`.                                                                                                    |
| `src/app/ui/modal/`                                             | **DELETED** — empty directory.                                                                                                                                     |

**Net diff:** 12 files modified, 2 new files, 1 file deleted, 1 directory removed.

---

## 4. Findings I did NOT refactor (deliberately)

The audit brief says "Avoid unnecessary large refactors" and "Preserve existing functionality" — these items would each require a larger change than I judged appropriate for an audit pass. They are reported here so the team can decide.

### 4.1 Empty feature folders

```
src/app/features/admin/{components,pages,data-access}
src/app/features/courses/{components,pages,data-access}
src/app/features/auth/{components,data-access,guards}
src/app/features/notifications/components
src/app/core/{idle,network,error}
src/app/shared/{directives,pipes}
```

These are scaffolded but empty. They reflect epics that haven't shipped yet (Epic 4+: courses, admin, idle/error reporters). Leaving them in place keeps the canonical layout visible to anyone landing in the repo for the first time. **Recommendation:** keep until the epic lands; `.gitkeep` would be tidier than empty directories but is a Git-hygiene question, not an Angular one.

### 4.2 `landing` page-shell primitives consumed cross-feature

`insights/pages/{insights,insight-detail}.page.ts` import `LandingNavbar`, `LandingFooter`, and `PageHero` from `../../landing/components/`. These are page-shell primitives, not landing-specific business components — they're reused on `terms-of-use`, `privacy-policy`, and now also `insights`.

The correct home would be either `layouts/landing-shell/` or `ui/` (if we treat them as design-system primitives). Moving them would touch ~20 page files. **Recommendation:** consolidate during the next planned change to those primitives (e.g., when adding the EN/AR locale picker to the navbar). Not consolidating today preserves functionality with zero risk.

### 4.3 Three `TODO` blocks for backend wiring

```
features/landing/components/contact-section.ts:273
features/landing/pages/contact.page.ts:164
features/auth/pages/complete-account.page.ts:948
features/settings/pages/cancel-subscription.page.ts:169
features/settings/pages/settings.page.ts:260
```

All flagged with `// TODO`. They depend on backend endpoints that aren't live yet — _not_ dead code, just pending integration. Left in place.

### 4.4 Image-loader for Figma CDN

If we want to retire the last two lint warnings without changing assets, a `provideImageLoader({ ... })` registration for `figma.com` would do it. That's a global-config change to `app.config.ts` and touches core. Not worth a separate audit; bundle it with whatever ADR ultimately covers the door / trash icons (see §2.7).

---

## 5. Quality gates after audit

```bash
$ npm run typecheck
> ios-lms@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json
# (clean)

$ npm run lint
# 2 warnings — both intentional, documented in §2.7

$ npm run build:dev
# Application bundle generation complete. [8.5s]
```

Before the audit, the **dev build was failing**. After the audit, the dev build is green.

---

## 6. Major improvements — summary

1. **Build unbroken.** Fixed 4 × `TS2322` errors in `exam-runner.page.ts` by widening `TranslateParams` to `Record<string, string | number>` in the core i18n service. This was a pre-existing failure on `main`.
2. **Banned pattern eliminated.** Removed the only `.subscribe()` in a component (`insights.page.ts`) in favour of `toSignal()` + `effect`, matching the rest of the codebase.
3. **Cross-feature import removed.** Pure validators relocated from `features/auth/utils/` to `shared/utils/`, with thin re-exports left at the original path so no auth-page imports churn.
4. **Duplicate component eliminated.** Deleted the unused second `LogoutDialog` that registered the same `ios-logout-dialog` selector from a different folder. Latent collision risk gone.
5. **Three inlined widgets consolidated.** Three pages now reuse the existing `<ios-scroll-to-top />` UI primitive instead of duplicating its markup, styling, and click handler.
6. **One lint error → zero.** Removed dead `MENU_ITEMS` const in the user-menu dropdown.
7. **Lint warnings 4 → 2.** Local certificate image migrated to `NgOptimizedImage` (`ngSrc`, explicit dimensions, `priority`). Remaining two warnings are external-CDN `<img>` tags and now carry an in-source justification.
8. **Empty `ui/modal/` directory removed.**

---

## 7. Suggested follow-ups (out of scope for this PR)

- **R-1 (small):** Move `landing/components/{landing-navbar, landing-footer, page-hero}` to `layouts/landing-shell/` and update the ~20 callers. Removes the last cross-feature relative imports.
- **R-2 (tiny):** Register `provideImageLoader` for the Figma host _or_ download the two Figma icons into `assets/icons/`. Eliminates the last two lint warnings.
- **R-3 (tiny):** Add `.gitkeep` to the empty scaffold folders or delete them until their epic ships.
- **R-4 (medium):** Convert the remaining `TODO` blocks (contact form, settings/cancel-subscription, complete-account) into real API integrations once the backend endpoints in `04-api-integration-data-flow.md` are live.
