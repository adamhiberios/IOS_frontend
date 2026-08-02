# Assessments — Real Exam Engine

`features/assessments`, 4 pages, lazy at `/assessments`, `authGuard` +
`examDraftSweepGuard`. The most carefully engineered feature in the app —
built across 5 slices (`b951242`), **architect review still pending** (see
[`../../status/known-issues.md`](../../status/known-issues.md)).

## Architecture

`ExamSessionStore`, `ExamSessionWs`, and `EXAM_DRAFT_STORE` are **route-scoped
providers** on `run/:sessionId`, so each attempt gets a fresh instance and
the socket/timers die on route exit. The pathless parent runs
`examDraftSweepGuard` to clear stale IndexedDB drafts (7-day prune) —
realized as exam-area-entry rather than app-boot, keeping the IndexedDB/exam
code out of the app shell (CLAUDE §7).

## Routes

- **`/assessments/verify`** → `POST /exam/validate-access` with the one-time
  code, without consuming it. Builds an `ExamReadyNavState`, navigates with
  `{state}`. Identity attestation (name/ID) collected but explicitly not sent
  — the pre-exam-confirmation call needs a `certId` the FE cannot obtain here
  (BE-I-24).
- **`/assessments/ready`** — reads nav-state in the constructor; a direct URL
  yields `navState() === null` and a dead CTA (**NAV-STATE-only page** — no
  fetch fallback). `onStart` → `POST /exam/start` → navigate to
  `/run/:sessionId` with `{start, ctx}`. 409 handling names BE-I-24 explicitly.
- **`/assessments/run/:sessionId`** — `GET /exam/sessions/:id` for the
  authoritative baseline, `POST …/autosave` for the queued/flushed answer
  stream, `POST …/submit`/`late-submit`; WS namespace `/exam` for
  `timer_tick`/`warning`/`session_expired`. Because **BE-I-23** means
  `GET /exam/sessions/:id` returns no questions, the store rehydrates the
  question list from an IndexedDB snapshot on reload. Functional, but the
  resume path depends on client-side storage — a cleared browser mid-exam
  cannot redraw the paper.
- **`/assessments/result/:sessionId`** — pure **NAV-STATE**: reads `score`
  and `examTitle` from `getCurrentNavigation()`, never fetches. `:sessionId`
  is decorative. Direct URL or refresh → `score = null`. The "Review Correct
  Answers" section was removed with a comment block naming BE-I-22 — since
  fixed; the review is now reachable at `/assessments/review/:attemptId`
  (linked from exam history, not this page — see BE-I-32 in
  [`../backend/open-issues.md`](../backend/open-issues.md)). The Download-PDF
  button opens a static asset (`/assets/images/certificate.png`), not a real
  generated PDF.

## Engine internals (5 slices, `b951242`)

1. **REST data-access** (`exam.dto/model/mappers/api.ts`) — verbatim wire
   shapes, `isCorrect` stripped server-side on options.
2. **IndexedDB draft layer** (`exam-draft.store.ts`) — key is
   `[sessionId, questionId]`, not the aspirational spec's
   `(sessionId, questionId, clientSeq)` triple, since the live backend has no
   per-answer endpoint (bulk last-write-wins map only matters latest-per-
   question). `clientSeq` is a monotonic guard field. No encryption (no
   per-session key issued, no PII in drafts). 7-day boot sweep implemented,
   wired at exam-route activation.
3. **`ExamSessionStore`** — route-scoped signal store, single writer of
   session state; `hydrateFromStart`/`resume`/`setAnswer` (optimistic → IDB
   put → debounced ~1s bulk autosave) /`flushQueue`/`submit`/`lateSubmit`.
   Submit 409 (already submitted) and late-submit 403 (grace closed) are
   treated as terminal with `score=null` (result page reads the score from
   `GET /exam/attempts` in that case).
4. **`ExamSessionWs`** (Socket.IO, `socket.io-client@4.8.3`, lazy-chunk only)
   — `join_session` re-emitted on every reconnect; staleness watchdog
   (>70s no message while "open" → forced reconnect); reconnect via
   Socket.IO built-in backoff.
5. **UI rewire + routing** (5a/5b) — runner/result pages wired to the store;
   timer reads `ws.serverTick()` and interpolates DOWN locally, never below
   server value; submit gated by `store.canSubmit()`; a11y (`role="radiogroup"`,
   `aria-live` for warnings/sync status, `dir="auto"` for bidi text); entry
   pages (verify/ready) rewired; boot sweep wired; obsolete email-link mock
   dialogs deleted.

## Reconciliation with the aspirational spec (`08-exam-engine.md`)

The live backend implements a narrower engine than the spec describes — see
[`../backend/websockets.md`](../backend/websockets.md#reconciliation-note)
for the full list (flat answer map, no `clientSeq` on the wire, no draft
encryption, Socket.IO not raw WS).

## Open backend gaps affecting this feature

BE-I-22 (resolved — review endpoint now exists), BE-I-23 (resume has no
questions from the server), BE-I-24 (no `certId` at entry), BE-I-32 (no
`attemptId` on submit). Full detail:
[`../backend/open-issues.md`](../backend/open-issues.md).
