# Known Issues

> Active blockers, pending reviews, and known frontend gaps that matter right
> now. For resolved issues and historical detail, see
> [`../archive/backend-issues-resolved.md`](../archive/backend-issues-resolved.md).
> Full technical detail on everything still open is in
> [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md).

## Pending reviews (process blockers, not backend blockers)

- **C1 — Admin OTP login** (`ae6ae44`, `core/auth`) — built, but **must not ship
  before a security review**. Checklist: refresh-cookie routing decision
  (currently on the shared `/auth/refresh`, needs confirming), no-partial-session
  guarantee, single-flight refresh race, bootstrap-refresh path. See
  [`../archive/changelog.md`](../archive/changelog.md) for the full write-up.
- **Real-exam engine** (`b951242`, `features/assessments`) — built across 5
  slices, functionally complete, but needs an **architect review** before it's
  considered done (CLAUDE.md §10 / `08-exam-engine.md`).

## Active backend blockers (backend NOT fixed)

| # | Blocks / degrades | Current workaround |
| - | - | - |
| **BE-I-23** | Reload-resume of a live real exam — `GET /exam/sessions/:id` returns no questions | A local IndexedDB question snapshot rebuilds the paper on resume. Degrades if IndexedDB is unavailable. |
| **BE-I-24** | Driving `POST /exam/pre-exam-confirmation` from the FE — no `certId` returned at exam entry | Deferred: relies on `start`'s 409 "identity confirmation required" instead. Works end-to-end for the current (admin-issued-code) assignment path. |
| **BE-I-25** | `/auth/complete-account` onboarding wizard | **Only genuine hard stopper left.** No date-of-birth column anywhere in the backend, but step 1 of the wizard requires a birthday. Wizard stays a stub until DOB storage exists or the step is dropped. |
| **BE-I-27** (narrowed) | Images in CMS section / blog-body editors | Catalog certificate images now have a real upload (`66a7632`). CMS sections + blog `contentHtml` images still need a "paste a URL" field with a visible hint. |
| **BE-I-28** | Draft preview in the admin CMS editor | Public reads are PUBLISHED-only; no tokenized preview route exists. Admin CMS editor can only offer a **structural** preview — must say so, not imply WYSIWYG. |
| **BE-I-31** | Telling CMS conflict errors apart by RFC-7807 `code` | `SLUG_LOCKED` / `SYSTEM_PAGE_PROTECTED` / `SECTION_NOT_IN_PAGE` are plain exceptions with the sentinel only as a message prefix — all three flatten to a generic `code`. Workaround: substring-match `detail` in one isolated helper (`cms.store.ts#classifyFailure`, from the rolled-back session — reuse it, don't reinvent). Same pattern exists on blog's own `SLUG_LOCKED`. |
| **BE-I-32** | Linking a student from their exam result straight to their own answer review | `submit`/`late-submit` return no `attemptId`. Shipped workaround: review is reached from the attempt-history list (unambiguous id) instead of the result page. Guessing the newest attempt was rejected — wrong under retakes/concurrent attempts. |

**Severity note:** BE-I-25 is the only hard stopper. BE-I-23/24 are shipped
degraders (real-exam engine works, with documented reduced behaviour).
BE-I-27/28 cap CMS editor quality but don't block starting CMS work. BE-I-31/32
are contract hygiene, not stoppers.

## Known frontend gaps / bugs (from the 2026-07-25 static-analysis page audit)

See [`../reference/pages/cross-cutting-findings.md`](../reference/pages/cross-cutting-findings.md)
for the full inventory (dead links, orphan pages, i18n gaps, stub pages). Headline
items still believed current:

- **`/courses` was an orphan route** (no nav entry) — being resolved by the
  in-flight learning-hub dedup (see [`current-status.md`](./current-status.md));
  confirm on next audit pass.
- ~~Six `/certifications/{psm,asm,ppo,apo,psf,asf}` dead links on the landing
  page's certification-comparison grid~~ — ✅ fixed 2026-08-03. The 4 wrong
  slugs (`psm`/`asm`/`ppo`/`apo`) in `market-stats-section.ts#certTableRows`
  now point to the real routes (`esm-p`/`esm-a`/`epo-p`/`epo-a`). `psf`/`asf`
  were already non-issues by inspection — that Scrum Facilitator row's
  practitioner/authority cells render as plain "coming soon" text
  (`@if (cell.link)` guards the anchor, `link: ''`), not as links, so there
  was never a dead link there; only the i18n labels exist for future use.
- **`features/payments` is a dead feature** — checkout/retake/transactions
  data-access exists and works, but no page injects it; there is no
  purchase/enrolment flow in the routed app.
- **`/dashboard/settings`** — five notification toggles + newsletter email are
  UI-only (bound to nothing; `newsletterEmail` is a hardcoded placeholder
  address). No backend preferences endpoint exists.
- **`/dashboard/settings/cancel-subscription`** — stub; no subscription
  endpoints exist on the backend at all (payments module has only
  checkout/retake/transactions/webhook).
- **`/contact`** (the old static marketing page, not the CMS `contact_form`
  section) — still a `setTimeout`-faked stub. Superseded by CMS Slice 6 once
  the CMS renderer ships.
- ~~Login/register social buttons are no-ops~~ — ✅ resolved 2026-08-03: the
  "Or continue with" divider + social-provider buttons were removed from both
  `login.page.ts` and `register.page.ts` at the user's direction, rather than
  left as dead UI. `ui/social-button/` component itself is untouched (kept in
  case OAuth is picked up later) — it's just unused for now.

## Cross-cutting debt

- **Arabic i18n** across every shipped screen still needs professional review
  (CLAUDE.md §9) — the largest standing cross-cutting item.
- **Testing deferred** per SOW §6.2.14 — nothing shipped since the backend
  handoff has been runtime-tested against api-dev.
- **Response envelopes are inconsistent per endpoint** (BE-I-01, not a bug —
  a standing backend convention) — bare DTO vs `{ data }` vs
  `{ data, meta }`. Always check
  [`../reference/backend/api-conventions.md`](../reference/backend/api-conventions.md)
  and the specific endpoint doc before writing a mapper.
