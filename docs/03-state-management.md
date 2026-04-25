# 03 — State Management Approach

This project uses **Angular Signals + injectable services**. No NgRx store, no Akita, no ngxs. The rationale: most LMS state is either server state fetched per route or local UI state — both are handled cleanly with signals and a small store pattern, without the ceremony of a global Redux-style store.

---

## 1. Principles

1. **Co-locate state with the feature that owns it.** There is no global "app state" god-object. Each feature has its own store service.
2. **Signals first, RxJS second.** Signals handle reactive reads, computed derivations, and effects. RxJS handles stream composition (debouncing, WebSockets, long-running async pipelines) and is converted to signals at the boundary with `toSignal()`.
3. **Server state ≠ client state.** Server state (courses, exams, certificates) is cached in feature stores with explicit lifecycle. UI state (filters, modals, selections) is local.
4. **Immutability.** Signals hold immutable values. Updates use `.update(prev => ...)` or `.set(newValue)`, never in-place mutation.
5. **Single writer per signal.** A signal is written only by its owning store/service. Components read via `computed` and call store methods to request changes.
6. **No subscriptions in components.** Components never call `.subscribe()`. They read signals. Any observable is converted via `toSignal()` in the store.

---

## 2. State Categories

| Category            | Example                                              | Where it lives                                     | Lifetime                  |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| **Authentication**  | Current user, roles, tokens, session expiry          | `core/auth/auth.store.ts` (root singleton)         | App lifetime              |
| **App config**      | Feature flags, locale, theme                         | `core/config/*.service.ts`                         | App lifetime              |
| **Server state**    | Courses, exams, certificates, enrollments            | Per-feature `*.store.ts`                           | Route scope or app scope  |
| **URL state**       | Filters, pagination, active tab                      | Query params (`Router` + `ActivatedRoute`)         | Per navigation            |
| **Form state**      | Reactive form values, validity, touched              | `FormGroup` in the smart component                 | Component lifetime        |
| **Ephemeral UI**    | Dialog open, dropdown selection, hover, tooltip      | Local signals in the component                     | Component lifetime        |
| **Real-time**       | Incoming notifications, exam tick, proctoring events | `notifications.ws.ts` + feature stores             | Socket lifetime           |

---

## 3. The Store Pattern

A "store" in this project is a plain injectable class that holds signals plus the methods that mutate them. There is no magic — just Angular DI.

```ts
// src/app/features/courses/data-access/courses.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { CoursesApi } from './courses.api';
import { Course, CourseFilters } from './courses.model';

type Status = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class CoursesStore {
  private readonly api = inject(CoursesApi);

  // --- state (private, mutable only here) ---
  private readonly _courses = signal<Course[]>([]);
  private readonly _filters = signal<CourseFilters>({ query: '', category: null, level: null });
  private readonly _page = signal({ index: 0, size: 12, total: 0 });
  private readonly _status = signal<Status>('idle');
  private readonly _error = signal<string | null>(null);

  // --- read-only views (exposed to consumers) ---
  readonly courses = this._courses.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly page = this._page.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();

  // --- derived state ---
  readonly isLoading = computed(() => this._status() === 'loading');
  readonly isEmpty = computed(() => this._status() === 'success' && this._courses().length === 0);
  readonly pageCount = computed(() => Math.ceil(this._page().total / this._page().size));

  // --- actions ---
  async load(): Promise<void> {
    this._status.set('loading');
    this._error.set(null);
    try {
      const { items, total } = await this.api.list({
        ...this._filters(),
        page: this._page().index,
        size: this._page().size,
      });
      this._courses.set(items);
      this._page.update(p => ({ ...p, total }));
      this._status.set('success');
    } catch (err) {
      this._status.set('error');
      this._error.set(err instanceof Error ? err.message : 'Failed to load courses');
    }
  }

  setFilters(filters: Partial<CourseFilters>): void {
    this._filters.update(f => ({ ...f, ...filters }));
    this._page.update(p => ({ ...p, index: 0 }));
    void this.load();
  }

  goToPage(index: number): void {
    this._page.update(p => ({ ...p, index }));
    void this.load();
  }

  reset(): void {
    this._courses.set([]);
    this._filters.set({ query: '', category: null, level: null });
    this._page.set({ index: 0, size: 12, total: 0 });
    this._status.set('idle');
    this._error.set(null);
  }
}
```

Consumers:

```ts
// src/app/features/courses/pages/course-list/course-list.page.ts
@Component({
  selector: 'ios-course-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* ... */],
  template: `
    <ios-course-filters
      [value]="store.filters()"
      (changed)="store.setFilters($event)"
    />

    @if (store.isLoading()) {
      <ios-skeleton rows="6" />
    } @else if (store.error()) {
      <ios-error-state [message]="store.error()!" (retry)="store.load()" />
    } @else if (store.isEmpty()) {
      <ios-empty-state [title]="'courses.empty.title' | transloco" />
    } @else {
      <ios-course-grid [courses]="store.courses()" />
      <ios-pagination
        [page]="store.page().index"
        [pageCount]="store.pageCount()"
        (pageChanged)="store.goToPage($event)"
      />
    }
  `,
})
export class CourseListPage {
  readonly store = inject(CoursesStore);

  constructor() { void this.store.load(); }
}
```

---

## 4. Scoping Stores

| Scope                     | How                                                                 | When                                                       |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Root (singleton)**      | `@Injectable({ providedIn: 'root' })`                               | Auth, current user, app config, notifications              |
| **Route / feature scope** | Provide in the feature's route: `providers: [ExamSessionStore]`     | Exam session, wizard flows — state must reset on navigation |
| **Component scope**       | `providers: [SomeLocalStore]` on the component                      | Rarely — mostly for large, reusable composites (data tables) |

Route-scoped providers are the norm for one-shot flows (e.g., an exam session): when the user leaves the route, the store instance is destroyed and state resets automatically.

---

## 5. Derived State with `computed`

Use `computed()` liberally for any value that is a function of other signals.

```ts
readonly gradedQuestions = computed(() =>
  this._questions().filter(q => q.status === 'graded')
);

readonly passPercentage = computed(() => {
  const total = this._questions().length;
  const passed = this.gradedQuestions().filter(q => q.correct).length;
  return total === 0 ? 0 : Math.round((passed / total) * 100);
});
```

Do not compute the same derivation manually in multiple components — move it to the store as a `computed`.

---

## 6. Side Effects with `effect`

Use `effect()` for side effects that react to signal changes — analytics, logging, DOM manipulation, persistence.

```ts
// Persist filters to URL
constructor() {
  effect(() => {
    const filters = this._filters();
    const page = this._page().index;
    this.router.navigate([], {
      queryParams: { q: filters.query || null, cat: filters.category, page },
      queryParamsHandling: 'merge',
    });
  });
}
```

**Rules**

- Effects are for **side effects**, never for computing derived state (use `computed`).
- Effects run in an injection context; they auto-cleanup with their host.
- Never trigger HTTP calls directly from an `effect` unless the call is idempotent and protected against loops. Prefer explicit actions.

---

## 7. Bridging RxJS → Signals

Some sources are inherently streams: `HttpClient`, `ActivatedRoute.queryParams`, `WebSocket`, form value changes, debounced search. Convert at the boundary with `toSignal()` and keep the rest of the app signal-native.

```ts
readonly query = toSignal(
  this.searchInput.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
  ),
  { initialValue: '' },
);
```

For store-triggered HTTP calls we prefer `async/await` (see §3) for readability; RxJS operators are used when composition (e.g., `switchMap`, `combineLatest`) genuinely helps.

---

## 8. Real-Time State (WebSockets)

Real-time data (incoming notifications, exam tick, proctoring events) is handled by a WebSocket service per channel, injected by the feature store.

```ts
@Injectable({ providedIn: 'root' })
export class NotificationsWs {
  private readonly socket$ = webSocket<NotificationEvent>({
    url: `${environment.wsBaseUrl}/notifications`,
    openObserver: { next: () => console.debug('[ws] notifications open') },
  });

  readonly events = toSignal(
    this.socket$.pipe(retry({ delay: 2_000 })),
    { initialValue: null },
  );
}
```

The feature store reads `events` and merges into its own signals:

```ts
constructor() {
  effect(() => {
    const e = this.ws.events();
    if (!e) return;
    this._unread.update(n => n + 1);
    this._items.update(list => [e.notification, ...list].slice(0, 50));
  });
}
```

WebSocket auth is handled by sending the current access token as a subprotocol or query param (see [API Integration §6](./04-api-integration-data-flow.md#6-real-time-websockets)).

---

## 9. URL as State

Anything that should survive a refresh, be shareable, or affect SEO goes into the URL — query params for filters, path params for IDs, fragment for in-page anchors.

- Read via `ActivatedRoute.queryParamMap` → `toSignal()`.
- Write via `Router.navigate([], { queryParams, queryParamsHandling: 'merge' })` from the store's action methods or an `effect`.
- Never duplicate URL state in a store signal **and** treat both as sources of truth — pick one direction of flow and make the other derived.

---

## 10. Caching & Invalidation

Feature stores are the cache. Strategy:

- **Fresh-on-route**: by default, a store re-fetches on page load. Simple, correct, fits most LMS screens.
- **Stale-while-revalidate**: for hot data (course list, dashboard), show the current cached value immediately while a background refresh runs; swap when the response arrives.
- **Optimistic updates**: for user-initiated writes (enroll, mark complete) we update signals immediately and roll back on error.
- **Manual invalidation**: mutation actions invalidate related queries by calling sibling stores' `reload()` methods (only acceptable inter-feature coupling — via DI, not imports across feature folders).
- **No TTL cache** is implemented in this initial version. If data-refresh frequency becomes a pain point, we add a small `QueryCache` service with staleness timestamps. Keep it simple first.

---

## 11. Form State

Forms are owned by the component that renders them, using typed Reactive Forms.

- Do not lift form state into a store unless the form spans multiple routes (e.g., a multi-step enrollment wizard — then a route-scoped store holds the partial draft).
- Form values may flow into a store on submit (`store.enroll(this.form.getRawValue())`), not during editing.
- Long-running drafts (exam answers) are auto-saved by the store to the server at a debounced interval. The form remains the source of truth for the current edit; the store holds the server's last-acknowledged state. For exam answers specifically, drafts are *also* persisted to IndexedDB to survive disconnections — see §11.1.

### 11.1 Exam Answer Drafts (Offline-First with IndexedDB)

> **Full architecture in [09 — Exam Engine](./09-exam-engine.md).** This subsection presents the state-management view (signals, store pattern, signal lifecycles); the lifecycle, IndexedDB schema, encryption, and disconnection scenario are consolidated in 09.

Exam sessions are the one place in the app where we explicitly engineer for **temporary disconnection**. The acceptance scenario is **~60 seconds of internet loss** mid-exam: the learner must continue answering, and answers must reliably reach the backend once connectivity returns.

**Pattern (route-scoped `ExamSessionStore`):**

```ts
// src/app/features/assessments/data-access/exam-session.store.ts
@Injectable() // route-scoped — provided in the exam route's `providers`
export class ExamSessionStore {
  private readonly api = inject(ExamsApi);
  private readonly draftDb = inject(ExamDraftStore); // IndexedDB wrapper (see below)
  private readonly online = inject(NetworkStatusService).online; // signal<boolean>

  // --- state ---
  private readonly _sessionId   = signal<string | null>(null);
  private readonly _answers     = signal<Record<string, AnswerValue>>({});
  private readonly _pendingOps  = signal<AnswerOp[]>([]); // queued sync operations
  private readonly _syncStatus  = signal<'idle' | 'syncing' | 'synced' | 'queued' | 'error'>('idle');

  readonly answers     = this._answers.asReadonly();
  readonly syncStatus  = this._syncStatus.asReadonly();
  readonly hasPending  = computed(() => this._pendingOps().length > 0);

  // --- actions ---
  async setAnswer(questionId: string, value: AnswerValue): Promise<void> {
    // 1) Update local signal immediately — UI never blocks on the network.
    this._answers.update(a => ({ ...a, [questionId]: value }));

    // 2) Persist to IndexedDB (debounced upstream by the form).
    await this.draftDb.put(this._sessionId()!, questionId, value);

    // 3) Enqueue a sync op with a monotonic clientSeq for ordering.
    const op: AnswerOp = {
      sessionId:  this._sessionId()!,
      questionId,
      value,
      clientSeq:  Date.now(),       // monotonic-ish; backend tie-breaks per session
      attempts:   0,
    };
    this._pendingOps.update(q => [...q, op]);
    void this.flushQueue();
  }

  // Sync the queue to the backend; safe to call repeatedly.
  private async flushQueue(): Promise<void> {
    if (!this.online() || this._syncStatus() === 'syncing') {
      this._syncStatus.set('queued');
      return;
    }
    this._syncStatus.set('syncing');
    try {
      while (this._pendingOps().length > 0 && this.online()) {
        const [head, ...rest] = this._pendingOps();
        await this.api.upsertAnswer(head); // idempotent: backend keys on (sessionId, questionId, clientSeq)
        this._pendingOps.set(rest);
        await this.draftDb.markSynced(head.sessionId, head.questionId, head.clientSeq);
      }
      this._syncStatus.set(this._pendingOps().length === 0 ? 'synced' : 'queued');
    } catch {
      this._syncStatus.set('error');
      // Retries are driven by the online effect below + retryInterceptor.
    }
  }

  // Reactive: when network comes back, flush immediately.
  constructor() {
    effect(() => {
      if (this.online() && this.hasPending()) void this.flushQueue();
    });
  }

  // Resume an in-progress session (e.g., the learner reloads the tab).
  async resume(sessionId: string): Promise<void> {
    this._sessionId.set(sessionId);

    // 1) Load the server-acknowledged state of record.
    const server = await this.api.getSession(sessionId);

    // 2) Load any locally-queued ops that haven't been acknowledged.
    const localPending = await this.draftDb.loadPending(sessionId);

    // 3) Merge: server is the baseline, local pending overrides per-question.
    const merged = { ...server.answers };
    for (const op of localPending) merged[op.questionId] = op.value;

    this._answers.set(merged);
    this._pendingOps.set(localPending);
    void this.flushQueue();
  }
}
```

**`ExamDraftStore` — thin IndexedDB wrapper (`core/storage/exam-draft.store.ts`):**

- Object store keyed on `[sessionId, questionId, clientSeq]`.
- Stores the answer payload, `clientSeq`, and a `synced: boolean` flag.
- `put()` writes a new pending row; `markSynced()` flips the flag (or deletes the row).
- `loadPending(sessionId)` returns rows where `synced === false`, ordered by `clientSeq`.
- Wrapped behind a small interface so it can be mocked or swapped for in-memory in tests.
- Optional **client-side encryption** for high-stakes exams: payloads are encrypted with `crypto.subtle.encrypt` (AES-GCM) using a per-session key derived from a server-issued nonce. The local DB never holds plaintext answers when this mode is active. Decryption is lazy — only when the store needs to render or sync. See [04 — API Integration §6.2 Heartbeat & §6.3 Offline-First Exam Answers](./04-api-integration-data-flow.md#62-heartbeat-30-seconds) and [06 — Performance, Security & Accessibility §2.7](./06-performance-security-accessibility.md#27-sensitive-data-handling).

**Conflict-resolution rules (frontend perspective):**

- The **backend is authoritative** for what the official answer is. The frontend's job is only to deliver each `(questionId, clientSeq)` reliably and in order per session.
- Per question, the highest accepted `clientSeq` wins on the server. The frontend never deletes a pending op without an explicit server acknowledgement.
- On submit, the frontend blocks the "Submit exam" button until `pendingOps.length === 0` **and** `syncStatus === 'synced'`. If the learner is still offline at deadline, the auto-submit (server-driven) takes over and any final queued ops are accepted up to the server-side cutoff.
- The exam timer is **never** stored or computed locally — it's read from the server's WebSocket tick (see [04 §6.1](./04-api-integration-data-flow.md#61-connection--auth)) so a learner with a manipulated clock cannot extend the exam.

**Why IndexedDB and not `localStorage`:**

- `localStorage` is synchronous (blocks the main thread), small (~5 MB), and a known XSS exfiltration target — banned for tokens (see §13).
- IndexedDB is asynchronous, large enough for any plausible exam payload, structured (we can index by `sessionId`), and visible to the same origin only.
- Optional encryption further reduces the value of the local data to an attacker.

**Lifecycle:**

- Drafts for a session are deleted from IndexedDB when the server confirms final submission (`POST /exams/{id}/submit` returns OK).
- A maintenance pass (on next exam open) prunes any IndexedDB rows older than 7 days that are not associated with an active session — defensive cleanup if a previous tab crashed.

---

## 12. Testing Hooks (Deferred, but Prepared)

Even though formal testing is deferred, the store pattern is chosen so tests can be added with no refactor:

- Stores are plain classes with injected dependencies — trivially unit-testable.
- Signals can be read synchronously in tests.
- Components that consume stores can be rendered with a stubbed store class via `providers: [{ provide: CoursesStore, useClass: MockCoursesStore }]`.

---

## 13. Anti-Patterns (Banned)

- ❌ **Mutating signal values**: `this._courses().push(newCourse)`. Always `update` with a new array.
- ❌ **Reading signals in templates via method calls inside expressions** that don't return the same value each tick — wrap in `computed`.
- ❌ **`subscribe()` inside components**. Use `toSignal()` or the `async` pipe (the latter only in edge cases).
- ❌ **Injecting a store from another feature directly** (`CoursesStore` inside `CertificationsStore` — the `certifications` feature importing the `courses` feature). Coordinate via `core/` or an event bus.
- ❌ **Global event bus for general app state**. We use it only for cross-feature notifications (see §14). Most coordination happens via direct DI of singletons.
- ❌ **Storing tokens in a signal and persisting to `localStorage`**. Tokens live in memory; refresh tokens live in httpOnly cookies. See [API Integration §5](./04-api-integration-data-flow.md#5-authentication-flow).

---

## 14. Cross-Feature Coordination

When two features must react to each other (e.g., completing an exam updates the certifications feature), we prefer:

1. **Direct store-to-store calls via DI** when one feature clearly owns the trigger (`CertificationsStore.refresh()` called from `ExamsStore` after `submit` succeeds).
2. **A tiny `AppEventBus`** (a root signal or RxJS `Subject`) for broadcast-style events: `user:logged-out`, `certification:issued`. Subscribers opt in via an `effect`.

Both patterns are preferable to introducing a full Redux-style store — they keep each feature self-contained and testable.
