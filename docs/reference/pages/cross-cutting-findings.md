# Cross-Cutting Findings — Whole-App Page Audit

> From the 2026-07-25 static-analysis audit (frontend HEAD `904a478`).
> Method: every route enumerated from the 13 `*.routes.ts` files; every page
> component's `inject(...)` followed to its data-access layer
> (`HttpClient`/`socket.io` vs. in-file fixtures); connectivity built from an
> exhaustive `routerLink`/`router.navigate`/`navigateByUrl` sweep; i18n
> coverage computed by diffing every `lang.t('…')` literal against
> `assets/i18n/{en,fr,ar}.json`. **Not runtime-tested** — no page was
> exercised against a live API/WebSocket; all statuses are static-analysis
> judgements. Cross-check current relevance against
> [`../../status/known-issues.md`](../../status/known-issues.md) — some items
> (e.g. `/courses`, landing) have since changed.

## Orphan pages (no inbound link; not an email/entry target)

| Page | Why it matters |
| --- | --- |
| `/courses` (historically) | Absent from `dashboard-navbar.ts`/`user-menu-dropdown.ts` — being resolved by the learning-hub dedup, which deletes `/courses` in favour of the already-linked `/dashboard/certificates`. |
| `/auth/complete-account` | Nothing navigates to it; `register()` goes to `/auth/login?registered=1` instead. |
| `/about-mock-exam`, `/about-scrum-master`, `/about-product-owner`, `/about-scrum-facilitator` | Four full marketing pages with zero links from navbar or footer. |
| `/certifications/esm-p`, `/esm-a`, `/epo-p`, `/epo-a` | Orphaned because their would-be callers use the wrong slugs (see dead links below). |
| `/dashboard/certificates/:code/mock-test/result` | The runner submits to the non-`:code` variant instead. |

## Dead links (`routerLink` with no matching route → 404)

| Link | Source | Correct target |
| --- | --- | --- |
| `/certifications/psm` | `cert-levels-section.ts`, `market-stats-section.ts` | `/certifications/esm-p` |
| `/certifications/asm` | same | `/certifications/esm-a` |
| `/certifications/ppo` | same | `/certifications/epo-p` |
| `/certifications/apo` | same | `/certifications/epo-a` |
| `/certifications/psf`, `/asf` | `cert-levels-section.ts` | no such page exists |
| `/privacy` | `register.page.ts` | `/privacy-policy` |
| `/guide` | `hero-section.ts`, `all-certs-cta-section.ts` | no such route |

Six of these are on the landing page's primary certification-comparison
grid — the most-clicked surface on the public site.

**Not a defect:** `landing-footer.ts` documents that placeholder links
deliberately use `href="#"` with `preventDefault`, not `routerLink="#"`, to
avoid an invalid-route navigation. Correct pattern.

## Stub / blocked inventory (at time of audit)

| Page | Kind | Blocker |
| --- | --- | --- |
| `/auth/complete-account` | Stub + Blocked | BE-I-25 (no DOB storage) |
| `/admin/blog` (create) | Blocked | BE-I-21 (resolved since — see [`../../archive/backend-issues-resolved.md`](../../archive/backend-issues-resolved.md)) |
| `/assessments/result/:sessionId` | Partial | BE-I-22 (resolved since — review now reachable via history) |
| `/assessments/run/:sessionId` | Partial | BE-I-23 (open — IDB question snapshot workaround) |
| `/assessments/verify` | Partial | BE-I-24 (open — `idNumber` collected but discarded) |
| `/contact` (static marketing page) | Stub | no backend contact endpoint at the time — since resolved by `POST /contact`, but this specific page isn't rewired to it (superseded by CMS Slice 6) |
| `/dashboard/settings/cancel-subscription` | Stub | no subscription endpoints exist on the backend at all |
| `/dashboard/settings` (notif prefs) | UI-only | no preferences endpoint |
| `/auth/login`, `/auth/register` (social buttons) | UI-only | no OAuth handoff |

## Mock-data inventory (at time of audit — several since resolved)

| Store / constant | Pages affected | Status |
| --- | --- | --- |
| `dashboard/data-access/dashboard.store.ts` (`DATASET`, `_demoMode`) | `/dashboard` | ✅ resolved `4a11ae9` |
| `certificates/data-access/certificates.store.ts` (`STATES`, `_demoMode`) | `/dashboard/certificates` hub | 🔵 in progress — see [`../../status/current-status.md`](../../status/current-status.md) |
| `landing/data-access/landing.store.ts` (`FALLBACK_INSIGHT_POSTS`) | `/` journal section | still static (deliberate fallback, not a bug — but the linked slugs are fixtures) |
| `settings/pages/settings.page.ts` (`newsletterEmail` hardcoded) | `/dashboard/settings` | still stub |
| `auth/pages/complete-account.page.ts` (`DAYS`, `YEARS`, etc.) | `/auth/complete-account` | still stub, blocked BE-I-25 |

## Entry-flow gaps (at time of audit)

1. **Slug-vs-UUID (highest severity, being fixed by the in-flight rewire).**
   `cert-detail.page.ts` sent `?count=`/`?time=` to a runner that reads only
   `?certId=`/`?attemptId=` — empty runner. The `:code` slug was never
   resolved to a backend UUID.
2. **Nav-state-only pages.** `/assessments/ready` and
   `/assessments/result/:sessionId` read their entire payload from `Router`
   navigation state. Refresh, back-button, or a bookmarked URL yields an
   empty page. The result page even carries a `:sessionId` it never uses.
3. **Query-param dependencies without fallback.**
   `/dashboard/certificates/mock-test/result` needs `?attemptId=`;
   `/admin/lessons/:lessonId/quizzes` needs `?title=`;
   `/auth/new-password` needs `?token=`. Only new-password handles the
   missing case explicitly.
4. **`authGuard` drops query params from `returnUrl`** — rebuilds from path
   segments, so a deep link like
   `/dashboard/certificates/mock-test?certId=…` returns post-login without
   the query param, landing on an empty runner.
5. **`publicOnlyGuard` covers all of `/auth/*`** — a signed-in user can't
   reach `/auth/verify-email` or `/auth/complete-account`.

## i18n gaps (at time of audit)

All 2,509 keys present in all three locales (en/fr/ar) with **zero drift**.
Five keys genuinely missing from `en.json` (render as raw key text — three
are `aria-label`s, so the failure mode is an accessibility one):
`common.breadcrumbAriaLabel`, `common.breadcrumbHome`,
`certDetails.certFactsAriaLabel`, `certDetails.startingPriceAriaLabel`,
`mockExam.howItWorks.preview.timeRemainingLabel`.

Hardcoded (non-i18n) user-visible English remained in the mock stores at the
time of audit (`dashboard.store.ts`, `landing.store.ts`,
`certificates.store.ts`) — these are being cleaned up as each fixture is
replaced with real data.

## Other structural observations

- ~~`features/payments` is a dead feature~~ — resolved 2026-08-03: `/checkout`
  (place-order page), `/payments/success`, `/payments/cancel`, and the
  `/certifications/*` "Enroll Now" CTAs now drive `checkout` through
  `PaymentsStore`. `retake` still has no UI entry point. See
  [`../../status/current-status.md`](../../status/current-status.md).
  `features/catalog/` is still an empty directory.
- **`features/landing/data-access/catalog.api.ts`** was written but
  unconsumed at audit time — the marketing cert pages used static config
  instead. (Partially changed since — see [`landing-marketing.md`](./landing-marketing.md).)
- **Backend surfaces with no frontend at all (at audit time):** `admin/cms`
  and public `cms` (16 endpoints — still true, see
  [`../cms-frontend-plan.md`](../cms-frontend-plan.md)); public
  `GET /verify/:certId` (still true — only reachable via credential row
  links, no standalone verify page).
- **Route-ordering hazards handled correctly.** `certificates.routes.ts`
  documents and enforces literal-before-`:code` ordering; getting this wrong
  would swallow `mock-test` into `:code`.
- **`cert-detail.page.ts`** — `onShowDetails()` had an empty body ("wired up
  when routing is finalised") at audit time.

## Summary counts (2026-07-25 snapshot — will have shifted since)

70 route entries (68 routed URLs + 2 redirects) served by 65 distinct page
components. By functional status: 38 Functional, 9 Partial, 3 Stub, 1
UI-only, 1 Blocked, 16 Demo-only, 2 Broken. By data source: 41 REAL, 3 MIXED,
6 MOCK, 1 NAV-STATE, 17 STATIC, 2 redirects. Real backend wiring at the time:
44/68 URLs (65%).

### Top fixes by impact (as ranked at audit time)

1. Add `/courses` to the nav — **superseded**: the fix taken instead was to
   delete `/courses` and rewire the already-linked `/dashboard/certificates`.
2. Fix `cert-detail.page.ts` to pass a real `certId` — **in progress**, part
   of the same rewire.
3. Correct the six `/certifications/{psm,asm,ppo,apo,psf,asf}` dead slugs —
   **still open**.
4. Replace `DashboardStore` fixtures — **done**, `4a11ae9`.
