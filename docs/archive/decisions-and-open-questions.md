# Decisions & Open Questions (Early Implementation)

> From the Phase 1–2 mock-removal / real-auth-wiring stage. Mostly resolved;
> kept for provenance on why the app is shaped the way it is.

## Decisions made during implementation

- **Roles:** Frontend `AppRole` redefined to the real backend space —
  `student | super_admin | learning_admin | content_creator | finance_admin |
  support_admin` — replacing the mock `learner | instructor | admin | support`.
  A student's session `roles = ['student']`; an admin's `roles = [<AdminRole>]`.
- **Refresh:** switched from an in-memory refresh token to the real httpOnly
  refresh cookie. `AuthApi` calls `/auth/*` with `withCredentials: true`;
  `/auth/refresh` works for both student and admin tokens (backend branches
  on the token's `type` claim). App boot silently attempts `/auth/refresh`.
- **Login mapping:** the login form's `identifier` maps to the backend
  `email`.
- **Route guards:** "any authenticated" branches (dashboard/courses/
  assessments) use `authGuard`; `/admin` is gated to the five admin roles.
- **Auth interceptor:** public-path regex broadened to also skip
  `/auth/admin/*`.
- **Password-reset pages** call `AuthApi` directly (stateless, no session)
  and manage their own local submit/error state — `problemDetailMessage()`
  renders RFC-7807 errors inline.

## Open questions posed to the reviewer (status noted where known)

1. **Register flow:** the real backend `POST /auth/register` does not
   return a session — the student must verify their email before logging in
   (the mock auto-logged-in). Changed `AuthStore.register` to create the
   account then route to `/auth/login` with a "check your email" flag (no
   auto-login). *Resolved: this is the shipped behaviour.*
2. **Environments:** `environment.*.ts` are "explicit direction only" per
   CLAUDE.md §13. dev/default → `https://api-dev.instituteofscrum.org/api/v1`,
   prod → `https://api.instituteofscrum.org/api/v1`; placeholder test/uat
   hosts repointed to dev to avoid dead URLs. *Resolved: this is the shipped
   config; confirm before any dedicated test/uat environment stands up.*
3. **User-facing app scope:** with the mock backend removed, landing/
   dashboard/insights/notifications/profile would 404 at runtime until wired
   page-by-page. Chose (a) wire them incrementally, focusing on Admin first
   per the mission. *Resolved: this became the whole Phase 3→4 build order.*
4. **Password-reset link target:** the backend password-reset email links to
   the backend-hosted page (`APP_BASE_URL/reset-password?token=`), not the
   SPA's `/auth/new-password`. The SPA page is correctly wired to
   `POST /auth/reset-password`, but for the SPA flow to run end-to-end the
   reset email needs to point at `…/auth/new-password?token=` — a
   backend/infra config choice (backend is read-only from the frontend
   side). *Status: unresolved / infra decision, not revisited since.*
5. **Arabic i18n:** every new namespace shipped in `ar.json` needs
   professional review per CLAUDE.md §9. *Status: still the largest standing
   cross-cutting debt — see
   [`../status/known-issues.md`](../status/known-issues.md).*
