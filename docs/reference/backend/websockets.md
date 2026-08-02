# WebSocket Contracts (Socket.IO)

Both gateways: JWT in the handshake — `{ auth: { token: '<accessJWT>' } }`
(or `Authorization: Bearer` header); invalid ⇒ immediate disconnect.
Transports: `['websocket','polling']`. CORS = same allowlist as HTTP.

## Exam gateway — namespace `/exam` (`ExamGateway`)

- **C→S:** `join_session { sessionId }` → ack `{ joined, remainingSeconds }`
  (ownership-checked against the caller's Redis session).
- **S→C:** `timer_tick { sessionId, remainingSeconds }` every **30s**;
  `warning { sessionId, remainingSeconds, threshold }` at **600s** and
  **300s**; `session_expired { sessionId }` when the Redis TTL hits zero
  (**terminal**).

Frontend consumer: `exam-session.ws.ts` (`ExamSessionWs`), route-scoped at
`/run/:sessionId`. Staleness watchdog: no server message for >70s while
"open" → forced reconnect. Reconnect via Socket.IO built-in (1s → 30s
backoff, infinite attempts capped by route lifetime).

## Mock gateway — namespace `/mock` (`MockExamGateway`)

- **C→S:** `join_session { attemptId }` → ack `{ joined, remainingSeconds }`.
- **S→C:** `timer_tick { attemptId, remainingSeconds }`; `warning {
  attemptId, remainingSeconds, threshold }` at 600/300s; **`time_up {
  attemptId }`** — a **one-shot, NON-terminal** signal. The mock timer is
  soft: nothing auto-submits; the student can `POST /mock/:id/extend` and
  re-`join_session`.

Frontend consumer: `mock-session.ws.ts`, reuses the exam WS shape/pattern.

## Frontend engine discipline (CLAUDE.md §10, `08-exam-engine.md`)

Keep the 30s heartbeat, read the timer from `timer_tick`/server state (never
a local clock as the anchor — the runner interpolates DOWN locally between
ticks, never below the last server value), and treat `/exam` as terminal but
`/mock` as soft.

**Reconciliation note:** the aspirational engine spec (`08-exam-engine.md`)
describes a richer engine (raw WebSocket + app-level ping/pong,
`AnswerOp`/discriminated `AnswerValue` union, draft encryption, `clientSeq`
on the wire) than the live backend implements. What actually shipped:

- Answers are a flat `Record<questionId, optionId>` map, single-select only
  (`mcq`|`true_false`) — no per-answer op, no essay type.
- `clientSeq` is **not on the wire** — autosave/submit post the whole current
  answers map (last-write-wins); `clientSeq` is a frontend-internal
  ordering/dedupe key for IndexedDB draft rows only.
- No draft encryption — `POST /start` issues no per-session key; drafts hold
  only `{ questionId, optionId }` (no PII), so plaintext IndexedDB is
  policy-compliant.
- WS is Socket.IO, not raw WS.
