import { Injectable, InjectionToken } from '@angular/core';

import { type AnswerOp, type PersistedExamSession } from './exam.model';

/**
 * Offline draft buffer for exam answers (spec §5, `08-exam-engine.md`).
 *
 * Backing store: IndexedDB `ios-exam-drafts` / object store `pendingAnswers`.
 * This is a **transport buffer**, never a state of record — the backend is
 * authoritative (spec's three immovable rules). Rows hold only
 * `{ sessionId, questionId, optionId }` plus bookkeeping — no tokens, no PII —
 * so, and because `POST /start` issues no per-session key, the spec's optional
 * draft encryption (§7) does not apply and drafts are stored in plaintext.
 *
 * ── Reconciliation with spec §5.2 (see `exam.model.ts` header) ───────────────
 * The spec keys rows on `(sessionId, questionId, clientSeq)` to make a
 * per-answer POST idempotent. The live backend has no per-answer endpoint — it
 * takes the whole answers map (last-write-wins) — so we only ever need the
 * LATEST answer per question locally. Rows are therefore keyed on
 * `[sessionId, questionId]` (one upserted row per question) and `clientSeq` is a
 * monotonic guard field: a write is applied only when its `clientSeq` is newer,
 * and `markSynced` acknowledges a row only when the stored `clientSeq` still
 * matches (so a fresh edit that landed mid-flush is never wrongly marked synced).
 */
export interface ExamDraftStore {
  /** Upsert the latest answer for a question (ignored if an equal/newer row exists). */
  put(op: AnswerOp): Promise<void>;

  /**
   * Acknowledge several answers in ONE transaction after a bulk autosave — each
   * row is marked synced only if its stored `clientSeq` still matches (a fresh
   * edit that landed mid-flush stays pending).
   */
  markManySynced(acks: readonly AnswerOp[]): Promise<void>;

  /** Unsynced answers for a session, ascending by `clientSeq`. */
  loadPending(sessionId: string): Promise<AnswerOp[]>;

  /** Drop every draft AND the session snapshot (on confirmed submit / expiry). */
  deleteSession(sessionId: string): Promise<void>;

  /** Defensive sweep — delete rows older than `ms`; returns the count pruned. */
  pruneOlderThan(ms: number): Promise<number>;

  /**
   * Persist the session snapshot (questions + meta) so the runner can rehydrate
   * after a full/offline tab reload. See {@link PersistedExamSession} (BE-I-23).
   */
  putSessionMeta(session: PersistedExamSession): Promise<void>;

  /** The persisted session snapshot, or `null` if none / unavailable. */
  loadSessionMeta(sessionId: string): Promise<PersistedExamSession | null>;
}

/**
 * DI token for the draft store. Defaults to the IndexedDB implementation; tests
 * (and non-browser contexts) override it with `InMemoryExamDraftStore`
 * (`exam-draft.store.fake.ts`).
 */
export const EXAM_DRAFT_STORE = new InjectionToken<ExamDraftStore>('exam.draft-store', {
  providedIn: 'root',
  factory: () => new IdbExamDraftStore(),
});

// ── IndexedDB implementation ─────────────────────────────────────────────────

const DB_NAME = 'ios-exam-drafts';
const DB_VERSION = 1;
const STORE = 'pendingAnswers';
const META_STORE = 'sessionMeta';
const INDEX_BY_SESSION = 'bySession';

/** Persisted row shape (superset of {@link AnswerOp} with storage bookkeeping). */
interface PendingAnswerRow {
  readonly sessionId: string;
  readonly questionId: string;
  readonly clientSeq: number;
  readonly value: string;
  readonly synced: boolean;
  /** `Date.now()` at write time — used by {@link ExamDraftStore.pruneOlderThan}. */
  readonly createdAt: number;
}

/** Persisted session-snapshot row ({@link PersistedExamSession} + prune bookkeeping). */
interface SessionMetaRow extends PersistedExamSession {
  /** `Date.now()` at write time — used by {@link ExamDraftStore.pruneOlderThan}. */
  readonly createdAt: number;
}

function toAnswerOp(row: PendingAnswerRow): AnswerOp {
  return {
    sessionId: row.sessionId,
    questionId: row.questionId,
    value: row.value,
    clientSeq: row.clientSeq,
  };
}

/**
 * Native-IndexedDB {@link ExamDraftStore}. No third-party dependency — the API
 * surface used here (composite key path, one index, cursors) is small enough to
 * wrap directly. Dependency-free constructor so the boot sweep can `new` it
 * outside DI.
 */
@Injectable()
export class IdbExamDraftStore implements ExamDraftStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async put(op: AnswerOp): Promise<void> {
    const db = await this.db();
    const row: PendingAnswerRow = {
      sessionId: op.sessionId,
      questionId: op.questionId,
      clientSeq: op.clientSeq,
      value: op.value,
      synced: false,
      createdAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const getReq = store.get([op.sessionId, op.questionId]) as IDBRequest<
        PendingAnswerRow | undefined
      >;
      getReq.onsuccess = () => {
        const existing = getReq.result;
        // Apply only when strictly newer (or first write). Guards against a
        // stale write landing after a newer one under any reordering.
        if (!existing || existing.clientSeq < op.clientSeq) {
          store.put(row);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB put aborted'));
    });
  }

  async markManySynced(acks: readonly AnswerOp[]): Promise<void> {
    if (acks.length === 0) return;
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const op of acks) {
        const getReq = store.get([op.sessionId, op.questionId]) as IDBRequest<
          PendingAnswerRow | undefined
        >;
        getReq.onsuccess = () => {
          const existing = getReq.result;
          // Only acknowledge the exact write we flushed — a newer edit that landed
          // mid-flush (higher clientSeq) must stay pending.
          if (existing && existing.clientSeq === op.clientSeq && !existing.synced) {
            store.put({ ...existing, synced: true });
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB markManySynced failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB markManySynced aborted'));
    });
  }

  async loadPending(sessionId: string): Promise<AnswerOp[]> {
    const db = await this.db();
    const rows = await new Promise<PendingAnswerRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const index = tx.objectStore(STORE).index(INDEX_BY_SESSION);
      const req = index.getAll(IDBKeyRange.only(sessionId)) as IDBRequest<PendingAnswerRow[]>;
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB loadPending failed'));
    });
    return rows
      .filter((r) => !r.synced)
      .sort((a, b) => a.clientSeq - b.clientSeq)
      .map(toAnswerOp);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE, META_STORE], 'readwrite');
      const index = tx.objectStore(STORE).index(INDEX_BY_SESSION);
      const cursorReq = index.openCursor(IDBKeyRange.only(sessionId));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.objectStore(META_STORE).delete(sessionId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB deleteSession failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB deleteSession aborted'));
    });
  }

  async putSessionMeta(session: PersistedExamSession): Promise<void> {
    const db = await this.db();
    const row: SessionMetaRow = { ...session, createdAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB putSessionMeta failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB putSessionMeta aborted'));
    });
  }

  async loadSessionMeta(sessionId: string): Promise<PersistedExamSession | null> {
    const db = await this.db();
    return new Promise<PersistedExamSession | null>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(sessionId) as IDBRequest<
        SessionMetaRow | undefined
      >;
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB loadSessionMeta failed'));
    });
  }

  async pruneOlderThan(ms: number): Promise<number> {
    const db = await this.db();
    const cutoff = Date.now() - ms;
    return new Promise<number>((resolve, reject) => {
      let pruned = 0;
      const tx = db.transaction([STORE, META_STORE], 'readwrite');
      const sweep = (store: IDBObjectStore): void => {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const row = cursor.value as { createdAt: number };
            if (row.createdAt < cutoff) {
              cursor.delete();
              pruned += 1;
            }
            cursor.continue();
          }
        };
      };
      sweep(tx.objectStore(STORE));
      sweep(tx.objectStore(META_STORE));
      tx.oncomplete = () => resolve(pruned);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB pruneOlderThan failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB pruneOlderThan aborted'));
    });
  }

  private db(): Promise<IDBDatabase> {
    return (this.dbPromise ??= this.openDb());
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable in this context'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: ['sessionId', 'questionId'] });
          store.createIndex(INDEX_BY_SESSION, 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'sessionId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      // A blocked upgrade (another tab holds an older version open) should not
      // hang the caller forever; surface it so the store can degrade gracefully.
      req.onblocked = () => reject(new Error('IndexedDB open blocked by another connection'));
    });
  }
}
