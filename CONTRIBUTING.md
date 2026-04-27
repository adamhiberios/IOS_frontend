# Contributing to IOS LMS

This guide covers branching, commits, and the local toolchain. Engineering rules (banned patterns, file layout, performance budgets) live in [`CLAUDE.md`](./CLAUDE.md) and [`/docs`](./docs/README.md). Read those first.

---

## Branching strategy — GitHub Flow

We use **GitHub Flow** — one long-lived branch (`main`) plus short-lived feature branches off `main`, merged back via pull request.

### The branches

- **`main`** — protected. Always deployable. CI must be green. Tagged for releases (`v0.x`, `v1.0`, …).
- **`feat/<scope>-<short-description>`** — new functionality.
- **`fix/<scope>-<short-description>`** — bug fixes.
- **`refactor/<scope>-<short-description>`** — internal restructuring without behavior change.
- **`perf/<scope>-<short-description>`** — performance work.
- **`docs/<scope>-<short-description>`** — documentation-only changes.
- **`chore/<scope>-<short-description>`** — tooling, dependencies, CI.

### Examples

```
feat/auth-login-form
fix/exam-heartbeat-reconnect-race
refactor/courses-store-signal-migration
docs/contributing-guide
chore/upgrade-angular-21-2
```

### Naming rules

- Lowercase only. Hyphens between words. No underscores, no spaces.
- The `<scope>` aligns with a feature folder (`auth`, `courses`, `assessments`, `admin`, `dashboard`) or a cross-cutting concern (`ui`, `core`, `i18n`, `build`, `ci`).
- Keep branches **short-lived** — aim for under a week. If a feature needs longer, split it.

### Lifecycle

1. Branch off the latest `main`.
2. Push early, push often. Open a draft PR as soon as there's something to discuss.
3. Keep the branch rebased on `main` (`git pull --rebase origin main`) to avoid merge conflicts piling up.
4. Mark the PR ready for review when CI is green.
5. Merge via **squash merge** by default. The single commit on `main` then carries the Conventional Commit subject from the PR title.
6. Delete the branch once merged.

### Hotfixes

Hotfixes follow the same flow: branch off `main` as `fix/<scope>-…`, fix, PR, squash, deploy. There is no separate `hotfix/*` namespace — the urgency is communicated via the PR description and reviewer assignment, not the branch name.

### Release branches

Not used by default. If a release window needs stabilization, cut `release/x.y` from `main`, fix-forward only, and tag from there. This is an exception, not the norm.

---

## Conventional Commits

All commit subjects follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The `commit-msg` hook (Husky) blocks commits that don't conform.

Allowed types — see `commitlint.config.cjs`:

| Type | When to use |
| --- | --- |
| `feat` | A new user-facing capability. |
| `fix` | A bug fix. |
| `refactor` | Internal restructuring; no behavior change. |
| `perf` | Performance improvement. |
| `chore` | Tooling, dependencies, internal scripts. |
| `docs` | Documentation only. |
| `test` | Adding or fixing tests. (Note: testing is deferred per SOW §6.2.14.) |
| `build` | Build-system or external-dep changes (e.g. Angular CLI bump). |
| `ci` | CI configuration. |
| `style` | Formatting only — Prettier, whitespace. |
| `revert` | Reverts a prior commit. |

### Format

```
<type>(<scope>): <subject>

<body>

<footer — references, BREAKING CHANGE, etc.>
```

- Subject ≤ 100 chars, lowercase or sentence case, no trailing period.
- Body lines ≤ 200 chars.
- Reference an issue when applicable: `Closes #42`.
- Mark breaking changes with a `!` after the scope (`feat(auth)!: rotate refresh tokens on every request`) **and** a `BREAKING CHANGE:` line in the footer.

### Examples

```
feat(auth): add login form with reactive forms + zod validation
fix(exam): pause heartbeat when tab is hidden, resume on visibilitychange
refactor(courses-store): replace BehaviorSubject chain with computed signals
perf(assessments): defer answer-explanation chunk
docs(contributing): document GitHub Flow and conventional commits
chore(deps): bump @angular/cli to 21.2.10
```

---

## Pull requests

The PR template lives in [`/docs/05-engineering-guidelines.md` §10](./docs/05-engineering-guidelines.md). At minimum every PR includes:

1. **What changed** — one-paragraph summary.
2. **Why** — link to the issue or SOW reference.
3. **CLAUDE.md flags** — does this touch auth, exam, perf budgets, CSP, or i18n? If yes, request architect review.
4. **Verification** — what you ran locally (`lint`, `typecheck`, `build`, `format:check`, manual a11y / RTL pass).
5. **Screenshots** — LTR + RTL if UI-affecting.
6. **Bundle delta** — for any new dependency or perf-sensitive change.

PR titles follow the same Conventional Commit format as commit subjects, because squash merges turn the PR title into the commit on `main`.

---

## Local toolchain

```bash
# Install (first time and after pulling new deps)
npm install

# Dev server
npm start

# Build (production by default)
npm run build
npm run build:dev
npm run build:test
npm run build:uat

# Type check
npm run typecheck

# Lint
npm run lint              # report
npm run lint:fix          # auto-fix what's safe

# Format
npm run format            # write
npm run format:check      # report only

# Bundle analysis
npm run analyze
```

The pre-commit hook runs **lint-staged** (Prettier + ESLint on staged files only) so commits stay snappy. CI runs the full-tree `lint`, `format:check`, `typecheck`, and `build`.

---

## Branch protection (repo-owner action required)

Once the repo lands on the upstream remote, set these protections on `main`:

- Require a pull request before merging.
- Require status checks to pass before merging — at minimum `lint`, `typecheck`, `build`.
- Require branches to be up to date before merging.
- Require linear history (squash merges only).
- Require signed commits (recommended).
- Restrict force pushes.
- Restrict deletions.

These settings live in repo administration, not in this file, but are part of the contract.
