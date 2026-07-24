import { Injectable } from '@angular/core';

import { type ExamDraftStore } from './exam-draft.store';
import { type AnswerOp, type PersistedExamSession } from './exam.model';

/**
 * In-memory {@link ExamDraftStore} — the test/fake implementation named in spec
 * §12. Mirrors {@link IdbExamDraftStore}'s semantics exactly (one row per
 * `sessionId/questionId`, monotonic `clientSeq` guard, synced-match ack) without
 * touching IndexedDB, so it runs in Node and in unit tests. Also a safe default
 * in any non-browser context where `indexedDB` is unavailable.
 */
interface FakeRow {
  clientSeq: number;
  value: string;
  synced: boolean;
  createdAt: number;
}

@Injectable()
export class InMemoryExamDraftStore implements ExamDraftStore {
  /** `sessionId` → (`questionId` → row). */
  private readonly rows = new Map<string, Map<string, FakeRow>>();

  /** `sessionId` → persisted session snapshot (+ createdAt). */
  private readonly meta = new Map<string, { session: PersistedExamSession; createdAt: number }>();

  /** Injectable clock so tests can control `pruneOlderThan` without wall time. */
  now: () => number = () => Date.now();

  put(op: AnswerOp): Promise<void> {
    const bySession = this.rows.get(op.sessionId) ?? new Map<string, FakeRow>();
    const existing = bySession.get(op.questionId);
    if (!existing || existing.clientSeq < op.clientSeq) {
      bySession.set(op.questionId, {
        clientSeq: op.clientSeq,
        value: op.value,
        synced: false,
        createdAt: this.now(),
      });
      this.rows.set(op.sessionId, bySession);
    }
    return Promise.resolve();
  }

  markManySynced(acks: readonly AnswerOp[]): Promise<void> {
    for (const op of acks) {
      const existing = this.rows.get(op.sessionId)?.get(op.questionId);
      if (existing && existing.clientSeq === op.clientSeq && !existing.synced) {
        existing.synced = true;
      }
    }
    return Promise.resolve();
  }

  loadPending(sessionId: string): Promise<AnswerOp[]> {
    const bySession = this.rows.get(sessionId);
    if (!bySession) return Promise.resolve([]);
    const pending: AnswerOp[] = [];
    for (const [questionId, row] of bySession) {
      if (!row.synced) {
        pending.push({ sessionId, questionId, value: row.value, clientSeq: row.clientSeq });
      }
    }
    pending.sort((a, b) => a.clientSeq - b.clientSeq);
    return Promise.resolve(pending);
  }

  deleteSession(sessionId: string): Promise<void> {
    this.rows.delete(sessionId);
    this.meta.delete(sessionId);
    return Promise.resolve();
  }

  pruneOlderThan(ms: number): Promise<number> {
    const cutoff = this.now() - ms;
    let pruned = 0;
    for (const [sessionId, bySession] of this.rows) {
      for (const [questionId, row] of bySession) {
        if (row.createdAt < cutoff) {
          bySession.delete(questionId);
          pruned += 1;
        }
      }
      if (bySession.size === 0) this.rows.delete(sessionId);
    }
    for (const [sessionId, entry] of this.meta) {
      if (entry.createdAt < cutoff) {
        this.meta.delete(sessionId);
        pruned += 1;
      }
    }
    return Promise.resolve(pruned);
  }

  putSessionMeta(session: PersistedExamSession): Promise<void> {
    this.meta.set(session.sessionId, { session, createdAt: this.now() });
    return Promise.resolve();
  }

  loadSessionMeta(sessionId: string): Promise<PersistedExamSession | null> {
    return Promise.resolve(this.meta.get(sessionId)?.session ?? null);
  }
}
