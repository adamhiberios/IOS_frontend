# 04 — API Integration & Data Flow

This document describes how the frontend talks to the backend: HTTP configuration, interceptors, authentication, error handling, DTO-to-domain mapping, and the WebSocket strategy for real-time features.

---

## 1. Integration Overview

| Channel                | Protocol          | Library                               | Use cases                                                  |
| ---------------------- | ----------------- | ------------------------------------- | ---------------------------------------------------------- |
| CRUD, search, commands | REST/JSON         | `HttpClient` + interceptors           | Courses, enrollments, certifications, insight, reporting   |
| Real-time push         | WebSocket         | `rxjs/webSocket`                      | Notifications, exam countdown, proctoring events           |
| File upload            | `multipart/form-data` | `HttpClient` with `reportProgress` | Avatars, assignment submissions, admin content uploads     |
| File download          | `GET` with `responseType: 'blob'` | `HttpClient`          | Certificates (PDF), exam reports                           |

All URLs are sourced from `environment.apiBaseUrl` and `environment.wsBaseUrl` — never hardcoded.

---

## 2. API Client Pattern

Every feature has its own typed API class in `data-access/`. API classes are thin — they serialize the request, call `HttpClient`, and map the DTO into a domain model. They **do not** cache, hold state, or handle UI concerns.

```ts
// src/app/features/courses/data-access/courses.api.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CourseDto, CoursePageDto } from './courses.dto';
import { toCourse } from './courses.mappers';
import { Course, CourseFilters } from './courses.model';

@Injectable({ providedIn: 'root' })
export class CoursesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/courses`;

  async list(q: CourseFilters & { page: number; size: number }): Promise<{ items: Course[]; total: number }> {
    let params = new HttpParams()
      .set('page', q.page)
      .set('size', q.size);
    if (q.query)    params = params.set('q', q.query);
    if (q.category) params = params.set('category', q.category);
    if (q.level)    params = params.set('level', q.level);

    const res = await firstValueFrom(this.http.get<CoursePageDto>(this.base, { params }));
    return { items: res.items.map(toCourse), total: res.total };
  }

  async getById(id: string): Promise<Course> {
    const dto = await firstValueFrom(this.http.get<CourseDto>(`${this.base}/${id}`));
    return toCourse(dto);
  }
}
```

### 2.1 DTOs vs domain models

- **DTOs** live in `*.dto.ts` and match the backend contract **verbatim** (field names, casing, nullability). They may be code-generated from OpenAPI if a spec is provided.
- **Domain models** live in `*.model.ts` and are shaped for the UI — they use `camelCase`, non-nullable fields with defaults, `Date` instead of ISO strings, enums instead of magic strings.
- **Mappers** (`*.mappers.ts`) convert between them. This insulates the UI from backend renames/breaking changes — a change to a DTO only touches the mapper.

```ts
// src/app/features/courses/data-access/courses.mappers.ts
import { CourseDto } from './courses.dto';
import { Course } from './courses.model';

export const toCourse = (dto: CourseDto): Course => ({
  id:             dto.id,
  title:          dto.title,
  summary:        dto.summary ?? '',
  level:          dto.level ?? 'beginner',
  durationHours:  dto.duration_hours ?? 0,
  coverImageUrl:  dto.cover_image_url ?? '/assets/images/course-placeholder.svg',
  category:       { id: dto.category.id, name: dto.category.name },
  instructor:     { id: dto.instructor.id, name: dto.instructor.name, avatarUrl: dto.instructor.avatar_url ?? null },
  createdAt:      new Date(dto.created_at),
});
```

---

## 3. HTTP Interceptors

Interceptors are registered in order in `app.config.ts` (see [01 — Project Structure §4](./01-project-structure-architecture.md#4-application-bootstrap-appconfigts)):

1. `authInterceptor`
2. `localeInterceptor`
3. `retryInterceptor`
4. `errorInterceptor`

### 3.1 `authInterceptor`

```ts
// src/app/core/http/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const token = auth.accessToken();

  // Never attach the token to foreign origins.
  if (!token || !req.url.startsWith(auth.apiOrigin)) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    withCredentials: true, // refresh token cookie travels here
  }));
};
```

### 3.2 `localeInterceptor`

```ts
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const locale = inject(LocaleService).locale(); // 'en' | 'ar'
  return next(req.clone({
    setHeaders: { 'Accept-Language': locale, 'X-Locale': locale },
  }));
};
```

### 3.3 `retryInterceptor`

Retries only **idempotent** methods (`GET`, `HEAD`, `OPTIONS`) on network errors and 5xx. Exponential backoff.

```ts
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next(req);
  return next(req).pipe(
    retry({
      count: 2,
      delay: (err, attempt) => {
        const transient = err.status === 0 || (err.status >= 500 && err.status < 600);
        if (!transient) throw err;
        return timer(Math.min(2_000, 300 * 2 ** attempt));
      },
    }),
  );
};
```

### 3.4 `errorInterceptor`

- Normalizes every error into a common `AppError` shape.
- Triggers the refresh-token flow on `401` (see §5.2).
- Emits non-silenced errors to the `ToastService` for user-visible messages.
- Logs to the error-reporting sink (e.g., Sentry) in PROD.

```ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthStore);
  const reporter = inject(ErrorReporter);

  return next(req).pipe(
    catchError(err => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 && !req.url.includes('/auth/refresh')) {
          return auth.handle401(req, next); // attempts silent refresh + replay
        }
        const appError = toAppError(err);
        if (!req.context.get(SILENT)) toast.error(appError.userMessage);
        if (appError.severity === 'critical') reporter.capture(appError);
        return throwError(() => appError);
      }
      return throwError(() => err);
    }),
  );
};
```

A `SILENT` `HttpContextToken` is used to opt out of toast notifications when the caller wants to render errors inline (e.g., a login form):

```ts
this.http.post(url, body, { context: new HttpContext().set(SILENT, true) });
```

### 3.5 `AppError` shape

```ts
export interface AppError {
  readonly code: string;           // 'COURSE_NOT_FOUND', 'NETWORK', 'UNAUTHORIZED'...
  readonly httpStatus: number | 0; // 0 for network errors
  readonly userMessage: string;    // translated via Transloco key
  readonly techMessage: string;    // English, for logs
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly retriable: boolean;
  readonly traceId?: string;       // x-request-id from response headers
}
```

---

## 4. Data Flow (End-to-End)

For a typical "list courses" flow:

```
Component (CourseListPage)
    │ reads store signals
    ▼
Store (CoursesStore)
    │ calls action method
    ▼
API (CoursesApi)                    │ interceptors
    │ HttpClient.get(...)     ──►   │  auth → locale → retry → error
    │                               │          ▼
    │                               │   Backend REST endpoint
    │                               │          │
    │                               │ ◄────────┘  JSON DTO
    ▼
Mapper (toCourse) → Domain model
    │
    ▼
Store.signal.set(value)
    │
    ▼
Component re-renders (OnPush + signals)
```

Errors propagate back up the same path. The interceptor decorates the error with `AppError` metadata; the store decides whether to show a retry UI, push a toast, or surface the error inline.

---

## 5. Authentication Flow

> **Single source of truth:** [08 — Authentication & Authorization](./08-authentication-authorization.md). This section gives the API-layer view (interceptor wiring, refresh-race handling); the full token model, RBAC matrix, threat model, and operational rules live in 08.

The LMS uses **JWT access tokens** (short-lived, ~15 min) + **refresh tokens** (long-lived, rotating) with **RBAC** (roles: `learner`, `instructor`, `admin`, `support`).

### 5.1 Token storage

| Token          | Storage                          | Rationale                                                                 |
| -------------- | -------------------------------- | ------------------------------------------------------------------------- |
| Access token   | **In-memory signal** (`AuthStore._accessToken`) | XSS-resistant. Lost on tab refresh — we silently re-fetch via the refresh cookie. |
| Refresh token  | **httpOnly, Secure, SameSite=Strict cookie** (set by backend) | JS cannot read it. Frontend just calls `/auth/refresh` with `withCredentials: true`. |

**`localStorage` and `sessionStorage` are banned for tokens.** This is a hard rule.

### 5.2 Refresh flow

Pseudocode inside `AuthStore.handle401`:

```ts
handle401(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  if (this._refreshInFlight) {
    // A refresh is already happening — wait for it, then replay.
    return this._refreshInFlight.pipe(switchMap(() => next(this.withToken(req))));
  }
  this._refreshInFlight = this.http.post<{ accessToken: string }>(
    `${environment.apiBaseUrl}/auth/refresh`,
    null,
    { withCredentials: true },
  ).pipe(
    tap(res => this._accessToken.set(res.accessToken)),
    shareReplay(1),
    finalize(() => (this._refreshInFlight = null)),
  );
  return this._refreshInFlight.pipe(
    switchMap(() => next(this.withToken(req))),
    catchError(err => { this.logout({ reason: 'refresh-failed' }); return throwError(() => err); }),
  );
}
```

### 5.3 RBAC on the frontend

- **Route guards** (`authGuard`, `roleGuard(['admin'])`) block unauthorized navigation.
- **Directive** `*hasRole` hides/shows UI fragments: `<button *hasRole="['admin']">Edit</button>`.
- **Method guards** are not enforced in the frontend beyond UI hints — the backend is the single source of truth for authorization. The frontend does not hold the illusion of being a security boundary.

### 5.4 Login / logout

- `POST /auth/login` → `{ accessToken, user, roles }`, sets refresh-token cookie.
- `POST /auth/logout` → backend invalidates refresh token, clears cookie; frontend clears access-token signal and navigates to `/auth/login`.
- `POST /auth/register`, `POST /auth/forgot-password`, `POST /auth/reset-password` follow the same interceptor pipeline.

### 5.5 Idle timeout

An `IdleService` in `core/` tracks user activity. After N minutes of inactivity:

1. A warning dialog is shown with a countdown.
2. On countdown expiry, `AuthStore.logout({ reason: 'idle' })` is called.
3. Activity during the warning dismisses it and resets the timer.

---

## 6. Real-Time (WebSockets)

> **Exam-engine specifics (heartbeat, sync queue, disconnection scenario) are consolidated in [09 — Exam Engine Architecture](./09-exam-engine.md).** This section covers the API-layer mechanics; 09 is the single source of truth for end-to-end exam behaviour.

Used for features where polling would be wasteful:

| Channel                       | Payload                                        | Used by            |
| ----------------------------- | ---------------------------------------------- | ------------------ |
| `/ws/notifications`           | New system/learner notifications               | `notifications`    |
| `/ws/exams/{sessionId}`       | Server clock tick, auto-submit signal          | `assessments`      |
| `/ws/proctoring/{sessionId}`  | Proctoring events (tab-switch, warnings)       | `assessments`      |

### 6.1 Connection & auth

```ts
@Injectable({ providedIn: 'root' })
export class NotificationsWs {
  private readonly auth = inject(AuthStore);

  private socket$ = webSocket<NotificationEvent>({
    url: `${environment.wsBaseUrl}/notifications?token=${encodeURIComponent(this.auth.accessToken() ?? '')}`,
    openObserver:  { next: () => this.status.set('open') },
    closeObserver: { next: () => this.status.set('closed') },
  });

  readonly status = signal<'idle' | 'open' | 'closed'>('idle');

  readonly events = toSignal(
    this.socket$.pipe(
      retry({ delay: (err, attempt) => timer(Math.min(30_000, 1_000 * 2 ** attempt)) }),
    ),
    { initialValue: null },
  );
}
```

### 6.2 Heartbeat (30 seconds)

Long-lived sockets — particularly the **exam session** channel — emit a lightweight heartbeat every **30 seconds** so the backend can detect silent peer drops, and so the frontend can detect a stalled socket faster than TCP timeouts will.

```ts
// src/app/features/assessments/data-access/exam-session.ws.ts
@Injectable() // route-scoped to the exam session route
export class ExamSessionWs {
  private readonly auth = inject(AuthStore);

  private socket$ = webSocket<ExamServerEvent | ExamClientEvent>({
    url: `${environment.wsBaseUrl}/exams/${this.sessionId}?token=${encodeURIComponent(this.auth.accessToken() ?? '')}`,
    openObserver:  { next: () => this.connection.set('open') },
    closeObserver: { next: () => this.connection.set('closed') },
  });

  readonly connection = signal<'idle' | 'open' | 'closed' | 'reconnecting'>('idle');
  readonly serverTick = signal<ExamTick | null>(null);

  private heartbeatSub?: Subscription;
  private lastPongAt = 0;

  start(): void {
    // Inbound: server events.
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

    // Outbound: heartbeat every 30s while open.
    this.heartbeatSub = interval(30_000).pipe(
      filter(() => this.connection() === 'open'),
    ).subscribe(() => {
      this.socket$.next({ type: 'ping', sentAt: Date.now() } as ExamClientEvent);
      // If we don't see a pong within 2 heartbeat windows, consider the socket dead and force reconnect.
      if (this.lastPongAt && Date.now() - this.lastPongAt > 70_000) {
        this.socket$.error(new Error('heartbeat-timeout'));
      }
    });
  }

  private handleEvent(evt: ExamServerEvent): void {
    switch (evt.type) {
      case 'pong':         this.lastPongAt = Date.now(); return;
      case 'tick':         this.serverTick.set(evt);     return;
      case 'auto-submit':  /* navigate to results */     return;
      // ...
    }
  }
}
```

**Properties of the heartbeat:**

- **Lightweight payload** — `{ type: 'ping', sentAt: <ms> }`. No PII, no auth re-send (the socket is already authenticated for its lifetime).
- **30-second cadence** — chosen to comfortably absorb the **~60 s disconnection scenario** (see §6.4) while still detecting stalls quickly enough for proctoring purposes.
- **Driven by `rxjs/interval`** with `filter(() => connection === 'open')` so it never queues sends while disconnected.
- **Does not block UI rendering** — the heartbeat is a single small message dispatched off the change-detection cycle.
- **One missed pong is normal; two consecutive misses force a reconnect.** This avoids spurious reconnects on a transient hiccup but still recovers quickly from a real stall.

### 6.3 Offline-First Exam Answers (IndexedDB sync queue)

Exam answers must reach the server reliably *even when* the network drops mid-question. The architecture pairs a route-scoped `ExamSessionStore` (signals, see [03 §11.1](./03-state-management.md#111-exam-answer-drafts-offline-first-with-indexeddb)) with **IndexedDB** as the durable local buffer.

```
[ Question UI ]
      │  user answers
      ▼
[ ExamSessionStore.setAnswer ]  ──►  signals.update()  (UI feedback: instant)
      │
      ├──►  IndexedDB.put({ sessionId, questionId, value, clientSeq, synced: false })
      │
      └──►  pendingOps.push(op) → flushQueue()
                     │
                     │ navigator.onLine === false?
                     │      └─► status='queued'; do nothing; await reconnect
                     │
                     │ online?
                     ▼
            POST /exams/{id}/answers  (idempotent on { sessionId, questionId, clientSeq })
                     │
                     ├─► 2xx → IndexedDB.markSynced(...) + pendingOps.shift()
                     │
                     ├─► 5xx / network → leave op in queue; retryInterceptor handles backoff
                     │
                     └─► 409 (server has higher clientSeq) → drop op; refresh from server
```

**Idempotency contract with the backend:**

- `POST /exams/{sessionId}/answers` with body `{ questionId, value, clientSeq }`.
- Server stores the answer keyed on `(sessionId, questionId)` and accepts the write iff `clientSeq` is greater than any previously accepted `clientSeq` for that pair.
- Replays of the same `clientSeq` are safe — the server returns the canonical state without re-writing.
- On submit, the server reads only its own state of record. The frontend's queue is purely a transport buffer.

**Reconnect flow:**

1. `NetworkStatusService` flips `online` signal `false → true` (driven by `window.online`/`offline` events plus a low-cost `HEAD /health` probe to defeat captive portals).
2. `effect()` in `ExamSessionStore` sees the change and calls `flushQueue()`.
3. The queue drains in `clientSeq` order; each accepted op is removed and its IndexedDB row marked `synced`.
4. The UI's connection indicator transitions: `offline` → `syncing` → `synced`. The submit button stays disabled until `pendingOps.length === 0 && syncStatus === 'synced'`.

**What the frontend never does:**

- It never decides whether an answer "counts" — only the backend grades.
- It never deletes a pending op without a 2xx server acknowledgement.
- It never retries non-idempotent calls automatically; only the answer endpoint (idempotent by design) is auto-retried.
- It never holds tokens or grading data in IndexedDB. IndexedDB is **only** used for exam draft answers and (optionally) encrypted, per [06 §2.7](./06-performance-security-accessibility.md#27-sensitive-data-handling).

### 6.4 Disconnection Test Scenario (~60 seconds)

This is the standing acceptance scenario for the exam engine. It must pass for any release that touches `features/assessments/`.

| Step | Action                                                                                           | Expected behaviour                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Learner is mid-exam, has answered Q1–Q3, currently on Q4. Connection is live.                    | `connection = open`, heartbeat every 30 s, `pendingOps = []`, `syncStatus = 'synced'`.                                                                            |
| 2    | Tester forces network offline (DevTools → Offline) for **~60 seconds**.                          | UI shows a discreet "offline — your answers are saved locally" indicator. Heartbeat is suppressed (no socket). Timer continues showing the last server tick.       |
| 3    | Learner answers Q4 and Q5 while offline.                                                         | Both answers visible in UI immediately. Both written to IndexedDB. `pendingOps.length === 2`. No spinner blocking the user.                                       |
| 4    | Tester restores network.                                                                         | Within ~5 s, socket reconnects (`reconnecting → open`). Heartbeat resumes. `flushQueue()` runs; Q4 then Q5 POST in order; each succeeds with 2xx.                  |
| 5    | After flush.                                                                                      | `pendingOps = []`, `syncStatus = 'synced'`, indicator transitions to "back online — answers synced". Server-side state reflects Q4 and Q5 with correct `clientSeq`. |
| 6    | Learner submits exam.                                                                            | Submit button enabled (queue empty, status synced). Submit succeeds; results page renders.                                                                        |
| 7    | Edge case: learner reloads the tab while offline.                                                | On resume, `ExamSessionStore.resume(sessionId)` loads server baseline + IndexedDB pending. The merged answers reappear in the form. When network returns, sync completes as in step 4. |

If any of these steps fails, the change ships with a regression and must be fixed before merge.

### 6.5 Notifications & Other Channels — Rules

- WebSockets connect only for **authenticated** users. Auth token is passed in the URL query on connect (alternative: first message sends a `{ type: 'auth', token }` frame — backend-dependent).
- Exponential backoff reconnect, capped at 30 s.
- On logout, all open sockets are closed explicitly.
- WS payloads are typed as discriminated unions per channel; unknown event types are logged but do not crash the app.
- If WS is not available (corporate proxy), fall back to **polling** for notifications every 60 s (`http.get('/notifications?since=...')`). The feature store abstracts over both sources so consumers don't care which is active.
- The 30-second exam heartbeat (§6.2) does **not** apply to the notifications channel — notifications rely on the standard reconnect-on-error pattern only.

---

## 7. File Uploads

- Use `HttpClient.post<T>(url, formData, { reportProgress: true, observe: 'events' })` and convert progress events to a signal.
- Enforce client-side validation on MIME type and size **before** uploading (with a final backend check — never trust the client).
- For large files (>10 MB), chunked upload is used (`TUS` or backend-specific multipart). The upload service exposes a progress signal per file.
- Uploaded media URLs returned by the backend are displayed via a CDN origin; the frontend never hosts user uploads.

---

## 8. File Downloads

- `HttpClient.get(url, { responseType: 'blob' })` then create an object URL for in-app preview, or trigger a download via a hidden `<a download>` for user-initiated saves.
- Certificate PDFs and reports are fetched this way.
- Revoke object URLs after use to avoid memory leaks: `URL.revokeObjectURL(blobUrl)`.

---

## 9. Error Handling UX

Consistent user-facing messaging is critical. Rules:

1. **Inline** errors on forms and small widgets. Never a toast for "email is required".
2. **Toast** errors for transient/global actions (saving, enrolling, posting an insight). Translated via Transloco.
3. **Full-page error state** for entire-page failures (list fetch died). Show a `ios-error-state` with a retry button.
4. **Never expose raw backend messages** to users. Use `AppError.userMessage` (translated) unless the backend message is explicitly tagged as safe via a `userFacing: true` convention.
5. **Log `AppError.techMessage`** (English) to the console and to the error-reporting sink with the `traceId` for support correlation.

---

## 10. Local Mocking & Backend-Free Development

Until backend endpoints exist, the frontend develops against **Mock Service Worker (MSW)**:

- A `src/mocks/` folder contains handlers that intercept `fetch`/`XHR` calls in the browser.
- Handlers live **only in dev/test builds** — stripped from production via `environment.production` check.
- Mock data lives alongside the mock handlers and matches the agreed DTO shapes.
- When the backend delivers a real endpoint, we remove (or keep disabled) the corresponding handler. This enables us to develop frontend pages before backend completion without touching production code paths.

---

## 11. Performance of the Data Layer

- **No unbounded lists.** Every list endpoint is paginated. UI defaults: 12–24 items per page.
- **Server-side filtering/sorting.** Filters are passed as query params; the frontend does not load the world and filter locally.
- **Request cancellation.** For search-as-you-type flows, use `switchMap` on RxJS pipelines or `AbortController` on imperative calls to cancel superseded requests.
- **Debounce user input** driving HTTP: 250–400 ms for search, 600+ ms for autosave.
- **Avoid over-fetching.** Prefer dedicated compact endpoints (`/courses/summary`) over bloated ones when the screen needs only a subset.

---

## 12. Security Cross-References

See [06 — Performance, Security & Accessibility](./06-performance-security-accessibility.md) for:

- CSP headers and the list of allowed origins (API, CDN, WS gateway).
- CSRF posture (SameSite=Strict + custom header double-submit).
- Input sanitization (`DomSanitizer`) and why `bypassSecurityTrustHtml` is banned without architect review.
- OWASP Top-10 mitigations relevant to the frontend.

---

## 13. Summary: Rules of Thumb

| If you need to...                          | Do this                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Call a REST endpoint                       | Add a method to the feature's `*.api.ts` and map the DTO in `*.mappers.ts`.          |
| Cache server data                          | Put it in the feature's `*.store.ts` as a signal. Invalidate on mutations.           |
| Show a toast on error                      | Let `errorInterceptor` do it. Don't duplicate in stores.                             |
| Suppress the default error toast           | Pass `HttpContext` with `SILENT` token; render error inline.                         |
| Add a header to every request              | Add or extend an interceptor in `core/http/`.                                        |
| Subscribe to a live event                  | Create a `*.ws.ts` and expose `toSignal()` outputs.                                  |
| Send a file                                | Use the shared `UploadService`, not ad-hoc FormData code.                            |
| Check a user's role in a template         | `<element *hasRole="['admin']">` — never raw store reads.                            |
