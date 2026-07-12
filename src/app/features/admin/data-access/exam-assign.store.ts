import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { AdminExamAssignApi } from './exam-assign.api';
import { type IssuedAccessCode, type PublishedExam } from './exam-assign.model';
import { AdminUsersApi } from './users.api';
import { type StudentListItem } from './users.model';

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
 * Signal store for admin exam assignment.
 *
 * Orchestrates the assign flow: pick a certificate → pick a student (search) →
 * choose a specific published exam or auto-assign the next one → issue a
 * one-time access code. Business logic lives here; the page only binds signals.
 * The issued code is held until dismissed (it is shown only once).
 */
@Injectable({ providedIn: 'root' })
export class AdminExamAssignStore {
  private readonly catalog = inject(AdminCatalogApi);
  private readonly users = inject(AdminUsersApi);
  private readonly api = inject(AdminExamAssignApi);
  private readonly lang = inject(LanguageService);

  // Certificate picker
  private readonly _certs = signal<readonly CertOption[]>([]);
  private readonly _certsLoading = signal(false);
  private readonly _certsError = signal<string | null>(null);
  private readonly _certId = signal<string | null>(null);

  // Published exams for the selected cert
  private readonly _exams = signal<readonly PublishedExam[]>([]);
  private readonly _examsLoading = signal(false);
  private readonly _examsError = signal<string | null>(null);

  // Student search
  private readonly _students = signal<readonly StudentListItem[]>([]);
  private readonly _studentsLoading = signal(false);
  private readonly _studentsError = signal<string | null>(null);
  private readonly _searched = signal(false);
  private readonly _selectedStudent = signal<StudentListItem | null>(null);

  // Target + assignment
  private readonly _targetExamId = signal<string | null>(null); // null = auto-assign
  private readonly _assigning = signal(false);
  private readonly _assignError = signal<string | null>(null);
  private readonly _issued = signal<IssuedAccessCode | null>(null);

  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();
  readonly certsError = this._certsError.asReadonly();
  readonly certId = this._certId.asReadonly();

  readonly exams = this._exams.asReadonly();
  readonly examsLoading = this._examsLoading.asReadonly();
  readonly examsError = this._examsError.asReadonly();

  readonly students = this._students.asReadonly();
  readonly studentsLoading = this._studentsLoading.asReadonly();
  readonly studentsError = this._studentsError.asReadonly();
  readonly searched = this._searched.asReadonly();
  readonly selectedStudent = this._selectedStudent.asReadonly();
  readonly noStudentResults = computed(
    () => this._searched() && !this._studentsLoading() && this._students().length === 0,
  );

  readonly targetExamId = this._targetExamId.asReadonly();
  readonly assigning = this._assigning.asReadonly();
  readonly assignError = this._assignError.asReadonly();
  readonly issued = this._issued.asReadonly();

  readonly canAssign = computed(
    () => this._certId() !== null && this._selectedStudent() !== null && !this._assigning(),
  );

  /** Load the certificate options for the picker (active certs only). */
  async loadCerts(): Promise<void> {
    if (this._certsLoading()) return;
    this._certsLoading.set(true);
    this._certsError.set(null);
    try {
      const page = await firstValueFrom(
        this.catalog.list({ active: true, limit: CERT_PICKER_LIMIT }),
      );
      this._certs.set(
        page.items.map((c) => ({ id: c.id, label: `${c.title} (${c.programCode})` })),
      );
    } catch (err) {
      this._certsError.set(problemDetailMessage(err) ?? this.lang.t('admin.exam.certsError'));
    } finally {
      this._certsLoading.set(false);
    }
  }

  /** Select a certificate and load its published exams. Resets the target/result. */
  async setCert(certId: string | null): Promise<void> {
    const next = certId || null;
    if (next === this._certId()) return;
    this._certId.set(next);
    this._exams.set([]);
    this._examsError.set(null);
    this._targetExamId.set(null);
    this._assignError.set(null);
    this._issued.set(null);
    if (next !== null) await this.loadExams();
  }

  /** Reload the selected cert's published exams. */
  async loadExams(): Promise<void> {
    const certId = this._certId();
    if (certId === null) return;
    this._examsLoading.set(true);
    this._examsError.set(null);
    try {
      this._exams.set(await firstValueFrom(this.api.listPublishedExams(certId)));
    } catch (err) {
      this._examsError.set(problemDetailMessage(err) ?? this.lang.t('admin.exam.examsError'));
    } finally {
      this._examsLoading.set(false);
    }
  }

  /** Search students by name/email for the assignment target. */
  async searchStudents(query: string): Promise<void> {
    const search = query.trim();
    this._studentsLoading.set(true);
    this._studentsError.set(null);
    this._searched.set(true);
    try {
      const page = await firstValueFrom(
        this.users.list({ search: search || undefined, limit: STUDENT_SEARCH_LIMIT }),
      );
      this._students.set(page.items);
    } catch (err) {
      this._studentsError.set(problemDetailMessage(err) ?? this.lang.t('admin.exam.studentsError'));
    } finally {
      this._studentsLoading.set(false);
    }
  }

  /** Choose a student as the assignment target. */
  selectStudent(student: StudentListItem): void {
    this._selectedStudent.set(student);
    this._assignError.set(null);
    this._issued.set(null);
  }

  /** Clear the selected student (e.g. to pick another). */
  clearStudent(): void {
    this._selectedStudent.set(null);
  }

  /** Set the exam to assign, or `null` to auto-assign the next unattempted exam. */
  setTargetExam(examId: string | null): void {
    this._targetExamId.set(examId);
  }

  /**
   * Issue a one-time access code for the selected student + cert (+ exam, or
   * auto). Returns `true` on success; the code is exposed via {@link issued} and
   * the reason on failure via {@link assignError}.
   */
  async assign(): Promise<boolean> {
    const certId = this._certId();
    const student = this._selectedStudent();
    if (certId === null || student === null || this._assigning()) return false;
    this._assigning.set(true);
    this._assignError.set(null);
    this._issued.set(null);
    try {
      const issued = await firstValueFrom(
        this.api.assign({
          userId: student.id,
          certId,
          examId: this._targetExamId() ?? undefined,
        }),
      );
      this._issued.set(issued);
      return true;
    } catch (err) {
      this._assignError.set(problemDetailMessage(err) ?? this.lang.t('admin.exam.assignError'));
      return false;
    } finally {
      this._assigning.set(false);
    }
  }

  /** Dismiss the shown one-time code. */
  dismissIssued(): void {
    this._issued.set(null);
  }
}
