# 08 — Authentication & Authorization

This document is the consolidated source of truth for how the Institute of Scrum (IOS) LMS frontend authenticates users and enforces role-based authorization. It supersedes — and is cross-referenced from — the auth-related sections in [04 — API Integration §5](./04-api-integration-data-flow.md#5-authentication-flow) and [06 — Performance, Security & Accessibility §2.2–§2.3](./06-performance-security-accessibility.md#22-authentication--session-see-also-04-5).

> **Frontend is not a security boundary — the backend is.** The frontend's job is to (a) make login and session continuity smooth, (b) hide UI affordances the user cannot use, and (c) avoid weakening the system. Every protected action is re-authorized server-side regardless of what the frontend believes.

---

## 1. Token Model

The system uses **JWT access tokens** + **rotating refresh tokens** with **RBAC**.

| Token             | Lifetime            | Storage                                    | Carries                                         |
| ----------------- | ------------------- | ------------------------------------------ | ----------------------------------------------- |
| **Access token**  | ~15 minutes         | **In-memory signal** (`AuthStore._accessToken`) | `sub` (user id), `roles[]`, `iat`, `exp`        |
| **Refresh token** | Days (configurable) | **httpOnly, Secure, SameSite=Strict cookie** issued by backend; rotates on every use | Opaque server-side; not parsed by the frontend  |
| **XSRF token**    | Session             | **Cookie** (readable by JS) + sent as `X-XSRF-TOKEN` header on state-changing requests | Random per session                              |

### 1.1 Why these storage choices

- **`localStorage` and `sessionStorage` are banned for tokens.** Both are readable by any script running in the page — a single XSS finding leaks every session in the system.
- **In-memory access token** survives only the current tab; it's lost on hard refresh. We immediately re-fetch a new access token via the refresh cookie on app boot, which is invisible to the user.
- **httpOnly refresh cookie** cannot be read by JavaScript at all, so even an XSS attack cannot exfiltrate it. `SameSite=Strict` neutralises the CSRF vector that cookies normally introduce.
- **Rotation on every refresh.** Each successful `/auth/refresh` call invalidates the old refresh token and issues a new one. A leaked refresh token works exactly once — and the next legitimate refresh will fail noisily, surfacing the compromise.

### 1.2 What the access token MUST and MUST NOT contain

| Must                                                            | Must Not                                          |
| --------------------------------------------------------------- | ------------------------------------------------- |
| Stable user id (`sub`)                                          | Email, phone, full name, address                  |
| Role list (`roles[]`)                                           | Password hashes, security questions               |
| Issued-at + expiry (`iat`, `exp`)                               | Permission matrices for every screen              |
| Issuer + audience (`iss`, `aud`) — verified server-side         | Free-form profile data                            |

The frontend **does not** verify the JWT signature. It treats the access token as an opaque bearer credential; the server is the only verifier.

---

## 2. Authentication Flow

### 2.1 Login

```
POST /auth/login                          { email, password, locale }
 ── 200 OK ──> { accessToken, user, roles[] }
                + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
                + Set-Cookie: XSRF-TOKEN=...; Secure; SameSite=Strict
                AuthStore._accessToken.set(accessToken)
                AuthStore._user.set(user)
                AuthStore._roles.set(roles)
                Router.navigate(['/dashboard'])
```

The login form opts out of the global error toast (`HttpContext.set(SILENT, true)`) and renders errors inline against the form fields ("Invalid credentials").

### 2.2 Silent re-authentication on app start

On boot, before the first protected route renders, `AuthStore.bootstrap()`:

1. Calls `POST /auth/refresh` with `withCredentials: true`.
2. If the refresh cookie is present and valid, the server returns a fresh access token; the frontend hydrates `_accessToken`, `_user`, `_roles`.
3. If the call fails with 401 → user is logged out → router navigates to `/auth/login`.

This makes the "stay logged in across tab close" experience work without ever holding a refresh token in JS.

### 2.3 Refresh on 401 (race-safe)

The `errorInterceptor` ([04 §3.4](./04-api-integration-data-flow.md#34-errorinterceptor)) catches 401s on protected endpoints and delegates to `AuthStore.handle401`. The implementation must be **race-safe**: if 12 requests fire in parallel and all return 401, only **one** refresh call is made and the other 11 wait for it.

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

Rules:

- The refresh call itself **must not** loop through this interceptor (`req.url.includes('/auth/refresh')` exits early in `errorInterceptor`).
- A failed refresh logs the user out **once**, regardless of how many concurrent requests triggered the failure (the `_refreshInFlight` shared observable ensures this).
- On success, the original requests are replayed with the new bearer token.

### 2.4 Logout

```
POST /auth/logout (withCredentials: true)
 ── 200 OK ──> backend invalidates refresh token, clears refresh cookie
                AuthStore._accessToken.set(null)
                AuthStore._user.set(null)
                AuthStore._roles.set([])
                Close all open WebSockets
                Wipe in-memory caches that are user-scoped
                Router.navigate(['/auth/login'], { queryParams: { reason } })
```

Logout reasons (`reason` param) the frontend distinguishes:

| Reason            | Triggered when                                             | UX                                                  |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| `user-initiated`  | User clicks "Log out"                                       | Redirect to `/auth/login` with no message           |
| `idle`            | Idle timeout fired                                          | Banner: "You were logged out due to inactivity"     |
| `refresh-failed`  | Refresh-token call returned 401/403/500                     | Banner: "Your session expired. Please sign in again." |
| `forced`          | Admin disabled the account; backend returns 403 with code   | Banner: "Your account has been signed out. Contact support." |

### 2.5 Idle timeout

An `IdleService` in `core/` tracks user activity (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`, debounced).

1. After **N minutes** of inactivity (default: 15 min, configurable per environment), a warning dialog appears with a 60 s countdown.
2. Activity during the warning dismisses it and resets the timer.
3. On countdown expiry → `AuthStore.logout({ reason: 'idle' })`.
4. Activity events fired across browser tabs are coordinated via `BroadcastChannel('ios-idle')` so a user typing in tab B does not log out tab A.

### 2.6 Multi-tab session coordination

`BroadcastChannel('ios-auth')` lets tabs share session events:

- `login` — a sibling tab finished logging in; we hydrate from refresh-cookie too.
- `logout` — a sibling tab logged out; we drop our state and navigate to login.
- `refresh-success` — a sibling tab refreshed the access token; we adopt the new one (avoids parallel refresh storms).

This is best-effort — the backend remains authoritative — but it gives the user a coherent experience across tabs.

---

## 3. RBAC Model

Roles are issued by the backend as a flat list inside the access token. The frontend's job is to map those roles to UI affordances and route gates.

### 3.1 Role catalog

| Role          | Scope                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `learner`     | Default role. Browse courses, enroll, take lessons/exams, view own certifications.                     |
| `instructor`  | Plus: author/edit owned course content, grade assessments, view enrolled-learner analytics.            |
| `admin`       | Plus: manage users, all courses, certifications, notifications; access analytics dashboards; system settings. |
| `support`     | Read-only access to user accounts and order history for triage. **Cannot** mutate certifications.      |
| *(future)*    | `partner`, `auditor` — out of scope for v1, allowed-list defined here so introduction is safe.         |

A user may have **more than one role** (e.g., an instructor who is also an admin). UI gates use **inclusive OR** (any matching role unlocks the affordance).

### 3.2 Route guard — `roleGuard`

```ts
// src/app/core/auth/role.guard.ts
export const roleGuard = (allowed: Role[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: router.url } });
    }
    const ok = auth.roles().some(r => allowed.includes(r));
    return ok ? true : router.createUrlTree(['/forbidden']);
  };
};
```

Usage:

```ts
{
  path: 'admin',
  canActivate: [authGuard, roleGuard(['admin'])],
  loadChildren: () => import('./features/admin/admin.routes'),
}
```

### 3.3 Template directive — `*hasRole`

```html
<button *hasRole="['admin', 'instructor']">Edit course</button>
```

Internally:

```ts
// src/app/core/auth/has-role.directive.ts
@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  private readonly auth = inject(AuthStore);
  private readonly view = inject(ViewContainerRef);
  private readonly tpl = inject(TemplateRef<unknown>);
  private rendered = false;

  @Input({ required: true }) set hasRole(roles: Role[]) {
    const ok = this.auth.roles().some(r => roles.includes(r));
    if (ok && !this.rendered) {
      this.view.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (!ok && this.rendered) {
      this.view.clear();
      this.rendered = false;
    }
  }
}
```

### 3.4 Route + UI permission matrix (v1)

| Area / Route              | Learner | Instructor | Admin | Support |
| ------------------------- | :-----: | :--------: | :---: | :-----: |
| `/auth/*`                 |    ✓    |     ✓      |   ✓   |    ✓    |
| `/dashboard`              |    ✓    |     ✓      |   ✓   |    ✓    |
| `/courses` (browse)       |    ✓    |     ✓      |   ✓   |    ✓    |
| `/courses/:id` (study)    |    ✓ *  |     ✓      |   ✓   |   read  |
| `/courses/authoring/*`    |         |     ✓      |   ✓   |         |
| `/exams/:sessionId`       |    ✓ *  |            |   ✓ ** |         |
| `/exams/grade/*`          |         |     ✓      |   ✓   |         |
| `/certifications/own`     |    ✓    |     ✓      |   ✓   |   read  |
| `/certifications/manage`  |         |            |   ✓   |         |
| `/admin/users`            |         |            |   ✓   |   read  |
| `/admin/notifications`    |         |            |   ✓   |         |
| `/admin/analytics`        |         |     ✓ ***  |   ✓   |         |
| `/profile`                |    ✓    |     ✓      |   ✓   |    ✓    |
| `/forbidden`              |    ✓    |     ✓      |   ✓   |    ✓    |

\* Only when enrolled.
\** Admin can join an exam in observation mode for support; cannot answer.
\*** Instructor sees only their own courses' analytics.

> The matrix is the **source of truth for the frontend's role-to-UI mapping**. The backend enforces the same matrix independently. If the two diverge, the backend wins and the frontend is fixed.

### 3.5 Method-level / action-level checks

The frontend does **not** maintain a fine-grained permission engine. Instead:

1. The UI shows or hides the action via `*hasRole` (cheap).
2. The action calls the backend.
3. If the backend returns `403`, the frontend shows a toast: "You're not allowed to do this." This is the safety net for any drift between client and server matrices.

### 3.6 Sensitive operations require re-auth

Some operations are gated by an additional **step-up authentication** (re-prompt for password, or future TOTP):

- Changing email or password.
- Deleting an account.
- Issuing or revoking a certification.
- Promoting another user to `admin`.

The backend issues a short-lived "step-up token" (~5 min) on successful re-auth, scoped to the specific action. The frontend sends it on the action request. **No step-up token is ever cached beyond the single action** — there is no UI affordance to "stay verified for 10 minutes."

---

## 4. Frontend Surface — `AuthStore`

```ts
@Injectable({ providedIn: 'root' })
export class AuthStore {
  // --- private state ---
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user        = signal<User | null>(null);
  private readonly _roles       = signal<Role[]>([]);
  private readonly _stepUp      = signal<{ token: string; exp: number } | null>(null);
  private _refreshInFlight: Observable<{ accessToken: string }> | null = null;

  // --- read-only views ---
  readonly accessToken    = this._accessToken.asReadonly();
  readonly user           = this._user.asReadonly();
  readonly roles          = this._roles.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly hasRole        = (r: Role) => computed(() => this._roles().includes(r));

  // --- actions ---
  bootstrap(): Promise<void> { /* silent refresh, see §2.2 */ }
  login(creds: LoginCredentials): Promise<void> { /* §2.1 */ }
  logout(opts: { reason: LogoutReason }): Promise<void> { /* §2.4 */ }
  handle401(req: HttpRequest<unknown>, next: HttpHandlerFn) { /* §2.3 */ }
  stepUp(action: SensitiveAction, password: string): Promise<string> { /* §3.6 */ }
  // ...
}
```

Components and feature stores read `roles()` / `user()` / `isAuthenticated()` and call action methods. They never write to private signals.

---

## 5. Threat Model (frontend perspective)

| Threat                                        | Likelihood   | Impact   | Mitigation                                                                                          |
| --------------------------------------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------- |
| **XSS exfiltration of access token**          | Low          | High     | Strict CSP ([06 §2.4](./06-performance-security-accessibility.md#24-xss)), no `bypassSecurityTrust*`, sanitised user content. Access token is in-memory only — refresh token cannot be reached at all. |
| **XSS exfiltration of refresh token**         | Very low     | Critical | `httpOnly` cookie — JS cannot read it. Defence-in-depth via CSP + Trusted Types (when enabled).      |
| **CSRF on state-changing endpoints**          | Low          | High     | `SameSite=Strict` on auth cookies + double-submit `X-XSRF-TOKEN` header.                              |
| **Token replay after device theft**           | Medium       | High     | Short access-token lifetime + idle timeout + step-up auth on sensitive operations. Backend can revoke refresh tokens server-side. |
| **Refresh-token theft and reuse**             | Low          | High     | Rotation on every refresh — a stolen token works exactly once; subsequent legitimate refresh fails and the account is flagged. |
| **Race condition on parallel 401s**           | High         | Low      | `_refreshInFlight` shared observable — exactly one refresh per burst.                                |
| **Privilege escalation via tampered roles[]** | Medium       | High     | Frontend roles are UX only. Every protected action is re-authorized server-side. Tampering does not grant access. |
| **Session leakage across users on shared device** | Medium   | Medium   | Idle timeout + `BroadcastChannel` logout coordination + login screen does not autocomplete email by default. |
| **Stolen step-up token reuse**                | Very low     | Medium   | Step-up token is single-use, scoped to one action, ~5 min lifetime, never persisted client-side.     |
| **Logout race (user clicks logout while a refresh is in flight)** | Medium | Low | Logout aborts the refresh observable and forces navigation regardless of the in-flight call's result. |

---

## 6. What the Frontend Never Does

- ❌ Trust roles or permissions sent from any source other than the access token returned by `/auth/login` or `/auth/refresh`.
- ❌ Store any token in `localStorage` / `sessionStorage` / IndexedDB.
- ❌ Decode the JWT signature — only the `payload` is read for `roles[]` and `exp`.
- ❌ Cache the password (the input element is cleared after submit; no `ngModel` debounce holds it).
- ❌ Implement "remember me" by extending access-token lifetime — that's the refresh token's job, server-side.
- ❌ Pass the access token in a URL except for the WebSocket connect URL (where it is one-time, immediately re-used by the server, and not logged by the frontend).
- ❌ Make security decisions on its own. Roles inform the UI; the backend authorizes the action.

---

## 7. Operational Notes

- **Logging.** Tokens are never logged — not to the console, not to the error reporter, not to analytics. The `errorInterceptor` strips `Authorization` and `Cookie` headers from any error report it ships.
- **CI checks.** A pre-commit hook scans for `localStorage.setItem(.*token` and `sessionStorage.setItem(.*token` patterns and fails the commit. A CI step audits the bundle for accidental inclusion of `bypassSecurityTrust*`.
- **Security review gate.** Any change to `core/auth/`, `core/http/`, or the CSP requires architect + security review before merge ([06 §2.11](./06-performance-security-accessibility.md#211-security-review-gate)).
- **Penetration testing.** SOW §6.2.15 covers a third-party security audit. We expect zero high/critical frontend findings against this design.

---

## 8. Cross-References

- [04 — API Integration & Data Flow §5](./04-api-integration-data-flow.md#5-authentication-flow) — interceptor wiring and DTO shapes.
- [06 — Performance, Security & Accessibility §2.2–§2.3](./06-performance-security-accessibility.md#22-authentication--session-see-also-04-5) — security posture in the broader OWASP context.
- [03 — State Management §13](./03-state-management.md#13-anti-patterns-banned) — banned patterns relevant to auth state.
- [09 — Exam Engine](./09-exam-engine.md) — uses the access token to authenticate WebSocket sessions and signed-payload heartbeats.
