import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import { AdminExamAssignStore } from '../data-access/exam-assign.store';
import { type StudentListItem } from '../data-access/users.model';

/**
 * Admin exam assignment (`/admin/exam`, learning_admin — super_admin bypass).
 *
 * Assign flow: pick a certificate → search for a student → choose a specific
 * published exam or auto-assign the next unattempted one → issue a one-time
 * access code (shown once). Complements the student-detail access-codes view
 * (issue → view → revoke). All server state + actions live in
 * {@link AdminExamAssignStore}; this component owns only the local form controls.
 */
@Component({
  selector: 'ios-admin-exam-assign-page',
  imports: [ReactiveFormsModule, DatePipe, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">{{ lang.t('admin.exam.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.exam.subtitle') }}</p>
      </header>

      <!-- Step 1 — certificate -->
      <div class="mb-6">
        @if (store.certsError()) {
          <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p class="text-sm text-red-700">{{ store.certsError() }}</p>
            <ios-button class="mt-2 inline-block" variant="secondary" (clicked)="retryCerts()">
              {{ lang.t('admin.exam.retry') }}
            </ios-button>
          </div>
        } @else {
          <ios-select
            id="assign-cert"
            [label]="lang.t('admin.exam.certLabel')"
            [options]="certOptions()"
            [placeholder]="
              store.certsLoading()
                ? lang.t('admin.exam.certsLoading')
                : lang.t('admin.exam.certPlaceholder')
            "
            [control]="certControl"
            (selected)="onCertChange($event)"
          />
        }
      </div>

      @if (store.certId()) {
        <!-- Step 2 — student -->
        <div class="mb-6">
          <h2 class="text-sm font-heading font-medium text-ios-brand-dark mb-2">
            {{ lang.t('admin.exam.studentStep') }}
          </h2>

          @if (store.selectedStudent(); as student) {
            <div
              class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div class="min-w-0">
                <p class="font-medium text-ios-brand-dark truncate">{{ student.fullName }}</p>
                <p class="text-sm text-gray-500 truncate">{{ student.email }}</p>
              </div>
              <button
                type="button"
                (click)="changeStudent()"
                class="shrink-0 text-sm text-ios-brand-primary underline"
              >
                {{ lang.t('admin.exam.changeStudent') }}
              </button>
            </div>
          } @else {
            <form [formGroup]="studentForm" (ngSubmit)="onSearch()" class="flex items-end gap-2">
              <div class="grow">
                <ios-input
                  id="assign-student-search"
                  [label]="lang.t('admin.exam.studentSearchLabel')"
                  type="text"
                  [control]="studentForm.controls.search"
                  [placeholder]="lang.t('admin.exam.studentSearchPlaceholder')"
                />
              </div>
              <ios-button type="submit" variant="secondary" [loading]="store.studentsLoading()">
                {{ lang.t('admin.exam.search') }}
              </ios-button>
            </form>

            @if (store.studentsError()) {
              <p class="text-sm text-red-600 mt-2" role="alert">{{ store.studentsError() }}</p>
            } @else if (store.noStudentResults()) {
              <p class="text-sm text-gray-500 mt-2">{{ lang.t('admin.exam.noStudents') }}</p>
            } @else if (store.students().length > 0) {
              <ul class="mt-2 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                @for (s of store.students(); track s.id) {
                  <li>
                    <button
                      type="button"
                      (click)="selectStudent(s)"
                      class="w-full text-start px-4 py-3 hover:bg-gray-50"
                    >
                      <span class="font-medium text-ios-brand-dark">{{ s.fullName }}</span>
                      <span class="text-gray-500"> — {{ s.email }}</span>
                    </button>
                  </li>
                }
              </ul>
            }
          }
        </div>

        <!-- Step 3 — exam target -->
        <div class="mb-6">
          <h2 class="text-sm font-heading font-medium text-ios-brand-dark mb-2">
            {{ lang.t('admin.exam.examStep') }}
          </h2>
          @if (store.examsError()) {
            <div class="rounded-xl border border-red-200 bg-red-50 p-4">
              <p class="text-sm text-red-700">{{ store.examsError() }}</p>
              <ios-button class="mt-2 inline-block" variant="secondary" (clicked)="retryExams()">
                {{ lang.t('admin.exam.retry') }}
              </ios-button>
            </div>
          } @else {
            <ios-select
              id="assign-exam"
              label=""
              [options]="examOptions()"
              [placeholder]="
                store.examsLoading()
                  ? lang.t('admin.exam.examsLoading')
                  : lang.t('admin.exam.autoAssign')
              "
              [control]="examControl"
              (selected)="onTargetChange($event)"
            />
            @if (!store.examsLoading() && store.exams().length === 0) {
              <p class="text-xs text-amber-700 mt-1">{{ lang.t('admin.exam.noPublished') }}</p>
            }
          }
        </div>

        @if (store.assignError()) {
          <p class="text-sm text-red-600 mb-3" role="alert">{{ store.assignError() }}</p>
        }

        <ios-button
          variant="primary"
          [loading]="store.assigning()"
          [disabled]="!store.canAssign()"
          (clicked)="onAssign()"
        >
          {{ lang.t('admin.exam.assign') }}
        </ios-button>
      }

      <!-- Issued one-time code -->
      @if (store.issued(); as code) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-code-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="assign-code-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.exam.codeTitle') }}
            </h2>
            <p class="mt-1 text-sm text-amber-700">{{ lang.t('admin.exam.codeWarning') }}</p>

            <div class="mt-4 flex items-center gap-2">
              <code
                class="grow rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-lg tracking-wider text-ios-brand-dark break-all"
              >
                {{ code.plainCode }}
              </code>
              <ios-button variant="secondary" (clicked)="copyCode(code.plainCode)">
                {{ copied() ? lang.t('admin.exam.copied') : lang.t('admin.exam.copy') }}
              </ios-button>
            </div>

            <dl class="mt-4 text-sm flex flex-col gap-1">
              @if (code.examTitle) {
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500">{{ lang.t('admin.exam.codeExam') }}</dt>
                  <dd class="text-ios-brand-dark text-end">
                    @if (code.examOrder !== null) {
                      #{{ code.examOrder }} —
                    }
                    {{ code.examTitle }}
                  </dd>
                </div>
              }
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500">{{ lang.t('admin.exam.codeExpires') }}</dt>
                <dd class="text-ios-brand-dark text-end">{{ code.expiresAt | date: 'medium' }}</dd>
              </div>
            </dl>

            <div class="mt-5 flex justify-end">
              <ios-button variant="primary" (clicked)="dismiss()">
                {{ lang.t('admin.exam.done') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminExamAssignPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly store = inject(AdminExamAssignStore);
  protected readonly lang = inject(LanguageService);

  protected readonly certControl = this.fb.control('');
  protected readonly examControl = this.fb.control('');
  protected readonly studentForm = this.fb.group({ search: this.fb.control('') });

  protected readonly copied = signal(false);

  protected readonly certOptions = computed<SelectOption[]>(() =>
    this.store.certs().map((c) => ({ value: c.id, label: c.label })),
  );

  protected readonly examOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.exam.autoAssign') },
    ...this.store.exams().map((e) => ({ value: e.id, label: `#${e.examOrder} — ${e.title}` })),
  ]);

  ngOnInit(): void {
    void this.store.loadCerts();
  }

  protected onCertChange(certId: string): void {
    this.examControl.setValue('');
    void this.store.setCert(certId);
  }

  protected retryCerts(): void {
    void this.store.loadCerts();
  }

  protected retryExams(): void {
    void this.store.loadExams();
  }

  protected onSearch(): void {
    void this.store.searchStudents(this.studentForm.controls.search.value);
  }

  protected selectStudent(student: StudentListItem): void {
    this.store.selectStudent(student);
  }

  protected changeStudent(): void {
    this.store.clearStudent();
  }

  protected onTargetChange(examId: string): void {
    this.store.setTargetExam(examId || null);
  }

  protected async onAssign(): Promise<void> {
    this.copied.set(false);
    await this.store.assign();
  }

  protected copyCode(code: string): void {
    void navigator.clipboard?.writeText(code);
    this.copied.set(true);
  }

  protected dismiss(): void {
    this.store.dismissIssued();
  }
}

export default AdminExamAssignPage;
