# Current Status

> Last updated: 2026-08-03, against frontend HEAD `de7539c` and backend HEAD
> `7160f11`.

## Repo / branch

Frontend project: `institute of scrum/` (Angular 21). Backend (**READ-ONLY,
never modify**): `IOS_Backend/` (NestJS). All work is on git branch
**`feat/real-backend-integration`**. The deployed API is the source of data —
**never run the backend locally**. Dev API:
`https://api-dev.instituteofscrum.org/api/v1` (already set in `environment*.ts`).

Read `CLAUDE.md` for frontend engineering rules (standalone components,
signals, OnPush, new control-flow, no `any`, no Observables in components,
`ios-` selector prefix, logical CSS). Read
[`../reference/conventions/frontend-data-access-patterns.md`](../reference/conventions/frontend-data-access-patterns.md)
before building or reviewing any feature.

## Overall project status

- **Phase 1** (backend study) — ✅ Complete → [`../reference/backend/`](../reference/backend/).
- **Phase 2** (frontend infra: real auth, interceptors, models) — ✅ Complete.
- **Phase 3** (Admin application, all pages) — ✅ Complete.
- **Phase 4** (user-facing app ↔ real backend) — ✅ Planned scope complete (2026-07-25), including the four net-new student/auth features (real exam, courses, mock, email verify) and C1 admin OTP. Two reviews still outstanding (see [`known-issues.md`](./known-issues.md)).
- **Stage 2 — CMS surface + landing rewire** — ⬜ Not started as a whole. Slice 1 (landing regression) is done. Slices 2–11 (public renderer, admin editor) are **not built** — see [`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md). The CMS admin editor was built once (2026-07-29) and **rolled back**; only the `/admin/contact` inbox survived (built & staged, not yet committed by the user).

## What's in flight right now (uncommitted / awaiting review, as of 2026-08-03)

- **`features/payments` — checkout flow built and wired** — 🔵 built,
  uncommitted, **partially runtime-verified against api-dev**. Closes the
  "dead feature" gap flagged in `known-issues.md` /
  `../reference/backend/endpoints.md` /
  `../reference/pages/cross-cutting-findings.md` (all three updated). New:
  `features/payments/pages/place-order.page.ts` (pixel-matched to Figma
  node `13044:11509`, route `/checkout`, guarded by `authGuard`, reads
  `certId`/`title`/`code`/`price`/`currency`/`badge` from query params —
  nothing fabricated; missing params render an empty-cart notice instead of
  a fake order) and `components/payment-success-dialog.ts` (Figma node
  `13049:12413`, shown for a `$0` charge — `checkout()` resolves `enrolled`
  with no Stripe redirect). Order-summary panel is themed via the existing
  `.cert-track-*` blue/green/brown tokens (new
  `features/payments/utils/track-theme.ts`, a pure `programCode → class`
  mapper — no cross-feature import needed). Payment-method field uses
  `ios-select` (not a native `<select>`), bound to the reactive form.
  `CertDetailsTemplate`'s two "Enroll Now" buttons (`components/cert-details-template.ts`,
  shared by all 7 `/certifications/*` pages) now resolve the marketing
  `code` to the real backend cert via the already-injected
  `PublicCatalogStore` and `router.navigate(['/checkout'], { queryParams })`
  — a cert with no backend match navigates nowhere rather than sending a
  fabricated price. **PCI decision:** the Cardholder name/Card
  number/Expiration/CVV fields are rendered to match Figma but their values
  are never read or sent anywhere — `PaymentsStore.checkout()` only ever
  gets `certId` + `promoCode`; a paid charge redirects to Stripe's own
  hosted Checkout (`checkoutUrl`), a `$0` charge completes immediately. Also
  fixed along the way: `authGuard`/`roleGuard` were dropping query params
  from `returnUrl` (built from `UrlSegment[]`, path-only) — a user bounced
  through login while enrolling landed back on `/checkout` with no
  `certId`. Now built from `router.getCurrentNavigation().extractedUrl`
  (new shared `buildReturnUrl()` helper in `core/auth/auth.guard.ts`).
  Added `/payments/success` and `/payments/cancel`
  (`features/payments/pages/payment-success.page.ts` /
  `payment-cancel.page.ts`) — the backend hardcodes these exact paths as
  Stripe's `successUrl`/`cancelUrl`
  (`IOS_Backend/src/modules/payment/payment.service.ts`); without them every
  *paid* checkout 404'd after a successful Stripe payment. Neither page
  claims the charge is reconciled (no `GET /payments/session/:id` endpoint
  exists — only the webhook flips `pending → completed`); copy is hedged
  and the CTA points at My Certificates. i18n: all new strings added to
  `en`/`ar`/`fr` under `payments.checkout.*`. typecheck/lint/Prettier clean,
  `ng build --configuration=development` compiles clean (97 lazy chunks, +3
  for the two new pages).
  **Runtime evidence (2026-08-03, api-dev):** a real `Complete Payment`
  click against api-dev returned a genuine Stripe Checkout session and
  redirected the browser — confirms the `certId`/`promoCode` request
  contract and the `PaidCheckoutDto`/`FreeEnrollmentDto` response mapping
  are correct end-to-end. What it also caught: `api-dev`'s Stripe
  `successUrl` pointed at `https://api-dev.instituteofscrum.org/payments/success`
  — the **API's own origin**, not the Angular app's — so the post-payment
  redirect 404'd on the API server, not on this app. That's an environment
  variable misconfigured on the `api-dev` deploy (`FRONTEND_BASE_URL` /
  `APP_BASE_URL`), not a frontend bug and not fixable from here — filed as
  **BE-I-33** in
  [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md).
  The `/payments/success`/`/payments/cancel` routes themselves are correct
  and need no further frontend change once that variable is corrected.
  Not otherwise runtime-tested (the `$0`/free-enrollment path, the
  cardholder-name-mismatch-with-Stripe-hosted-fields UX, and the
  success/cancel pages themselves are unverified against api-dev — blocked
  on BE-I-33).

- **Change-password success dialog restyled** — 🔵 built, uncommitted, at the
  user's explicit direction (pasted the target markup). `ProfilePasswordUpdatedDialog`
  (shown on `/dashboard/profile/change-password` when
  `store.passwordSubmitStatus() === 'success'`) previously used a padlock
  illustration in a 724px card with a title + description. Replaced with the
  simpler green-checkmark popup design already used by
  `auth/pages/new-password.page.ts`'s post-reset success popup (max-w-md
  card, green-50 circle, checkmark icon, title only, `ios-button`) — same
  visual language now for both password-success moments in the app. Kept the
  existing `(confirmed)` output contract (page still owns
  `onPasswordSaved()` → `auth.logout()`) rather than adding a
  navigation-owning method inside the dialog, so no changes were needed in
  `change-password.page.ts` itself. Reused the existing
  `profile.passwordUpdatedDialog.title`/`.ok` i18n keys (already in
  en/fr/ar); `profile.passwordUpdatedDialog.description` is now unused since
  the new design has no description line — left in place as a harmless
  orphan. typecheck/lint clean, build bundle generation clean. Not
  runtime-tested against api-dev.
- **Copyright year fixed app-wide** — 🔵 built, uncommitted. Audit found two
  bug classes: (1) 4 pages called `lang.t('common.copyright')` with **no**
  `{ year }` param (`login.page.ts`, `admin-login.page.ts`,
  `reset-password.page.ts`, `new-password.page.ts`) — the unresolved
  `"© {year} Institute of Scrum..."` literal `{year}` text was rendering on
  screen; (2) `mock-history.page.ts` and `exam-runner.page.ts` passed a
  hardcoded `{ year: '2026' }` instead of computing it; (3)
  `auth.completeAccount.copyright` and `landing.footer.copyright` had `©
  2026`/`© ٢٠٢٦` hardcoded directly in en/ar/fr i18n (no `{year}` placeholder
  at all) and were called with no params from `complete-account.page.ts` and
  the two shared footers `auth-footer.ts` / `landing-footer.ts` (the latter
  covers every landing/cert-detail page in one fix). Fixed all of the above
  to compute `new Date().getFullYear()` and pass it through, and updated the
  two i18n keys to use the `{year}` placeholder like `common.copyright`
  already did. `grep`-verified no remaining un-parameterized `.copyright')`
  call or hardcoded `202x` year literal in `src/`. typecheck/lint clean,
  build bundle generation clean. Not runtime-tested against api-dev.
- **Fixed dead `/privacy` link on register** — 🔵 built, uncommitted. Found
  while checking the copyright fix's neighboring markup:
  `register.page.ts`'s privacy-policy checkbox link pointed to `/privacy`,
  which isn't a route (the real route, and what the footer/cookie-consent
  banner correctly link to, is `/privacy-policy`). Fixed to match.
  typecheck/lint clean.
- **Removed "Or continue with" social login section** (known-issues.md gap)
  — 🔵 built, uncommitted, at the user's explicit direction. Removed the
  divider + `ios-social-button` row from both `login.page.ts` and
  `register.page.ts` (`SocialButton`/`SocialProvider` imports, the `socials`
  field, `onSocialLogin`/`onSocialSelect` no-op handlers). The
  `ui/social-button/` component itself is untouched, just unused now; the
  `common.orContinueWith` i18n key is left in place (orphaned, harmless) in
  case OAuth returns later. typecheck/lint clean, build bundle generation
  clean. Not runtime-tested against api-dev.
- **Landing page dead certification links** (known-issues.md gap) — 🔵 built,
  uncommitted. `market-stats-section.ts#certTableRows`'s 4 wrong slugs
  (`psm`/`asm`/`ppo`/`apo`) now point to the real routes
  (`esm-p`/`esm-a`/`epo-p`/`epo-a`). `psf`/`asf` turned out not to be dead
  links on inspection — that row already renders as plain "coming soon" text,
  not an anchor. typecheck/lint clean, build bundle generation clean. Not
  runtime-tested against api-dev.
- **`/certifications` page — one shared cert array** — 🔵 built, uncommitted.
  `all-certifications.page.ts` used to hardcode the same 7 certifications
  twice: once per `ios-certification-card` in the 3 track sections, once more
  in a separate `compCerts` array for the comparison table. Replaced both
  with a single `certDefs: readonly CertDef[]` (code, track, level, svg,
  i18n name key, card theme colors, comparison badge color, prerequisite) —
  track sections now `@for` over `smCerts`/`poCerts`/`sfCerts` (filtered from
  `certDefs`), and the comparison table `@for`s over `certDefs` directly.
  Visual output unchanged (Scrum Master track's theme colors, previously
  implicit via `ios-certification-card` defaults, are now explicit in
  `certDefs` — verified they match the component's own `input()` defaults).
  typecheck/lint clean, build bundle generation clean. Not runtime-tested
  against api-dev.
- **Duplicate-`class`-attribute bug, fixed codebase-wide** — 🔵 built,
  uncommitted. Found while investigating a user-reported styling bug
  (`ios-landing-contact-section`'s submit button and the `/certifications`
  FAQ questions rendering with no padding/margin). Root cause: several landing
  templates had two static `class="..."` attributes on one element (e.g.
  `class="w-full flex ... px-8 py-4 rounded-2xl ..." class="bg-cer-brown-dark
  text-cer-brown-soft"`). Angular does **not** merge these — each becomes a
  separate `setAttribute` call at element creation, so the **second** one
  silently wins and every class from the first is dropped. Merged all
  instances into single `class` strings across: `components/contact-section.ts`
  (submit button — was losing all padding/layout, kept only bg/text color),
  `pages/all-certifications.page.ts` (FAQ button + chevron icon, both floating
  stat cards in the "What is this?" section — was losing `absolute`
  positioning entirely, comparison-table badge pill),
  `pages/about-scrum-master.page.ts`, `pages/about-scrum-facilitator.page.ts`,
  `pages/about-product-owner.page.ts` (badge-trio underline, cert-path badge
  pill, "?" icon + heading in the info box, "Explore other Certifications"
  link — 5 instances each, same pattern in every track page), and the two
  shared components used across all 7 cert-detail pages:
  `components/cert-page-hero.ts` (breadcrumb + `h1` text color) and
  `components/cert-faq-cta.ts` (badge pill, description text color).
  `grep`-verified zero remaining duplicate-`class` elements in `src/`.
  typecheck/lint clean, build bundle generation clean. Not runtime-tested
  against api-dev.

Otherwise nothing in flight — the three items below (SEO json-ld,
learning-hub dedup, BE-I-30 landing repoint + exam review) were committed by
Adam directly on `feat/real-backend-integration`; verified against HEAD
`de7539c` on 2026-08-03 (typecheck clean, lint clean aside from the 3
known-benign `prefer-ngsrc` warnings, build bundle generation clean).

## Recently committed

- **SEO — render `seo.jsonLd`** (blog article + catalog certificate pages) — ✅ committed `d7aa702`. Closes backlog items 13a/13b. New `core/seo/json-ld.service.ts` owns a single `<script type="application/ld+json">` tag. Blog: wired via `insights.mappers.ts`/`insight-detail.page.ts`. Catalog: SEO-only `GET /catalog/:id` fetch added to `cert-details-template.ts` — page **content stays static** per user decision; `metaTitle`/`metaDescription` are fetched but not applied (no `Title`/`Meta` service precedent in the app — flagged, not assumed). Not runtime-tested against api-dev.
- **Learning hub de-duplication** (`/dashboard/certificates` rewired to real data, `/courses` deleted) — ✅ committed `335b621` + `f9d9cfa`. Corrects a mistake where `172f35a` built a second `features/courses` hub duplicating the already-designed `/dashboard/certificates` hub. `cert-session.page`, `cert-detail.page`, `certificates.page` now read real `/learning/*` data; `certificates.store.ts` fixture code stripped from 872→493 lines (mock-test fixtures and two `ESM_P_DETAIL_*` snapshots deliberately kept — still consumed, no real source yet, but Overview and Mock-test sections have since been rebuilt on real data too, so this store is nearly empty of fixtures). `/courses` route and pages deleted; `courses/data-access/*` kept (it's the real wiring layer). Not runtime-tested against api-dev.
- **BE-I-30 landing repoint + real-exam answer review** — ✅ committed `991c539`. `LandingApi` repointed off the deleted `GET /landing` to `GET /analytics/public-stats` (wrapped in `stats`) + the shared `PublicCatalogStore` for featured programs; no CMS work involved. New `ios-exam-review-page` at `/assessments/review/:attemptId` consumes the now-fixed `GET /exam/attempts/:attemptId/review` (BE-I-22) — reached from exam history, **not** the result page (see BE-I-32 in [`known-issues.md`](./known-issues.md)). Not runtime-tested against api-dev.
- **Admin follow-ups** — catalog image picker (BE-I-27 narrowed) + exam student preview (`GET /admin/exams/:examId/preview`) — ✅ committed `ad30b66`.
- **Admin contact inbox** (`/admin/contact`, BE-I-26) — 🟢 built & staged, awaiting review (kept from the rolled-back CMS session — independent of CMS).
- **Student dashboard overview → real data** (`DashboardStore` retired) — ✅ committed `4a11ae9`.
- **CMS-ADMIN build** — ⛔ built then rolled back 2026-07-29 at the user's direction before review. `src/` has **no** reference to `/cms`, `AdminCms*`, or `CmsSection*`. See [`../archive/cms-rollback-2026-07-29.md`](../archive/cms-rollback-2026-07-29.md) for what to reuse when rebuilding.

For everything committed before that, see [`../archive/changelog.md`](../archive/changelog.md).

## Immediate next actions

Per the plan-of-record (updated 2026-07-27, still current):

1. **Stage 2 — CMS**, per [`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md): Slices 2–8 (public renderer → home cutover), then 9–10 (admin editor + contact inbox — reuse the rolled-back-session findings), then 11 (hardening).
2. **Blog E2E re-test** (BE-I-21 fixed by backend `30bfff5`) — ⏸ still needs a **live** run (create → edit → translations → publish → public-read against api-dev); blocked on test credentials, not available in-session. Code-reviewed 2026-08-03 instead: `admin/blog.api.ts`'s `create`/`publish`/`translations` calls match the fixed contract (`BE-I-21` resolution notes: response now built from the entity already in hand, no read-after-write race); no FE code change needed, confirmed still true on current HEAD.
3. **`/dashboard/certificates` legacy fixture cleanup** — ✅ verified 2026-08-03: no `ESM_P_*` fixture data remains in `certificates.store.ts` (only historical doc-comments referencing the old names); the three sourceless Overview tiles (average mock score, total learning time, trend delta) are fully removed from `cert-detail.page.ts`, not stubbed. Nothing further to do here.
4. **`complete-account` wizard** — still a stub, confirmed 2026-08-03: `onSubmit()` just navigates to `/dashboard`, no API call wired. Still correctly blocked by **BE-I-25** (no DOB field) — see [`known-issues.md`](./known-issues.md). Not worked around.
5. **Escalate BE-I-33** — `api-dev`'s Stripe `successUrl`/`cancelUrl`
   (`FRONTEND_BASE_URL`/`APP_BASE_URL`) resolve to the API's own origin, not
   the Angular app's, so the paid-checkout redirect 404s on the API server.
   Not fixable from this repo (env var on the `api-dev` deploy) — needs
   whoever owns that environment's config. Full detail:
   [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md)
   (**BE-I-33**).
   Once fixed, re-run the paid-checkout runtime test (free/`$0` path and the
   two new success/cancel pages are also still unverified against api-dev).

## Working rules for new work

- **Never modify `IOS_Backend/`.** Document backend problems in
  [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md); don't fix them.
- **Build one page/slice at a time**, verify (`npm run typecheck && npm run lint && npm run build`, all from `institute of scrum/`), update this file, **stop for review**. **Never commit without the user's explicit "commit."**
- `npx ng build --configuration production` is needed to check prod bundles/budgets — `package.json`'s `build` script defaults to the **development** configuration.
- i18n lives in `src/app/assets/i18n/{en,fr,ar}.json`. Add keys to all three; **Arabic strings still need professional review** across every shipped screen (CLAUDE.md §9) — this is the largest standing cross-cutting debt.
- **Testing** remains deferred per SOW §6.2.14 — nothing is runtime-tested against api-dev; live verification needs real student/admin credentials not available in-session.
