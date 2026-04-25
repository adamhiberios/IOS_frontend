# 09 — Exam Engine Architecture

The exam engine is the highest-stakes feature in the Institute of Scrum (IOS) LMS. It hosts mock and certification assessments where the cost of losing answers, miscounting time, or misattributing scores is reputational damage to IOS and direct harm to learners. This document is the consolidated source of truth for how the engine is designed on the frontend.

It supersedes — and is referenced from — the exam-engine fragments in [03 §11.1](./03-state-management.md#111-exam-answer-drafts-offline-first-with-indexeddb), [04 §6.2–§6.4](./04-api-integration-data-flow.md#62-heartbeat-30-seconds), and [06 §2.7.2](./06-performance-security-accessibility.md#272-exam-answers-in-indexeddb-offline-buffer).

> **Three immovable rules.** (1) The **backend** decides scores, time, and submissions. (2) The frontend is **offline-friendly**, not authoritative. (3) Local storage is a **transport buffer**, not a state of record.

---

## 1. Goals & Non-Goals

**Goals**

- Learner can answer questions even during a short network drop (acceptance: **~60 s** of disconnection).
- No answer is silently lost — every answer reaches the server, in order, with idempotent semantics.
- The exam timer cannot be extended by clock manipulation, tab close, or refresh.
- The submit action is unambiguous: it succeeds, it fails, or it is converted into an auto-submit by the server. There is no "maybe submitted" state.
- The UI feels instant: typing an answer never blocks on the network.

**Non-Goals**

- Full offline-first PWA experience for course content (out of scope; only exam answers are persisted locally).
- Client-side scoring (forbidden — the backend grades).
- Survival of long disconnections (>2 minutes is the server's problem; the client surfaces a clear "exam paused" state).
- Anti-cheating measures beyond the backend's proctoring API (camera/mic capture is out of scope for v1).

---

## 2. Lifecycle

```
                 ┌──────────────────────────────────────────────────────┐
                 │                  ExamSessionStore                     │
                 │        (route-scoped, destroyed on exit)              │
                 └──────────────────────────────────────────────────────┘
                                       │
   ┌─────────────┐  start  ┌─────────────┐  answer*  ┌─────────────┐  submit  ┌─────────────┐
   │  intro page │ ──────► │   in-exam   │ ────────► │  reviewing  │ ───────► │  submitted  │
   └─────────────┘         └─────────────┘           └─────────────┘          └─────────────┘
                                  │   ▲                       │
                                  │   │ resume                │
                                  ▼   │                       ▼
                          ┌─────────────┐                ┌─────────────┐
                          │  reloaded   │                │ auto-submit │
                          │ (tab reopen)│                │  (server)   │
                          └─────────────┘                └─────────────┘

   *answer transitions are instant locally, async to the server (sync queue).
```

**State definitions**

| State        | Entered when                                       | Exit when                                   |
| ------------ | -------------------------------------------------- | ------------------------------------------- |
| `intro`      | Learner navigates to `/exams/:id/intro`.           | Clicks "Start" → `POST /exams/:id/start`.   |
| `in-exam`    | Server confirms session start; clock begins.       | Learner clicks "Review" or timer expires.   |
| `reviewing`  | Learner has navigated to the review pane.          | Clicks "Submit" or returns to a question.   |
| `submitted`  | Submit succeeded **or** server triggered auto-submit. | (terminal — route navigates to results)  |
| `reloaded`   | The tab was reloaded mid-exam.                     | Resume completes → `in-exam`.               |

---

## 3. Component Architecture

```
features/assessments/
├── data-access/
│   ├── exam-session.store.ts     # signals: session, answers, queue, status
│   ├── exam-session.ws.ts        # WebSocket: tick, heartbeat, auto-submit
│   ├── exam-draft.store.ts       # IndexedDB wrapper for offline answers
│   ├── exams.api.ts              # REST: start, getSession, upsertAnswer, submit
│   ├── exams.dto.ts              # DTOs verbatim from backend
│   ├── exams.mappers.ts          # DTO ↔ domain
│   └── exams.model.ts            # domain types: Question, AnswerValue, AnswerOp, …
├── pages/
│   ├── exam-intro.page.ts
│   ├── exam-runner.page.ts       # the in-exam UI, owns the form
│   ├── exam-review.page.ts
│   └── exam-results.page.ts
├── components/
│   ├── exam-question-mcq.component.ts
│   ├── exam-question-essay.component.ts
│   ├── exam-timer.component.ts          # reads serverTick(), never local clock
│   ├── exam-connection-indicator.component.ts
│   ├── exam-progress-rail.component.ts
│   └── exam-submit-confirm.dialog.ts
└── exam.routes.ts                # provides ExamSessionStore at route level
```

**Why route-scoped state.** `ExamSessionStore` is provided in the route definition, not at root. When the learner navigates away from the exam (or it submits), Angular destroys the instance and all associated signals/effects/sockets clean up automatically. There is no risk of carrying over stale state between attempts.

```ts
// features/assessments/exam.routes.ts
export const examRoutes: Routes = [
  {
    path: ':sessionId',
    canActivate: [authGuard, roleGuard(['learner', 'admin'])],
    providers: [
      ExamSessionStore,
      ExamSessionWs,
      ExamDraftStore,
    ],
    loadComponent: () => import('./pages/exam-runner.page').then(m => m.ExamRunnerPage),
  },
  // …
];
```

---

## 4. State Model

`ExamSessionStore` is the only writer of exam-session signals. Components and child stores read.

```ts
type SessionStatus = 'idle' | 'starting' | 'in-exam' | 'reviewing' | 'submitting' | 'submitted' | 'expired' | 'error';
type SyncStatus    = 'idle' | 'syncing'  | 'synced'  | 'queued'    | 'error';

interface AnswerOp {
  readonly sessionId:  string;
  readonly questionId: string;
  readonly value:      AnswerValue;     // discriminated union per question type
  readonly clientSeq:  number;          // monotonic per session
  readonly attempts:   number;          // for diagnostics, not retry policy
}
```

```ts
@Injectable() // route-scoped
export class ExamSessionStore {
  // private writers
  private readonly _sessionId  = signal<string | null>(null);
  private readonly _config     = signal<ExamConfig | null>(null);   // includes encryptDrafts flag
  private readonly _questions  = signal<Question[]>([]);
  private readonly _answers    = signal<Record<string, AnswerValue>>({});
  private readonly _pendingOps = signal<AnswerOp[]>([]);
  private readonly _sessionStatus = signal<SessionStatus>('idle');
  private readonly _syncStatus    = signal<SyncStatus>('idle');

  // readonly views
  readonly sessionId    = this._sessionId.asReadonly();
  readonly config       = this._config.asReadonly();
  readonly questions    = this._questions.asReadonly();
  readonly answers      = this._answers.asReadonly();
  readonly sessionStatus = this._sessionStatus.asReadonly();
  readonly syncStatus    = this._syncStatus.asReadonly();

  // derived
  readonly answeredCount = computed(() => Object.keys(this._answers()).length);
  readonly hasPending    = computed(() => this._pendingOps().length > 0);
  readonly canSubmit     = computed(() =>
    this._sessionStatus() === 'reviewing'
    && !this.hasPending()
    && this._syncStatus() === 'synced',
  );
  readonly progress      = computed(() => ({
    answered: this.answeredCount(),
    total:    this._questions().length,
    pct:      this._questions().length === 0 ? 0
            : Math.round((this.answeredCount() / this._questions().length) * 100),
  }));
}
```

---

## 5. Offline-First Sync (IndexedDB)

### 5.1 Why IndexedDB, not localStorage

| Concern                | localStorage                          | IndexedDB                               |
| ---------------------- | ------------------------------------- | --------------------------------------- |
| API                    | Synchronous (blocks main thread)      | Asynchronous (Promises)                 |
| Capacity               | ~5 MB                                 | ~50 MB+ per origin (browser-dependent)  |
| Structured indexing    | None — string keys, string values     | Object stores + indexes                 |
| XSS exfiltration risk  | Trivial (`localStorage.foo`)          | Slightly higher attacker effort         |
| Suitability for tokens | **Banned** (XSS target)               | **Banned** (still JS-readable)          |
| Suitability for queued exam answers | Poor (synchronous, small) | **Good** (async, structured, lifecycle) |

### 5.2 Schema

Database: `ios-exam-drafts` (versioned).

Object store: `pendingAnswers`

| Field        | Type                | Notes                                                   |
| ------------ | ------------------- | ------------------------------------------------------- |
| `sessionId`  | `string`            | Composite key part 1                                    |
| `questionId` | `string`            | Composite key part 2                                    |
| `clientSeq`  | `number`            | Composite key part 3 — monotonic per session            |
| `payload`    | `Uint8Array`/`AnswerValue` | Plaintext **or** AES-GCM ciphertext (see §7)     |
| `iv`         | `Uint8Array \| null`| Init vector, only when `encryptDrafts === true`         |
| `synced`     | `boolean`           | False until server ACK                                  |
| `createdAt`  | `number`            | `Date.now()` — used by 7-day defensive sweep            |

Indexes:

- `bySession` on `sessionId` — fast resume queries.
- `byPending` on `[sessionId, synced]` — fast queue load on reconnect.

### 5.3 `ExamDraftStore` API

```ts
interface ExamDraftStore {
  put(op: AnswerOp): Promise<void>;
  markSynced(sessionId: string, questionId: string, clientSeq: number): Promise<void>;
  loadPending(sessionId: string): Promise<AnswerOp[]>;        // sorted by clientSeq asc
  deleteSession(sessionId: string): Promise<void>;             // on confirmed submit
  pruneOlderThan(ms: number): Promise<number>;                 // returns rows pruned
}
```

The interface is implemented by `IdbExamDraftStore`. Tests can swap in `InMemoryExamDraftStore`.

### 5.4 Write path

```ts
async setAnswer(questionId: string, value: AnswerValue): Promise<void> {
  // 1) Optimistic: update UI signal immediately.
  this._answers.update(a => ({ ...a, [questionId]: value }));

  // 2) Build op with monotonic clientSeq.
  const op: AnswerOp = {
    sessionId: this._sessionId()!,
    questionId,
    value,
    clientSeq: this.nextSeq(),
    attempts: 0,
  };

  // 3) Encrypt if config requires (see §7).
  const persisted = await this.maybeEncrypt(op);

  // 4) Durable write to IndexedDB.
  await this.draftDb.put(persisted);

  // 5) Enqueue + flush.
  this._pendingOps.update(q => [...q, op]);
  void this.flushQueue();
}
```

### 5.5 Read path (on resume)

```ts
async resume(sessionId: string): Promise<void> {
  this._sessionStatus.set('starting');
  this._sessionId.set(sessionId);

  // Server-acknowledged baseline.
  const server = await this.api.getSession(sessionId);
  this._config.set(server.config);
  this._questions.set(server.questions);
  if (server.config.encryptDrafts) await this.draftCrypto.useSessionKey(server.draftKey);

  // Local pending — overlay on top of server baseline.
  const pendingEncrypted = await this.draftDb.loadPending(sessionId);
  const pending = await Promise.all(pendingEncrypted.map(o => this.maybeDecrypt(o)));
  const merged: Record<string, AnswerValue> = { ...server.answers };
  for (const op of pending) merged[op.questionId] = op.value;

  this._answers.set(merged);
  this._pendingOps.set(pending);
  this._sessionStatus.set(server.status === 'submitted' ? 'submitted' : 'in-exam');
  void this.flushQueue();
}
```

### 5.6 Sync queue + idempotency contract

`POST /exams/{sessionId}/answers` accepts:

```json
{ "questionId": "q42", "value": { "type": "mcq", "selected": ["b"] }, "clientSeq": 1714080001234 }
```

Server semantics (frontend's reliance):

1. **Idempotent on `(sessionId, questionId, clientSeq)`.** Re-posting the same triple returns 2xx with no side-effects.
2. **Last-write-wins by `clientSeq`.** If the server already accepted a higher `clientSeq` for that question, the request returns `409 Conflict` with the canonical state and the frontend drops the op.
3. **`410 Gone`** if the session is already submitted/expired — the frontend transitions to `expired` and stops queueing.
4. **All other 4xx** are non-retriable; the op is moved to a `dead-letter` slot in IndexedDB and surfaced in support diagnostics.
5. **5xx and network errors** are retried by `retryInterceptor` with exponential backoff; the op stays in the queue.

```ts
private async flushQueue(): Promise<void> {
  if (!this.online() || this._syncStatus() === 'syncing') {
    this._syncStatus.set('queued');
    return;
  }
  this._syncStatus.set('syncing');
  try {
    while (this._pendingOps().length > 0 && this.online()) {
      const head = this._pendingOps()[0];
      try {
        await this.api.upsertAnswer(head);
      } catch (e) {
        if (e instanceof AppError && e.httpStatus === 409) {
          // server has a higher clientSeq — drop and refresh that question
          await this.refreshSingleAnswer(head.questionId);
        } else {
          throw e;
        }
      }
      await this.draftDb.markSynced(head.sessionId, head.questionId, head.clientSeq);
      this._pendingOps.update(q => q.slice(1));
    }
    this._syncStatus.set(this._pendingOps().length === 0 ? 'synced' : 'queued');
  } catch {
    this._syncStatus.set('error');
    // NetworkStatusService → effect will re-trigger flush on reconnect.
  }
}
```

### 5.7 Lifecycle

- **On confirmed final submit** (`POST /exams/:id/submit` returns 2xx): `await this.draftDb.deleteSession(sessionId)`.
- **On `expired`/`auto-submit`**: same — drafts are no longer authoritative.
- **On app boot**: `await this.draftDb.pruneOlderThan(7 * 24 * 60 * 60 * 1000)` — defensive sweep for orphaned rows from crashed sessions.
- **On logout**: drafts for the user's sessions are pruned eagerly (we keep only the active session's drafts in the small window between login and exam start).

---

## 6. WebSocket Channel & 30-Second Heartbeat

The exam session opens a dedicated WebSocket: `/ws/exams/{sessionId}`.

Inbound events:

| Event           | Payload                                               | Frontend reaction                                                |
| --------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `tick`          | `{ remainingMs, serverTime }`                         | Update `serverTick` signal — drives the visible timer.           |
| `pong`          | `{ sentAt }`                                          | Update `lastPongAt`.                                             |
| `auto-submit`   | `{ reason: 'time-expired' \| 'admin-cancelled' }`     | Trigger the submitted state and navigate to results.             |
| `proctor-warn`  | `{ code, message }`                                   | Show non-blocking banner; sent to proctoring log.                |
| `force-logout`  | `{ reason }`                                          | Close session, log user out (rare — admin action).               |

Outbound events:

| Event           | Payload                            | Frequency                                    |
| --------------- | ---------------------------------- | -------------------------------------------- |
| `ping`          | `{ sentAt }`                       | Every **30 s** while connected — heartbeat.  |
| `tab-blur`      | `{ at }`                           | On `visibilitychange` (proctoring signal).   |
| `tab-focus`     | `{ at }`                           | On `visibilitychange`.                        |

### 6.1 Heartbeat behaviour

- **Cadence**: 30 s, driven by `interval(30_000)` filtered to `connection() === 'open'`.
- **Payload**: `{ type: 'ping', sentAt }` — small, no PII, no token re-send.
- **Stall detection**: if `Date.now() - lastPongAt > 70_000` (> two cadence windows), the socket is forced to error → reconnect kicks in.
- **Off-cycle**: when the document is hidden for more than 60 s, the heartbeat continues (so the server still knows the learner is alive); on hidden-for-long-and-no-pong we reconnect on visibility return.
- **No CPU cost**: a single small message every 30 s does not impact INP, FCP, or LCP. The interval is implemented with `rxjs/interval`, not `setInterval`, so it disposes cleanly with the route.

### 6.2 Reconnect policy

```ts
this.socket$.pipe(
  retry({
    count: Infinity,
    delay: (err, attempt) => {
      this.connection.set('reconnecting');
      return timer(Math.min(30_000, 1_000 * 2 ** attempt));
    },
  }),
  takeUntilDestroyed(),
).subscribe(evt => this.handleEvent(evt));
```

- Exponential backoff capped at 30 s.
- Reconnect attempts are **infinite** while the route is alive — there is no client-side max retry. The route lifetime caps it (route exit destroys the subscription).
- On reconnect, the socket re-authenticates via the access token in the URL query (one-time on connect; not logged).

### 6.3 The visible timer

The exam timer **never** runs on `setInterval` locally with a wall-clock anchor. Always:

```html
<ios-exam-timer [remainingMs]="ws.serverTick()?.remainingMs ?? 0" />
```

Between server ticks (every 1 s by default, slowed to every 5 s in low-bandwidth mode), the component interpolates locally for smooth visuals — but never goes below the server's last reported value. Any drift correction is downward only.

---

## 7. Optional Client-Side Encryption

For high-stakes exam types (e.g., the live certification), `ExamConfig.encryptDrafts === true`. The backend issues a per-session **AES-GCM 256-bit** key on `POST /exams/:id/start`.

```
POST /exams/:id/start
  ── 200 ──> {
    sessionId, questions, config: { encryptDrafts: true, … },
    draftKey: { kid, alg: 'A256GCM', wrapped: <base64> }   // wrapped to current session
  }
```

Frontend handling:

1. Unwrap the key in-memory (`crypto.subtle.unwrapKey` or `importKey`) — the raw `CryptoKey` is **non-extractable** (`extractable: false`). It cannot be exported back out as bytes.
2. Hold the `CryptoKey` reference inside a private field of `ExamDraftCryptoService` for the session lifetime only.
3. Encrypt each `payload` with `crypto.subtle.encrypt({ name: 'AES-GCM', iv })`. The IV is freshly generated per write (12 bytes from `crypto.getRandomValues`) and stored alongside the ciphertext.
4. Decrypt lazily on read (resume) and on flush.
5. On `submitted`, `expired`, route exit, or logout — drop the key reference. Garbage collection clears the `CryptoKey`. The OS process retains no exportable copy.

Threat-model boundaries:

- Encryption raises the cost of two specific attacks:
  - A malicious browser extension or co-resident JS reading IndexedDB **without** also compromising the active page context.
  - Forensic recovery of disk artefacts after the user walks away from a kiosk.
- Encryption does **not** protect against an attacker with arbitrary JS execution in the page (XSS). Primary defences for that are CSP + Trusted Types + sanitised content ([06 §2.4](./06-performance-security-accessibility.md#24-xss)).
- Encryption is a **defence-in-depth** measure. The primary controls remain backend authority, origin isolation, no token co-location, and lifecycle pruning.

---

## 8. The 60-Second Disconnection Acceptance Scenario

This is a **standing acceptance test** for any release that touches `features/assessments/`.

| # | Action                                                                                | Expected behaviour                                                                                                                                          |
|---|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Learner is mid-exam, has answered Q1–Q3, currently on Q4. Connection live.             | `connection = open`, heartbeat every 30 s, `pendingOps = []`, `syncStatus = 'synced'`.                                                                       |
| 2 | Tester forces network offline (DevTools → Offline) for **~60 seconds**.                | Discrete "offline — your answers are saved locally" indicator. Heartbeat suppressed (no socket). Timer freezes at last server tick (no spurious decrement).  |
| 3 | Learner answers Q4 and Q5 while offline.                                               | Both visible immediately in UI. Both written to IndexedDB. `pendingOps.length === 2`. Submit button disabled. No network spinner blocks input.               |
| 4 | Tester restores network.                                                               | Within ~5 s, socket reconnects (`reconnecting → open`). Heartbeat resumes. `flushQueue()` posts Q4 then Q5; each returns 2xx.                                |
| 5 | After flush completes.                                                                  | `pendingOps = []`, `syncStatus = 'synced'`, "back online — answers synced" indicator. Server reflects Q4 and Q5 with correct `clientSeq`.                    |
| 6 | Learner submits exam.                                                                   | Submit button enabled (queue empty, status synced). Submit succeeds; results render.                                                                         |
| 7 | Edge case — learner reloads the tab while offline.                                      | On reload, `resume(sessionId)` loads server baseline + IndexedDB pending. Merged answers reappear. On reconnect, `flushQueue()` completes as in step 4.       |

**Failure of any step blocks merge.**

---

## 9. Edge Cases & Their Resolution

| Case                                                            | Resolution                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Learner opens the exam in a second tab.                         | `BroadcastChannel('ios-exam')` detects the duplicate; the new tab navigates to a "session already open" page. Server-side single-active-session enforcement is the real guard. |
| Time expires while learner is offline.                          | Server records the auto-submit at the cutoff. On reconnect, the next server message is `auto-submit` → frontend transitions to `submitted` and posts any final queued ops up to the server's accepted `clientSeq` cutoff. |
| `clientSeq` collides (clock skew sets equal `Date.now()`).      | Resolver: append a per-session monotonic counter. The counter is reset on each session start; it is not persisted across sessions. |
| Submit click fires while the queue still has ops.               | Submit button is disabled by `canSubmit` computed signal; if a race lets it through, the API rejects with `409` and the UI re-enables once the queue drains. |
| Network drop during submit itself.                              | Submit is idempotent on `(sessionId, submitToken)`. The frontend retries via the standard interceptor; if the server has already submitted, it returns 200 with the canonical result. |
| IndexedDB throws (quota/permission).                            | `ExamDraftStore.put` rejects → store sets `_syncStatus = 'error'` and surfaces a non-blocking banner: "Local save failed — please stay online for the rest of this exam." Answers continue going to the server in real time. |
| WebSocket blocked by corporate proxy.                           | Detected by absence of `tick` events within 10 s of connect. Frontend falls back to polling `/exams/:id/state` every 5 s for ticks, and `POST /exams/:id/answers` continues to work (no fallback needed for writes). |
| User clears site data mid-exam (chrome://settings).             | IndexedDB is wiped; on next answer, `setAnswer` writes a new pending row. Already-synced answers are intact server-side; the user does not lose progress. |
| Two answers for the same question fire in rapid succession.     | Each gets a distinct `clientSeq`. Backend last-write-wins. The intermediate value is overwritten — acceptable; mirrors typing behaviour. |
| Browser tab is closed mid-exam without submit.                  | On reopen within session window, `resume()` rehydrates from server + IndexedDB. If the session has expired server-side, the route shows a "session expired" page and any unsynced drafts older than the cutoff are discarded. |

---

## 10. Privacy & Security Posture (summary)

- **Backend authority**: backend stores, grades, and arbitrates. Frontend buffers.
- **Origin isolation**: IndexedDB is same-origin; CSP `frame-ancestors 'none'` blocks third-party iframing of the exam.
- **No token co-location**: IndexedDB row contains only `{sessionId, questionId, value (or ciphertext), iv, clientSeq, synced, createdAt}`. No JWT, no email, no user object.
- **Optional encryption** (§7) for high-stakes exams.
- **Lifecycle**: drafts deleted on confirmed submit; 7-day defensive sweep on app boot.
- **Heartbeat does not carry tokens**: the WebSocket is already authenticated for its lifetime.
- **Cross-references**: full security context lives in [06 §2.7.2](./06-performance-security-accessibility.md#272-exam-answers-in-indexeddb-offline-buffer); auth wiring in [08](./08-authentication-authorization.md).

---

## 11. Performance Considerations

- The exam route is **lazy-loaded** — none of the exam engine code ships in the initial bundle. Learners not in an exam pay zero cost for it.
- The exam code is further split: `exam-runner` (in-exam) and `exam-results` (post-submit) are separate chunks.
- IndexedDB writes are debounced upstream by the form (250 ms after typing stops) — a fast typist does not trigger a write per keystroke.
- Each render of a question component is `OnPush` + signal-driven; switching questions is constant-time regardless of how many are in the exam.
- The visible timer interpolates locally between `tick` events to keep DOM updates smooth (1 s) without network chatter.
- Memory: even a 200-question exam with 5 KB answers each is ~1 MB in IndexedDB — well within the per-origin budget.
- On submit, the result page is preloaded **after** submit returns 2xx, never during the exam (would compete with the exam runner for bandwidth).

Cross-reference: [06 §1](./06-performance-security-accessibility.md#1-performance) for the broader performance budgets.

---

## 12. Testing Hooks (Deferred, but Prepared)

Even though formal testing is deferred per [05 §1](./05-engineering-guidelines.md), the engine is designed to be testable later without refactor:

- `ExamDraftStore` is an interface — `InMemoryExamDraftStore` exists for tests/fakes.
- `ExamSessionWs` accepts a `WebSocketSubject` factory injection token — mockable.
- `NetworkStatusService` is an injectable `signal<boolean>` source — flipping it in a test simulates offline/online transitions.
- `ExamSessionStore` is a plain class with three injected dependencies — instantiable directly in unit tests.
- Time is read only from `serverTick()` — tests inject a controllable subject.

A future test suite must cover, at minimum:

- The §8 60-second scenario (deterministic, offline-toggle test).
- 401 + concurrent flush (race-safe refresh interaction with auth).
- 409 conflict resolution (drop op, refresh single answer).
- Resume after reload — empty pending, half-pending, full-pending, server-already-submitted.
- Encryption path: round-trip put/load, key drop on route exit.

---

## 13. Open Items / Future Work

- **Submit token & deduplication.** Spec the exact `submitToken` shape with backend so submit is provably idempotent across network retries.
- **Fallback polling cadence.** Confirm with backend whether 5 s `/state` polling is acceptable when WebSocket is blocked, or if we need a longer cadence on cellular.
- **Multi-language question content.** When a question contains both Arabic and Latin text, ensure `dir="auto"` and Arabic-numerals locale rendering for any embedded counts ("Question 3 of 50") match the active locale.
- **Proctoring extensions.** Camera/mic capture and screen-share are explicit non-goals for v1 but are cleanly addable as another WS event stream without disturbing the answer/sync path.
- **Accessibility audit specifically for the runner.** Full keyboard walk + NVDA/VoiceOver pass on every question type, including timer announcements at 5/1 minute marks (`aria-live="polite"`).
- **Bandwidth-aware mode.** Drop tick frequency to 5 s on `navigator.connection.effectiveType === 'slow-2g' | '2g'` to save data for the actual answer payloads.

---

## 14. Cross-References

- [03 — State Management §11.1](./03-state-management.md#111-exam-answer-drafts-offline-first-with-indexeddb) — store pattern foundations.
- [04 — API Integration §6.2–§6.5](./04-api-integration-data-flow.md#62-heartbeat-30-seconds) — heartbeat, sync queue, disconnection scenario at the API layer.
- [06 — Performance, Security & Accessibility §1, §2.7.2](./06-performance-security-accessibility.md#1-performance) — performance budgets and storage policy.
- [08 — Authentication & Authorization §3.4](./08-authentication-authorization.md#34-route--ui-permission-matrix-v1) — exam route gating.
- [02 — Component Design & Reusability](./02-component-design-reusability.md) — primitives (timer, dialog, indicator) used by the runner.
