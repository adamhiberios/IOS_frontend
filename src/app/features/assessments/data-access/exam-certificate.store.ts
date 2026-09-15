import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ExamCertificateApi, type IssuedCertificateDto } from './exam-certificate.api';

/** Poll cadence while the backend renders the PDF (normally a few seconds). */
const POLL_INTERVAL_MS = 4_000;

/** Give up polling after this long and point the student at My Credentials. */
const POLL_TIMEOUT_MS = 90_000;

/**
 * A certificate issued this long before the result page opened still counts as
 * "the one just earned" — covers clock skew and a slow submit round-trip.
 */
const ISSUED_GRACE_MS = 15 * 60_000;

export type CertificateWatchStatus = 'idle' | 'pending' | 'ready' | 'delayed';

/**
 * `ExamCertificateStore` — waits for the certificate generated after a passed
 * final exam. Provided per result page (not root).
 *
 * The submit response carries no attempt or certificate id (BE-I-32), so the
 * certificate is recognised as the newest valid one issued since shortly before
 * this page opened, with its PDF uploaded. Passing two different final exams
 * within that window is not a realistic flow, and either match would still be
 * the student's own genuine certificate — never a placeholder.
 */
@Injectable()
export class ExamCertificateStore {
  private readonly api = inject(ExamCertificateApi);

  private readonly _status = signal<CertificateWatchStatus>('idle');
  private readonly _certificate = signal<IssuedCertificateDto | null>(null);

  readonly status = this._status.asReadonly();
  readonly certificate = this._certificate.asReadonly();

  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopped = true;
      if (this.timer) clearTimeout(this.timer);
    });
  }

  /** Start polling for the certificate issued for the exam just passed. */
  watch(): void {
    if (this._status() !== 'idle') return;
    const since = Date.now() - ISSUED_GRACE_MS;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    this._status.set('pending');
    void this.poll(since, deadline);
  }

  private async poll(since: number, deadline: number): Promise<void> {
    if (this.stopped) return;
    try {
      const certs = await firstValueFrom(this.api.list());
      const match = certs
        .filter(
          (c) =>
            c.status === 'valid' &&
            c.certificateUrl !== null &&
            new Date(c.issuedAt).getTime() >= since,
        )
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())[0];
      if (match) {
        this._certificate.set(match);
        this._status.set('ready');
        return;
      }
    } catch {
      // Transient (network / token refresh) — keep polling until the deadline.
    }
    if (this.stopped) return;
    if (Date.now() >= deadline) {
      this._status.set('delayed');
      return;
    }
    this.timer = setTimeout(() => void this.poll(since, deadline), POLL_INTERVAL_MS);
  }
}
