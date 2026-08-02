# Open Backend Issues (`BE-I-xx`)

> Full technical detail for issues that are **still open** on the backend.
> For a quick current-relevance summary, see
> [`../../status/known-issues.md`](../../status/known-issues.md). For issues
> that have since been **resolved**, see
> [`../../archive/backend-issues-resolved.md`](../../archive/backend-issues-resolved.md).
>
> Per the mission rules, these are documented, not fixed — `IOS_Backend/` is
> read-only. Last verified against backend source: 2026-07-27/29, HEAD `7160f11`.

## BE-I-23 — `GET /exam/sessions/:sessionId` returns no questions

**Severity: Medium.** A mid-exam tab reload cannot redraw the question list
from the backend.

The only endpoint that returns exam questions is `POST /exam/start` — and it
consumes the one-time access code, so it can't be replayed (second call →
409). `GET /exam/sessions/:sessionId` returns only
`{ sessionId, remainingSeconds, answers, status }` — no `questions` anywhere
in the session-read path. After a full reload, the SPA has lost the
in-memory question list and can't fetch it again.

**Expected contract:** either the session read includes `questions` (same
shape as `POST /start`, `isCorrect` stripped), or a dedicated
`GET /exam/sessions/:sessionId/questions`.

**Frontend workaround (shipped):** persists a local question snapshot in
IndexedDB at start (`PersistedExamSession` in the `sessionMeta` store),
rehydrates the runner from it on resume, refreshes `answers`/`remainingSeconds`
from the server when reachable. A deliberate, architect-review-flagged
stretch of the "answer-drafts-only" IndexedDB rule (snapshot carries no
correct-answer flag, no PII). Reducible to answers-only if the backend adds
questions to the session read.

## BE-I-24 — No `certId` exposed at exam entry

**Severity: Low/Medium.** The pre-exam identity-confirmation step can't be
completed by the frontend.

`POST /exam/pre-exam-confirmation` requires a `certId` (UUID), but nothing
reachable at exam-entry time yields it: `POST /exam/validate-access` returns
`exam:{ id, title, durationMinutes, passingScore }` — no `certId`.
`POST /exam/start` likewise omits it. The marketing certificate pages are
static, keyed by slug (`epo`, `esm`, …), not the backend UUID.

**Expected contract:** return `certId` on `validate-access` (and ideally
`start`/the session read).

**Frontend workaround (shipped):** the identity attestation (name/ID) is
collected on the verify page but not POSTed to `pre-exam-confirmation`. Safe
because the backend still enforces it server-side: for purchase-enrolled
students, `start` returns 409 "Pre-exam identity confirmation is required,"
surfaced on the ready page. Admin-issued codes without a purchase row (the
current real assignment path) skip the gate entirely, so the flow works
end-to-end today regardless.

## BE-I-25 — No date-of-birth storage

**Severity: Medium. The only genuine hard stopper currently open.** Blocks
`/auth/complete-account` outright.

`PATCH /me` (`UpdateProfileDto`) accepts only phone/locale/country/city/
street/address/postalCode/occupation/position/company. The `User` entity has
**no** date-of-birth column (checked: nothing in `user.entity.ts`,
migrations, or the DTO). But the `complete-account` wizard's step 1 requires
a birthday.

**Expected contract (one of):** add a `dateOfBirth` (nullable date) column +
validated `UpdateProfileDto` field, **or** confirm birthday is out of scope
so the design can drop the step.

**Frontend impact:** `complete-account.page` remains a stub (`onSubmit` →
navigate to `/dashboard`, saves nothing). Could be partially wired now
(address/contact fields the backend accepts) but that silently drops the
birthday (data-loss/UX issue) and needs a cross-feature `ProfileApi`
boundary decision too (`ProfileApi` lives in `features/profile`;
cross-feature imports are banned per CLAUDE §5 — either promote a
profile-update call to `core/`, or add an auth-feature-local `PATCH /me`
transport). Deferred pending both decisions.

## BE-I-27 — narrowed: no media upload for CMS sections or blog bodies

**Severity: Medium.**

Two presigned-upload paths exist: avatars (`POST /me/avatar-upload-url`) and,
since `66a7632`, **catalog certificate images**
(`POST /admin/catalog/:id/image-upload-url` → `{ uploadUrl, requiredHeaders,
key, publicUrl }`, public-read ACL, caller must echo `requiredHeaders`
including `x-amz-acl: public-read`). **Still missing:** any generic admin
media endpoint — CMS section image fields (`hero`, `logo_cloud`,
`media_embed`, page `ogImageUrl`, …) and blog `contentHtml` images have no
upload path.

**Expected contract:** `POST /admin/media/upload-url { contentType, scope? }`
→ `{ uploadUrl, requiredHeaders, key, publicUrl }`, reusing the catalog
mechanics with a content-type allowlist.

**Frontend impact:** catalog form has a real picker now (done); CMS/blog
editors must keep a "paste an image URL" field and say so in the UI.

## BE-I-28 — No CMS draft preview

**Severity: Low/Medium.** Editors can't see a page before publishing.

`CmsService.getPublicPage()` 404s unless `page.status === PUBLISHED`; the
admin read returns the raw page+sections but not the hydrated,
locale-resolved, SEO-decorated shape the public renderer consumes. No
tokenised preview route exists.

**Expected contract:** a tokenised `GET /cms/preview/:token` or an
admin-authenticated `GET /admin/cms/pages/:id/preview` returning the public
projection for any status.

**Frontend impact:** admin CMS editor can only offer a structural preview
built from the admin payload — state the limitation in the UI, don't fake
WYSIWYG.

## BE-I-31 — CMS conflict sentinels are message prefixes, not error `code`s

**Severity: Low (contract hygiene) — a workaround exists but it's fragile.**

| Condition | Raised as | `code` actually emitted |
| --- | --- | --- |
| `CMS_PAGE_NOT_PUBLISHABLE` | `CmsPageNotPublishableException` | ✅ `CMS_PAGE_NOT_PUBLISHABLE` |
| `SLUG_LOCKED` | `new ConflictException('SLUG_LOCKED: …')` | ❌ `RESOURCE_ALREADY_EXISTS` |
| `SYSTEM_PAGE_PROTECTED` | `new ConflictException('SYSTEM_PAGE_PROTECTED: …')` | ❌ `RESOURCE_ALREADY_EXISTS` |
| `SECTION_NOT_IN_PAGE` | `new BadRequestException('SECTION_NOT_IN_PAGE: …')` | ❌ `VALIDATION_FAILED` |

Only the first is a real `AppException` with its own code. The other three
flatten to a generic `code` by status — a genuine slug collision, a locked
slug, and a protected system page are **indistinguishable by `code`**. The
sentinel survives only as a prefix inside the human-readable `detail` string,
which is not a stable contract (and would break silently if `detail` is
ever localised, which the backend already does elsewhere via `X-Lang`).

**Status note:** the CMS admin frontend that found this was rolled back the
same day it was discovered, so no frontend code currently depends on the
sentinels. Will be hit again on CMS-ADMIN rebuild. The identical pattern
already exists on blog's own `SLUG_LOCKED`.

**Workaround if needed:** substring-match `detail` in one isolated helper
(the rolled-back session's `cms.store.ts#classifyFailure` — reuse that
pattern rather than reinventing it).

**Backend ask:** promote the three sentinels to real `ErrorCode` entries with
their own `AppException` subclasses, as `CMS_PAGE_NOT_PUBLISHABLE` already is.

## BE-I-32 — `submit` returns no `attemptId`

**Severity: Low–Medium (UX gap, no data risk).**

`POST /exam/sessions/:sessionId/submit` and `.../late-submit` resolve to
`ScoreResult { score, passed, correctCount, totalCount }` — no `attemptId`,
no other field identifying the attempt row just written. But the review
endpoint (`GET /exam/attempts/:attemptId/review`, added `66a7632`) is keyed
by exactly that. The result screen is routed as
`/assessments/result/:sessionId`, so after finishing an exam the frontend
holds a **session** id and a score, with no way to name the **attempt** it
just produced.

**Why the obvious workaround (call `GET /exam/attempts`, take the newest
row) was rejected:** wrong under a retake submitted moments earlier, or a
concurrent attempt on another device. Guessing an identity for a page that
reveals the answer key isn't a trade worth making.

**Frontend impact (shipped):** `ios-exam-review-page` is routed at
`/assessments/review/:attemptId`, linked from the dashboard's attempt-history
list (unambiguous id) rather than the result screen. Functionally complete,
one extra click; the "review right after your result" flow isn't achievable
until this is fixed.

**Backend ask:** add `attemptId` to `ScoreResult` (both submit and
late-submit) — additive, the row is already in hand at `scoreAndPersist`.

## Behavioural notes (not stoppers — the frontend already adapts)

- **BE-I-01 / BE-I-12** — no global response envelope; validation errors
  return 400 with `code`; exam domain-state conflicts return 409 (`5c11460`).
  Mock-exam still uses 422 for its own conflicts. Map per endpoint, key off
  `code`/`errors[]`, never status alone.
- **BE-I-02** — refresh cookie is `SameSite=Lax` (not `Strict` as some early
  docs assumed), `Secure` only in prod/staging.
- **BE-I-09** — two overlapping "list exams for a cert" endpoints (assign vs
  authoring) — pick per screen deliberately.
- **BE-I-10** — `GET /health` is at the bare origin; `/health/full` is under
  `/api/v1`.
- **Week-9 i18n** (`be902fe`/`d67d7ff`) — backend `SUPPORTED_LOCALES` is
  `en/tr/fr/es/ar/de`; validation errors + emails localized by `X-Lang`. No
  FE break — app UI stays en/fr/ar, extra locales are authoring targets only.
