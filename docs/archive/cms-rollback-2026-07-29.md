# CMS Admin — Built Then Rolled Back (2026-07-29)

> Slices 9 and 10 of [`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md)
> (page list/editor, the shared 16-type section registry, the
> descriptor-driven section editor, the globals editor) were built in one
> session on 2026-07-29, verified green (typecheck/lint/production build),
> and then **rolled back at the user's direction before review**. Every CMS
> file was deleted and every CMS edit to a shared file reverted; `src/`
> contains **no** reference to `/cms`, `AdminCms*`, or `CmsSection*`. The
> backend CMS module is once again entirely unconsumed, exactly as it was
> before this session.

## What was kept

The **`/admin/contact` inbox** (BE-I-26, plan Slice 10) never depended on the
CMS code: it talks to its own `/admin/contact` endpoints, has its own
data-access layer, and shares nothing with the CMS files beyond a route and a
nav entry. It is staged and ready to commit — see
[`../status/current-status.md`](../status/current-status.md).

## Findings worth not rediscovering when CMS-ADMIN is rebuilt

These are properties of the *backend*, not of the deleted code — still true,
re-verify against source at the start of the rebuild:

1. **`GET /admin/cms/pages/:id` and `GET /admin/cms/globals/:key` are
   bare** — no `{ data }` wrapper — while every write on the same controller
   *is* wrapped, and `DELETE` returns only `{ id, status }`. Map per
   endpoint (BE-I-01). See
   [`../reference/backend/cms-blog-contact.md`](../reference/backend/cms-blog-contact.md).
2. **`SLUG_LOCKED` / `SYSTEM_PAGE_PROTECTED` / `SECTION_NOT_IN_PAGE` are not
   error `code`s** — message prefixes on plain Nest exceptions, so they
   flatten to generic codes and cannot be branched on as the plan originally
   assumed. Filed as **BE-I-31** — see
   [`../reference/backend/open-issues.md`](../reference/backend/open-issues.md).
   The finding stands whether or not any frontend code currently consumes it.
3. **Reorder (`PUT /pages/:id/sections/order`) is `learning_admin` only** —
   narrower than the `content_creator`-allowed section edits it reorders.

## Design recommendations from the rolled-back attempt (worth reusing)

- **Put the section-type registry in `@shared/types`**, not the CMS feature —
  both the public renderer and the admin editor need the same
  `config`+`content` pairing; defining it twice guarantees drift.
- **Generate per-type section forms from descriptors rather than
  hand-writing 32 shapes** — hand-writing duplicates the backend's
  `SECTION_SCHEMAS` as a second validation source that drifts, and the drift
  shows up as an editor blocked from saving something the server would
  accept. Let descriptors drive layout only; keep the backend authoritative;
  surface its 400 `errors[]` (per-field) verbatim beside the form.
- **Globals have no per-key schema on the backend** (`global.dtos.ts`
  accepts any object) — a validated JSON editor is the honest interim; a
  structured editor should wait until the public-chrome globals slice (Plan
  Slice 7) settles what the chrome actually reads.
- **`classifyFailure` helper** — the rolled-back session isolated the
  BE-I-31 `detail`-substring-match workaround into one helper
  (`cms.store.ts#classifyFailure`). Reuse that pattern rather than
  reinventing it if the workaround is needed before BE-I-31 is fixed
  server-side.

These recommendations are folded into
[`../reference/cms-frontend-plan.md`](../reference/cms-frontend-plan.md)
Slices 9–10 directly — this file exists so the "why" behind them isn't lost.
