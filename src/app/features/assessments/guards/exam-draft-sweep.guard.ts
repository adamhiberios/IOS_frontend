import { inject } from '@angular/core';
import { type CanActivateFn } from '@angular/router';

import { EXAM_DRAFT_STORE } from '../data-access/exam-draft.store';

/** Drafts older than this are orphans from crashed/abandoned sessions (spec §5.7). */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Fire-and-forget defensive sweep of stale IndexedDB exam drafts.
 *
 * The spec (§5.7) calls for this on app boot, but wiring it into `app.config`
 * would drag the exam/IndexedDB code into the app shell and break the
 * zero-initial-cost guarantee (CLAUDE §7). Instead it runs on entry to the
 * assessments area — inside the lazy exam chunk — which is exactly when stale
 * drafts matter (just before starting or resuming an exam). It never blocks
 * navigation and swallows its own errors.
 */
export const examDraftSweepGuard: CanActivateFn = () => {
  const drafts = inject(EXAM_DRAFT_STORE);
  void drafts.pruneOlderThan(SEVEN_DAYS_MS).catch(() => undefined);
  return true;
};
