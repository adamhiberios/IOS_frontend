# Credentials

`features/credentials`, 1 page, `/dashboard/credentials`, `authGuard`.

`CredentialsStore.load()` → `GET /me/certificates` (`{ data }`, no
pagination). Item: `{ certId (nullable), program, programCode, issuedAt,
status:'valid'|'revoked', certificateUrl, qrUrl, verifyUrl }`.

**Deliberately a distinct feature from `features/certificates`**, which is
the mock-then-real learning hub at `/dashboard/certificates` (see
[`certificates-mock-exam.md`](./certificates-mock-exam.md)) — this is the
earned-credentials list. `credentials.routes.ts` documents the split.
Reviewer decision was left pending on whether to later fold these together
or promote credentials to a primary nav tab; as shipped, both
"Certificates" and "My credentials" appear in the user-menu dropdown and the
primary dashboard tab bar (5 tabs: Overview · My certificates · My
credentials · Profile · Settings).

Page states: loading / error+retry / empty / list. Each row shows program,
code chip, issue date, a valid/revoked status badge, and per-row Download
PDF / QR / Verify links (each rendered only when its URL is present,
`target=_blank rel=noopener noreferrer`). No pre-existing standalone "verify
a certificate" page existed anywhere in the app when this was built — the
public `GET /verify/:certId` link lives only via each row's `verifyUrl`.

Store cleared on `user.logged-out` (certs are PII).
