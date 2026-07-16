import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { AdminIssuedCertsApi } from './issued-certs.api';
import { type IssuedCertFilters, type IssuedCertificate } from './issued-certs.model';
import { AdminUsersApi } from './users.api';
import { type StudentListItem } from './users.model';

/** Page size for the issued-certificates list (backend max is 100). */
const PAGE_LIMIT = 50;
/** Certs offered in the picker (backend max page size). */
const CERT_PICKER_LIMIT = 100;
/** Max student search results to show. */
const STUDENT_SEARCH_LIMIT = 10;

/** A certificate option for the picker. */
export interface CertOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Signal store for the admin issued-certificates list + revoke (BE-I-15 / B2).
 *
 * Cursor-paginated, newest-first. Filters are driven by pickers rather than raw
 * UUIDs: a **certificate select** (options from the catalog) and a **student
 * search-and-pick** (via {@link AdminUsersApi}) — both map to the backend
 * `certId` / `userId` query params. `revoke(id)` calls the idempotent revoke
 * endpoint and flips the row's status in place. Cleared on `user.logged-out`
 * (rows carry student PII).
 */
@Injectable({ providedIn: 'root' })
export class AdminIssuedCertsStore {
  private readonly api = inject(AdminIssuedCertsApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly users = inject(AdminUsersApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  // List
  private readonly _items = signal<readonly IssuedCertificate[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _filters = signal<IssuedCertFilters>({});
  private readonly _loaded = signal(false);

  // Revoke
  private readonly _revokePendingId = signal<string | null>(null);
  private readonly _revokeError = signal<string | null>(null);

  // Certificate picker
  private readonly _certs = signal<readonly CertOption[]>([]);
  private readonly _certsLoading = signal(false);

  // Student search-and-pick
  private readonly _students = signal<readonly StudentListItem[]>([]);
  private readonly _studentsLoading = signal(false);
  private readonly _studentsError = signal<string | null>(null);
  private readonly _searched = signal(false);
  private readonly _selectedStudent = signal<StudentListItem | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly revokePendingId = this._revokePendingId.asReadonly();
  readonly revokeError = this._revokeError.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();

  readonly students = this._students.asReadonly();
  readonly studentsLoading = this._studentsLoading.asReadonly();
  readonly studentsError = this._studentsError.asReadonly();
  readonly searched = this._searched.asReadonly();
  readonly selectedStudent = this._selectedStudent.asReadonly();
  readonly noStudentResults = computed(
    () => this._searched() && !this._studentsLoading() && this._students().length === 0,
  );
  readonly hasFilters = computed(
    () => this._filters().certId !== undefined || this._filters().userId !== undefined,
  );

  /** Load the first page (once) unless `force`d. */
  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    await this.fetch(false);
  }

  /** Force a re-fetch from the first page with the current filters. */
  async reload(): Promise<void> {
    await this.fetch(false);
  }

  /** Append the next keyset page, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  // ── Certificate filter ───────────────────────────────────────────────────

  /** Load the certificate options for the picker (active certs only). */
  async loadCerts(): Promise<void> {
    if (this._certsLoading() || this._certs().length > 0) return;
    this._certsLoading.set(true);
    try {
      const page = await firstValueFrom(
        this.catalog.list({ active: true, limit: CERT_PICKER_LIMIT }),
      );
      this._certs.set(
        page.items.map((c) => ({ id: c.id, label: `${c.title} (${c.programCode})` })),
      );
    } catch {
      // A picker failure shouldn't block the list; leave options empty (the
      // student filter + unfiltered list still work).
      this._certs.set([]);
    } finally {
      this._certsLoading.set(false);
    }
  }

  /** Filter by certificate (or clear when `null`), then reload from page 1. */
  async selectCert(certId: string | null): Promise<void> {
    const next = certId || undefined;
    if (next === this._filters().certId) return;
    this._filters.update((f) => ({ ...f, certId: next }));
    await this.fetch(false);
  }

  // ── Student filter ─────────────────────────────────────────────────────────

  /** Search students by name/email for the filter picker. */
  async searchStudents(query: string): Promise<void> {
    this._studentsLoading.set(true);
    this._studentsError.set(null);
    this._searched.set(true);
    try {
      const page = await firstValueFrom(
        this.users.list({ search: query.trim() || undefined, limit: STUDENT_SEARCH_LIMIT }),
      );
      this._students.set(page.items);
    } catch (err) {
      this._students.set([]);
      // Isolate the search failure — never blank the main issued-certs list.
      this._studentsError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.issuedCerts.studentsError'),
      );
    } finally {
      this._studentsLoading.set(false);
    }
  }

  /** Filter by the chosen student, then reload from page 1. */
  async selectStudent(student: StudentListItem): Promise<void> {
    this._selectedStudent.set(student);
    this._students.set([]);
    this._studentsError.set(null);
    this._searched.set(false);
    if (student.id === this._filters().userId) return;
    this._filters.update((f) => ({ ...f, userId: student.id }));
    await this.fetch(false);
  }

  /** Clear the student filter, then reload from page 1. */
  async clearStudent(): Promise<void> {
    this._selectedStudent.set(null);
    this._students.set([]);
    this._studentsError.set(null);
    this._searched.set(false);
    if (this._filters().userId === undefined) return;
    this._filters.update((f) => ({ ...f, userId: undefined }));
    await this.fetch(false);
  }

  // ── Revoke ─────────────────────────────────────────────────────────────────

  /**
   * Revoke an issued certificate. Idempotent server-side; on success the row's
   * status flips to `revoked` in place. Returns `true` when the call succeeded
   * (including an already-revoked no-op); the reason is exposed via
   * {@link revokeError} otherwise.
   */
  async revoke(id: string): Promise<boolean> {
    if (this._revokePendingId() !== null) return false;
    this._revokePendingId.set(id);
    this._revokeError.set(null);
    try {
      await firstValueFrom(this.api.revoke(id));
      this._items.update((rows) =>
        rows.map((r) => (r.id === id ? { ...r, status: 'revoked' as const } : r)),
      );
      return true;
    } catch (err) {
      this._revokeError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.issuedCerts.revokeError'),
      );
      return false;
    } finally {
      this._revokePendingId.set(null);
    }
  }

  /** Clear a lingering revoke error (e.g. when the confirm dialog closes). */
  clearRevokeError(): void {
    this._revokeError.set(null);
  }

  private async fetch(append: boolean): Promise<void> {
    if (append) {
      this._loadingMore.set(true);
    } else {
      this._loading.set(true);
    }
    this._error.set(null);

    try {
      const page = await firstValueFrom(
        this.api.list({
          ...this._filters(),
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.issuedCerts.error'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }

  private clear(): void {
    this._items.set([]);
    this._error.set(null);
    this._revokeError.set(null);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._filters.set({});
    this._loaded.set(false);
    this._certs.set([]);
    this._students.set([]);
    this._studentsError.set(null);
    this._searched.set(false);
    this._selectedStudent.set(null);
  }
}
