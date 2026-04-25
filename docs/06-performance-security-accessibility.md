# 06 — Performance, Security & Accessibility

The SOW commits the LMS to ≤ 3 s page load, 99.9% uptime, WCAG 2.1 AA, and OWASP Top-10 compliance. This document translates those contractual requirements into concrete frontend practices, budgets, and review gates.

---

## 1. Performance

### 1.1 Targets

The SOW §8 commitment is **≤ 3 s page load**. We interpret "page load" precisely as **initial loading** — the time from navigation start until the page is meaningfully usable — and we measure it via two industry-standard signals: **First Contentful Paint (FCP)** and **Largest Contentful Paint (LCP)**. Interaction responsiveness (INP) and layout stability (CLS) are tracked separately as quality signals and are not part of the contractual figure.

Baseline (from SOW §8):

- **Initial load — FCP** (cold, median mid-range mobile over 4G): **≤ 1.8 s**.
- **Initial load — LCP** (cold, median mid-range mobile over 4G): **≤ 2.5 s**.
- **End-to-end "first usable page"**: **≤ 3 s**, encompassing FCP + LCP + the first idle frame.
- **Uptime**: **99.9%** (achieved at infra/CDN layer — frontend contributes by being cache-friendly and resilient).

The two architectural pillars that make these numbers achievable are **lazy loading** and **code splitting** (see §1.3). Without them, an Angular app of this scope cannot meet a 3-second budget on 4G. With them, the initial download is a small shell plus only the code for the route the user actually opened.

Stretch goals (internal targets, not contractual):

| Metric                          | Target      | Notes                                                |
| ------------------------------- | ----------- | ---------------------------------------------------- |
| FCP (First Contentful Paint)    | ≤ 1.8 s     | Initial loading floor                                |
| LCP (Largest Contentful Paint)  | ≤ 2.5 s     | Google "Good" threshold; main contractual metric     |
| INP (Interaction to Next Paint) | ≤ 200 ms    | Replaces FID; measured on real interactions          |
| CLS (Cumulative Layout Shift)   | ≤ 0.1       | Layout stability                                     |
| TTFB                            | ≤ 600 ms    | CDN-served static assets                             |
| JS bundle (initial, gzip)       | ≤ 300 KB    | Warn at 300, error at 500                            |
| Lazy route chunk (gzip)         | ≤ 100 KB    | Per feature route                                    |
| CSS (gzip)                      | ≤ 50 KB     | Tailwind JIT purged build                            |

### 1.2 Bundle Budgets (`angular.json`)

```json
"budgets": [
  { "type": "initial",     "maximumWarning": "300kb", "maximumError": "500kb" },
  { "type": "allScript",   "maximumWarning": "1.2mb", "maximumError": "2mb"   },
  { "type": "anyComponentStyle", "maximumWarning": "6kb", "maximumError": "12kb" }
]
```

A PR that breaks these budgets does not merge.

### 1.3 Loading Strategy (Lazy Loading + Code Splitting)

Lazy loading and code splitting are the two techniques that let us hit the **≤ 3 s FCP/LCP** target on 4G. They are non-negotiable architectural decisions, not optimisations applied after the fact.

- **Lazy routes** for every feature. The initial shell is only: app root, auth, router, core interceptors, and the layout skeleton. Course catalogue, exam engine, certifications, admin panels, dashboards, and reporting are all loaded on demand.
- **Route-level code splitting** is automatic via `loadComponent` / `loadChildren`. Each lazy route emits its own chunk; chunk filenames are content-hashed so they are immutable and safely long-cached at the CDN.
- **Component-level code splitting via `@defer`** for heavy, below-the-fold content: charts, rich-text editors, video players, file pickers, exam-result analytics. Use `@placeholder` and `@loading` blocks with skeletons. `@defer` triggers (`on viewport`, `on interaction`, `on idle`) are chosen per case so the deferred chunk arrives just in time.
- **Heavy libraries are isolated** to the routes that need them. Examples: chart library only in dashboards/reports; PDF generation only in the certificate route; rich text only in the authoring route. These are imported inside lazy components, never at the app shell.
- **Preloading**: `withPreloading(PreloadAllModules)` (or a custom strategy preloading common next-routes per role) is enabled in production. Preloading runs **after** the shell is idle so it never competes with FCP/LCP.
- **Image optimization**: `<img>` tags always carry `loading="lazy"` (unless above the fold), `decoding="async"`, and explicit `width`/`height` (prevents CLS). Use WebP/AVIF from the CDN; keep a PNG/JPEG fallback only if the CDN can't negotiate. The hero image of the landing page is preloaded with `<link rel="preload" as="image">` to nail LCP.
- **Fonts**: self-hosted (not Google Fonts) with `font-display: swap`. Preload the primary weight in `index.html`. Subset Arabic separately so English-locale users don't pay for the Arabic font.
- **Critical CSS**: Tailwind's production build is already compact; no separate critical-CSS extraction is needed at this scale.

### 1.4 Runtime Performance

- `OnPush` + **Signals** for automatic, narrow change detection.
- `@for` tracks by stable ID — never omit.
- **Virtualize** any list expected to exceed 100 items (`cdk-virtual-scroll-viewport`).
- **Debounce** user-driven HTTP: 300 ms for search, ≥ 600 ms for autosave.
- **Cancel** superseded requests with `switchMap` or `AbortController`.
- **Avoid function calls in templates** whose result changes per CD tick. Use `computed`.
- **Signals in templates**: reading a signal is cheap; do it directly (`foo()`) rather than caching in component fields.

### 1.5 Network & Caching

- Static assets served from a CDN with `Cache-Control: public, max-age=31536000, immutable` (hashed filenames make this safe).
- `index.html` served with `Cache-Control: no-cache` so users always pick up the latest bundle pointer.
- Enable Brotli (fallback to gzip) at the CDN.
- Use **HTTP/2 or HTTP/3** at the CDN (no manual bundling hacks needed).

### 1.6 Observability

- Capture **Web Vitals** on real users and ship to the monitoring backend (e.g., Sentry Performance, Datadog RUM — decided in ops).
- Capture `traceId` from every API response and include it in error reports for correlation.
- Alert on regressions: LCP 75th percentile rising above 3 s page-over-page triggers a perf review.

### 1.7 Perf Review Gate

A PR that adds a feature **must** report:

- Bundle size delta (CI comment from a bundle-diff tool).
- Any new image/video/asset and its weight.
- Any new dependency and its gzip cost.

Architect signoff required for anything that adds > 30 KB gzip to the initial bundle.

---

## 2. Security

Frontend is not a security boundary — the backend is. But the frontend must not *weaken* the system. These are the rules.

### 2.1 Transport

- **HTTPS only**, TLS 1.3 (per SOW §8). HTTP requests are redirected by the CDN/origin; the app itself never constructs an `http://` URL.
- **HSTS** enabled at origin: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

### 2.2 Authentication & Session (see also [04 §5](./04-api-integration-data-flow.md#5-authentication-flow))

> Full architecture in [08 — Authentication & Authorization](./08-authentication-authorization.md). This subsection records the OWASP-aligned security posture; the token model, refresh-race handling, RBAC matrix, and threat model live in 08.

- Access token: **in-memory signal** only. Never `localStorage` / `sessionStorage`.
- Refresh token: **httpOnly, Secure, SameSite=Strict** cookie, issued by backend.
- On logout: backend invalidates refresh token → frontend clears signal → routes to `/auth/login`.
- Idle timeout with user-visible countdown warning.
- Password fields use `autocomplete="current-password"` / `new-password`, `spellcheck="false"`.

### 2.3 RBAC & Authorization

- Frontend reads the authenticated user's roles and uses them for **UX**: hide buttons a user cannot use, gate routes with `roleGuard`, etc.
- The backend is the **real** authorization layer. Every protected action is re-authorized server-side. Never pass arbitrary "user is admin" flags from client to server.

### 2.4 XSS

- **Angular's template binding** escapes interpolations by default — this is our primary defence.
- **`[innerHTML]` is banned** without architect review. If we must render HTML, pass it through a strict sanitizer (Angular's `DomSanitizer` with a curated allow-list), and log the origin of the HTML.
- **`bypassSecurityTrust*` APIs are banned** except in a reviewed, documented case (e.g., a trusted SVG sprite) — the justification must land in an ADR.
- **Content Security Policy** (set at the edge, not via `<meta>`):
  ```
  default-src 'self';
  script-src  'self';                          # no 'unsafe-inline', no 'unsafe-eval'
  style-src   'self' 'unsafe-inline';           # Angular adds inline style attributes; acceptable
  img-src     'self' data: https://cdn.ios.example;
  font-src    'self' data:;
  connect-src 'self' https://api.ios.example wss://api.ios.example;
  frame-ancestors 'none';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
  upgrade-insecure-requests;
  ```
  Adjust hosts per environment. Use `Report-Only` first, then enforce.

### 2.5 CSRF

- `SameSite=Strict` on the refresh cookie largely neutralizes CSRF.
- For double protection on state-changing endpoints, backend sets a `XSRF-TOKEN` cookie and frontend sends it as `X-XSRF-TOKEN` header (Angular's `HttpClientXsrfModule` does this automatically if enabled).

### 2.6 Dependency Supply Chain

- All dependencies are pinned in `package-lock.json`.
- **`npm audit`** runs in CI; high/critical vulnerabilities fail the build.
- **Renovate/Dependabot** opens PRs for patch updates; minors are reviewed weekly.
- No dependencies from non-npm sources (no `git://`, no tarball URLs) without architect approval.

### 2.7 Sensitive Data Handling

- Do not log tokens, passwords, or PII — not to console, not to error reporter.
- Treat any field labelled "confidential" in the BRD as tainted: don't persist to cookies, localStorage, or analytics.
- Analytics events (if added) never include freeform user input.

#### 2.7.1 Browser storage policy (what may live where)

| Storage                         | Allowed for                                                                  | Banned for                                          |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| **In-memory (signal/service)**  | Access JWT, current user, ephemeral UI state, cached query results.          | (n/a)                                              |
| **httpOnly Secure cookie**      | Refresh JWT, XSRF token (issued by backend).                                 | Anything readable by JS.                           |
| **IndexedDB**                   | Exam answer drafts (see [03 §11.1](./03-state-management.md#111-exam-answer-drafts-offline-first-with-indexeddb)). Backend-authoritative; local copy is a transport buffer only. | Tokens, passwords, PII, payment data, full user profiles. |
| **`localStorage` / `sessionStorage`** | Non-sensitive UI prefs only (e.g., last selected language, sidebar collapsed flag). | **Tokens, passwords, PII, exam answers, anything labelled confidential.** |

#### 2.7.2 Exam answers in IndexedDB (offline buffer)

> Full architecture in [09 — Exam Engine](./09-exam-engine.md). This subsection records the *security posture*; design and lifecycle live in 09.

Exam answers are persisted to IndexedDB so a learner survives a short disconnection (the standing **~60 s** acceptance scenario, [09 §8](./09-exam-engine.md#8-the-60-second-disconnection-acceptance-scenario)). This is **not** a relaxation of the no-PII-in-storage rule — it is a deliberate, scoped exception with the following safeguards:

- **Backend-authoritative grading.** IndexedDB only holds *pending* answers awaiting sync. The server is the single source of truth for what was answered, when, and how it scores. The frontend never reads a "graded" value out of IndexedDB.
- **Origin-bound.** IndexedDB is same-origin only. The CSP `frame-ancestors 'none'` prevents the LMS being framed by another origin to peek at storage.
- **No tokens stored alongside.** The IndexedDB schema has only `{ sessionId, questionId, value, clientSeq, synced }`. No JWT, no user object, no email.
- **Lifecycle-bound.** Drafts are deleted on confirmed final submit, and a defensive sweep prunes anything older than 7 days.
- **Optional client-side encryption** for high-stakes exams. When the exam config flag `encryptDrafts: true` is set:
  - On exam start, the server issues a per-session symmetric key (AES-GCM 256-bit) wrapped to the user's session.
  - The frontend imports the key into the Web Crypto API (`crypto.subtle.importKey`); the raw key bytes never enter a JS variable that lives beyond the session, and never enter `localStorage` or memory dumps written elsewhere.
  - Each `value` is encrypted before `IndexedDB.put` and decrypted lazily on read or sync.
  - The key is discarded on submit / logout / route exit (`crypto.subtle` keys are non-extractable; we drop the reference).
  - Encryption is a **defence-in-depth** measure, not a primary control. The primary controls remain: backend authority, origin isolation, no token co-location, and lifecycle pruning.
- **Threat-model note.** This pattern raises the cost of two specific attacks: (a) a malicious browser extension scraping IndexedDB on a shared device after the learner walks away, and (b) forensic recovery of disk artefacts. It does not protect against an attacker who has compromised the running page's JS context (XSS) — only OWASP-Top-10 hygiene and CSP do.

### 2.8 Clickjacking

- Enforce at origin: `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`).
- No feature intentionally embeds the LMS in a third-party iframe. If a legitimate embed is later needed (e.g., LTI), raise it as a Change Request.

### 2.9 File Uploads / Downloads

- Client-side validation of MIME type and size before upload — backend re-validates authoritatively.
- Downloads use `responseType: 'blob'` and `URL.createObjectURL` — revoke after use.
- Never render an uploaded file's name or content unescaped into templates (XSS vector).

### 2.10 Privacy & Compliance

- PIPEDA (Canada) and GDPR (EU) apply per SOW §8.
- **No tracking cookies** before consent. A cookie banner (to be added in `core/consent/`) gates analytics/ads.
- **Data minimization**: the frontend asks for only the data needed for the current screen.
- **Right-to-erasure** / export: exposed in the profile page and routed to the backend; the frontend does not hold a separate user DB.

### 2.11 Security Review Gate

- Any change that touches `core/auth/`, `core/http/`, or CSP requires an architect + security review.
- The security audit in SOW §6.2.15 will cover penetration testing; we expect zero high/critical frontend findings.

---

## 3. Accessibility (WCAG 2.1 AA)

The bar, per SOW §8, is WCAG 2.1 AA. Practically, we go a step further on perceivability/operability by default; AAA items are adopted where cheap.

### 3.1 Perceivable

- **Color contrast**: 4.5:1 normal text, 3:1 large text (18 pt / 14 pt bold) and non-text (icons, borders of form fields, focus ring).
- **Non-text content** has a text alternative: `alt` on images, `aria-label` on icon-only buttons, `<title>` on SVGs used as content.
- **Video & audio**: captions required for educational video; transcripts where available. The `LessonPlayer` component exposes tracks UI.
- **Responsive text**: layouts must remain usable at 200% zoom and at a viewport width of 320 CSS pixels.
- **Reflow**: no horizontal scrolling at 320 px (except data tables where appropriate).

### 3.2 Operable

- **Keyboard**: every interactive element operable via keyboard. `Tab` order is logical (DOM order). `Escape` closes dialogs, menus, popovers.
- **Focus management**: on route change, move focus to the page heading. On dialog open, trap focus inside; on close, restore focus to the trigger.
- **`:focus-visible`** rings on every control. Never `outline: none` without a replacement.
- **No keyboard traps** (except modal dialogs, where trapping is intentional and documented).
- **Skip links**: "Skip to main content" as the first focusable element in the main layout.
- **Timing**: any exam timer offers warnings and (where not contradicting exam rules) user control to extend or pause.

### 3.3 Understandable

- Language of the page is declared: `<html lang="en">` or `<html lang="ar">`.
- Inline language changes use `lang` on the element.
- Form inputs have **visible labels**, not placeholder-only.
- Errors are **described in text** near the field, associated via `aria-describedby`, and announced via `aria-live="polite"` regions for async validation.
- Consistent navigation and identification across pages (main nav positions remain stable).

### 3.4 Robust

- **Semantic HTML first.** Use `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<section>`. Only reach for ARIA when semantics are insufficient.
- **ARIA patterns**: follow the ARIA Authoring Practices Guide (APG) for composites like tabs, menus, comboboxes, trees, tables.
- **Live regions** (`aria-live="polite"`) for toasts and status updates. Use `aria-live="assertive"` sparingly (interruptions should be rare and critical).
- **Screen reader testing**: components in `ui/` must be verified with at least one screen reader (NVDA on Windows or VoiceOver on macOS) before being merged.

### 3.5 RTL / Bilingual Requirements

- `dir="rtl"` and `lang="ar"` applied at the `<html>` level when Arabic is active.
- Mirrored icons (chevrons, arrows, back/forward) in RTL.
- Text alignment uses logical values (`text-start`), not `text-left`.
- Bidirectional content (Arabic paragraphs containing Latin words/numbers) uses `dir="auto"` where appropriate.
- Translations are professionally reviewed — not machine-translated — before release.

### 3.6 Accessibility Review Gate (per PR)

- Axe DevTools / Lighthouse a11y score: **≥ 95**; zero `serious`/`critical` violations. (Automated checks catch ~30–40% of issues — they're a floor, not a ceiling.)
- **Manual checks** on any UI-affecting PR:
  - [ ] Keyboard-only walkthrough of the changed screen.
  - [ ] Screen-reader pass on the changed component.
  - [ ] LTR & RTL screenshots.
  - [ ] Contrast verified on new colors.
- **Periodic audits**: a full WCAG 2.1 AA audit (internal + third-party) before each milestone acceptance (per SOW §10 milestones).

---

## 4. Browser & Device Support Matrix

| Platform | Browser            | Support           |
| -------- | ------------------ | ----------------- |
| Desktop  | Chrome             | last 2 stable     |
| Desktop  | Edge               | last 2 stable     |
| Desktop  | Firefox            | last 2 stable     |
| Desktop  | Safari (macOS)     | last 2 stable     |
| Mobile   | Safari (iOS)       | last 2 stable     |
| Mobile   | Chrome (Android)   | last 2 stable     |

- **Not supported**: Internet Explorer, any browser older than the "last 2" window. An upgrade notice is shown instead of an attempted render.
- **Polyfills**: none beyond what the Angular CLI default provides. ES2022 is the baseline.

---

## 5. Responsive Design

- **Mobile-first** Tailwind breakpoints: `sm` (640), `md` (768), `lg` (1024), `xl` (1280), `2xl` (1536).
- Target touch target size ≥ 44 × 44 CSS pixels on controls (WCAG 2.5.5 AAA — we adopt it as baseline).
- Test on real devices for critical flows (course enrollment, exam, checkout) — not just DevTools emulation.
- Data tables collapse into card-like rows on small screens; complex dashboards expose a mobile-first summary and push full detail to desktop.

---

## 6. Error Resilience (part of uptime)

- Every page has defined **loading**, **empty**, **error** states (see [02 §12](./02-component-design-reusability.md#12-example-building-a-feature-screen-from-primitives)).
- A root-level `ErrorHandler` logs uncaught exceptions and shows a graceful fallback rather than a blank page.
- On asset-load failure (chunk hash mismatch after a deploy), the app detects the error (`Failed to fetch dynamically imported module`) and prompts a page reload.
- WebSocket disconnects are expected and surfaced via a subtle connection indicator; data polling fallback keeps the user productive.
- **Exam sessions specifically** are engineered to survive short disconnections: answers are queued in IndexedDB, a 30-second heartbeat detects stalled sockets, and the **~60 s disconnection scenario** ([04 §6.4](./04-api-integration-data-flow.md#64-disconnection-test-scenario-60-seconds)) is a standing acceptance test.

---

## 7. Summary — Release Readiness Checklist

Before any milestone acceptance, these must all be green:

**Performance**

- [ ] Bundle budgets respected.
- [ ] FCP ≤ 1.8 s and LCP ≤ 2.5 s on a throttled mid-range mobile (4G).
- [ ] No layout shift on initial render (CLS ≤ 0.1).
- [ ] Lazy routes load in ≤ 500 ms on mid-range mobile.
- [ ] No new heavy library imported into the app shell — heavy code lives behind `loadComponent`/`loadChildren`/`@defer`.

**Security**

- [ ] CSP enforced in PROD.
- [ ] No `bypassSecurityTrust*` usage without ADR.
- [ ] No tokens in `localStorage`.
- [ ] IndexedDB usage limited to exam answer drafts per §2.7.1; no PII or tokens stored there.
- [ ] If `encryptDrafts: true` is enabled for the release scope, encryption-key handling reviewed by an architect.
- [ ] `npm audit` clean for high/critical.
- [ ] HTTPS enforced; HSTS active.

**Exam engine**

- [ ] 30-second heartbeat verified active during exam session.
- [ ] ~60-second disconnection scenario passes end-to-end ([04 §6.4](./04-api-integration-data-flow.md#64-disconnection-test-scenario-60-seconds)).
- [ ] Submit blocked while `pendingOps.length > 0`.
- [ ] On confirmed submit, IndexedDB drafts for that session are deleted.

**Accessibility**

- [ ] Axe scan — zero serious/critical.
- [ ] Lighthouse a11y ≥ 95.
- [ ] Manual keyboard walkthrough of all primary flows.
- [ ] Screen-reader smoke test of new components.
- [ ] LTR + RTL visual regression (or manual walkthrough).
- [ ] Professional Arabic translation review complete for release scope.
