# Profile & Settings

`features/profile` (3 pages) + `features/settings` (3 pages), `authGuard`.

## Profile — fully REAL

`GET /me`, `PATCH /me`, `PATCH /me/password`, and the three-step presigned
avatar upload (`POST /me/avatar-upload-url` → PUT to storage via a bare
`HttpBackend` client, bypassing the interceptor chain → `PATCH /me
{avatarUrl:key}`). See
[`../conventions/frontend-data-access-patterns.md`](../conventions/frontend-data-access-patterns.md#object-storage-uploads-avatar--catalog-images)
for the general upload pattern.

- `profile.page.ts` (view) — the Figma "Username"/"IOS ID" slots have no
  backend equivalent; replaced with real data (Phone, Member since from
  `createdAt`). `firstName`/`lastName`/`email` are read-only (locked
  server-side — they appear on issued certificates).
- `edit-profile.page.ts` — sends only editable fields. Country/city relaxed
  to optional (backend doesn't require them; forcing them blocked saving
  when a loaded field was null).
- `change-password.page.ts` — wired to `PATCH /me/password`. **A success is
  treated as a forced logout** — the backend revokes all sessions and clears
  the refresh cookie, so the success dialog's "Ok" calls `AuthStore.logout()`.

## Settings — MIXED

**Real:** GDPR export (`GET /me/export` as a Blob,
`ios-lms-export-<YYYY-MM-DD>.json` download) and step-up account deletion
(`POST /me/delete` with password confirm-field, then forced logout — account
is anonymised-in-place server-side, sessions revoked).

**Not real (UI-only, no backend endpoint):** five bare notification toggles +
a newsletter toggle bound to nothing;
`newsletterEmail = signal('adam.ama.@gml.co')` is a hardcoded placeholder
address rendered to the user.

**Stub with a confirmation screen that lies:**
`/dashboard/settings/cancel-subscription` → navigates straight to
`/dashboard/settings/subscription-cancelled`, which tells the user their
subscription is cancelled. **No backend `subscription` endpoints exist at
all** — the payment module exposes only `checkout`/`retake`/
`transactions`/`webhook`. Both pages should be treated as not-yet-buildable
against the current backend, not merely "unwired."

## Delete-account UX decisions worth knowing

The confirm input is a **password** field (step-up re-auth,
`autocomplete="current-password"`), not a "type DELETE" gate. A wrong
password surfaces inline via a 401. Export defaults `?includeAnswers` off
(omits the raw exam-answers blob).
