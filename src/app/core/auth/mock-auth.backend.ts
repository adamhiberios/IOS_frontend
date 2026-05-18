import { Injectable, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';

import {
  type AuthSession,
  type LoginCredentials,
  type RegisterPayload,
  type Role,
  type User,
} from './auth.model';

/**
 * In-process stand-in for the real auth backend.
 *
 * Why this exists
 * ---------------
 * Epic 3 ships the auth UI and the entire frontend session machinery
 * (AuthStore, guards, refresh interceptor) before the backend is ready.
 * Routing every call through a backend-shaped service — instead of stubbing
 * inside `AuthStore` — means the swap to the real API is a one-file change
 * (`AuthApi`) with no churn through the rest of the auth layer.
 *
 * Behaviour
 * ---------
 *   - Credentials are matched against an in-memory seed table (see {@link SEED_USERS}).
 *   - Refresh tokens are rotating: each call to `refresh()` invalidates the
 *     supplied token and returns a new one. Reusing an old refresh token
 *     fails with 401 — same posture the real backend will have (§1.1).
 *   - All methods simulate ~250 ms of network latency so loading states in
 *     the UI exercise their `pending` branches.
 *   - Storage is purely in-memory (this service is `providedIn: 'root'`,
 *     i.e. a singleton). Reload = empty refresh-token table = mock "logged
 *     out", which is consistent with the real-backend posture where the
 *     access token is in-memory only and a fresh refresh round-trip is
 *     required on every cold start (/docs/07 §2.2).
 *
 * Security
 * --------
 * The `accessToken` strings produced here are NOT real JWTs. They are
 * opaque base64-encoded JSON blobs of the form `mock.<payload>.sig`. The
 * frontend treats access tokens as opaque bearer credentials (§1.2), so
 * this is fine — but DO NOT decode and trust their contents anywhere in
 * the app. Roles come from the `AuthSession.roles` field, which the mock
 * backend ships alongside the token, not from the token itself.
 */

interface SeedRecord {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly country: string;
  readonly roles: readonly Role[];
}

/**
 * Documented credentials for local exploration. Surface these in the UI's
 * dev banner once it lands; until then they live here for hand-testing.
 *
 *   learner@ios.test    / Learner1!
 *   instructor@ios.test / Instructor1!
 *   admin@ios.test      / Admin12!@
 *   support@ios.test    / Support1!
 */
const SEED_USERS: readonly SeedRecord[] = [
  {
    id: 'usr_learner_001',
    email: 'learner@ios.test',
    username: 'learner',
    password: 'Learner1!',
    firstName: 'Layla',
    lastName: 'Learner',
    country: 'SA',
    roles: ['learner'],
  },
  {
    id: 'usr_instructor_001',
    email: 'instructor@ios.test',
    username: 'instructor',
    password: 'Instructor1!',
    firstName: 'Idris',
    lastName: 'Instructor',
    country: 'AE',
    roles: ['instructor', 'learner'],
  },
  {
    id: 'usr_admin_001',
    email: 'admin@ios.test',
    username: 'admin',
    password: 'Admin12!@',
    firstName: 'Aaliyah',
    lastName: 'Admin',
    country: 'CA',
    roles: ['admin', 'instructor', 'learner'],
  },
  {
    id: 'usr_support_001',
    email: 'support@ios.test',
    username: 'support',
    password: 'Support1!',
    firstName: 'Sami',
    lastName: 'Support',
    country: 'JO',
    roles: ['support'],
  },
];

const NETWORK_LATENCY_MS = 250;
const ACCESS_TOKEN_TTL_MS = 15 * 60_000; // 15 minutes — mirrors §1 lifetime row.

/**
 * Shape returned by every successful mock call. Kept narrow so the call site
 * doesn't need to know whether we minted a token from scratch or rotated one.
 */
type MockResponse = AuthSession;

@Injectable({ providedIn: 'root' })
export class MockAuthBackend {
  /** email → record, populated from {@link SEED_USERS} at construction. */
  private readonly users = new Map<string, SeedRecord>();
  /** Active refresh tokens → user id. Rotated on every refresh. */
  private readonly refreshTokens = new Map<string, string>();
  /** Auto-incrementing id for users created via `register()`. */
  private nextUserSeq = 1000;

  private readonly lang = inject(LanguageService);

  constructor() {
    for (const seed of SEED_USERS) {
      this.users.set(seed.email.toLowerCase(), seed);
      this.users.set(seed.username.toLowerCase(), seed);
    }
  }

  /**
   * Resolve with a fresh session, or reject with a 401-shaped error if
   * credentials don't match a seeded record.
   */
  async login(creds: LoginCredentials): Promise<MockResponse> {
    await delay(NETWORK_LATENCY_MS);

    const record = this.users.get(creds.identifier.trim().toLowerCase());
    if (!record || record.password !== creds.password) {
      throw new MockHttpError(401, this.lang.t('auth.errors.invalidCredentials'));
    }

    return this.mintSession(record);
  }

  /**
   * Create a new account with the `learner` role and immediately mint a
   * session for it. Mirrors what the real backend will do once email
   * verification lands behind a feature flag.
   */
  async register(payload: RegisterPayload): Promise<MockResponse> {
    await delay(NETWORK_LATENCY_MS);

    const emailKey = payload.email.trim().toLowerCase();
    const usernameKey = payload.username.trim().toLowerCase();
    if (this.users.has(emailKey)) {
      throw new MockHttpError(409, this.lang.t('auth.errors.unknownError'));
    }
    if (this.users.has(usernameKey)) {
      throw new MockHttpError(409, this.lang.t('auth.errors.unknownError'));
    }

    const record: SeedRecord = {
      id: `usr_new_${String(this.nextUserSeq++)}`,
      email: payload.email.trim(),
      username: payload.username.trim(),
      password: payload.password,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      country: payload.country,
      roles: ['learner'],
    };
    this.users.set(emailKey, record);
    this.users.set(usernameKey, record);

    return this.mintSession(record);
  }

  /**
   * Exchange a refresh token for a new access token, rotating the refresh
   * token. Old refresh tokens are invalidated immediately — reuse fails.
   */
  async refresh(refreshToken: string | null): Promise<MockResponse> {
    await delay(NETWORK_LATENCY_MS);

    if (!refreshToken) {
      throw new MockHttpError(401, this.lang.t('auth.errors.sessionExpired'));
    }
    const userId = this.refreshTokens.get(refreshToken);
    if (!userId) {
      throw new MockHttpError(401, this.lang.t('auth.errors.sessionExpired'));
    }
    this.refreshTokens.delete(refreshToken);

    const record = [...this.users.values()].find((u) => u.id === userId);
    if (!record) {
      throw new MockHttpError(401, this.lang.t('auth.errors.accountLocked'));
    }
    return this.mintSession(record);
  }

  /**
   * Invalidate the supplied refresh token. The real backend would also clear
   * the cookie on the response; here there's no cookie to clear.
   */
  async logout(refreshToken: string | null): Promise<void> {
    await delay(NETWORK_LATENCY_MS / 2);
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Internals                                                              */
  /* ---------------------------------------------------------------------- */

  private mintSession(record: SeedRecord): MockResponse {
    const accessToken = mintMockJwt({
      sub: record.id,
      roles: record.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000),
    });
    const refreshToken = mintOpaqueToken();
    this.refreshTokens.set(refreshToken, record.id);

    const user: User = {
      id: record.id,
      email: record.email,
      username: record.username,
      firstName: record.firstName,
      lastName: record.lastName,
      country: record.country,
    };

    return { accessToken, refreshToken, user, roles: [...record.roles] };
  }
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

interface MockJwtPayload {
  readonly sub: string;
  readonly roles: readonly Role[];
  readonly iat: number;
  readonly exp: number;
}

/**
 * Build a `header.payload.sig` string that LOOKS like a JWT but is not signed.
 * We never verify the signature on the frontend (§1.2) so this is fine for
 * the mock — and lets the bearer-token interceptor exercise its real path.
 */
function mintMockJwt(payload: MockJwtPayload): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  // The "signature" is intentionally non-cryptographic. Documenting it as
  // `mock-sig` in the token helps reviewers spot the dev backend in a HAR.
  return `${header}.${body}.mock-sig`;
}

/** ~256 bits of opaque randomness for refresh tokens. */
function mintOpaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(String.fromCharCode(...bytes));
}

function base64Url(raw: string): string {
  // btoa works on latin1 — for ASCII payloads (which JSON-serialised mock
  // claims always are) this is safe and matches what real JWTs do.
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Errors thrown from the mock are a real `Error` subclass shaped like an
 * HttpErrorResponse subset, so the AuthStore's catch-paths can be written
 * against the real-API contract without a separate mock-only branch.
 *
 * Subclassing `Error` keeps the typescript-eslint `only-throw-error` rule
 * happy (CLAUDE.md project lint config) and preserves stack traces.
 */
export class MockHttpError extends Error {
  readonly mock = true as const;

  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MockHttpError';
  }
}

export function isMockHttpError(value: unknown): value is MockHttpError {
  return value instanceof MockHttpError;
}
