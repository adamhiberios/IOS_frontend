/**
 * `ios-landing-contact-section` — reusable "Feel free to get in touch" section.
 *
 * Used on landing-feature pages that need an inline contact form
 * (e.g. About Mock Exam, About Scrum Master, About Scrum Product Owner, …).
 *
 * ## i18n
 * All display strings are resolved via the `namespace` input, so each page
 * can keep its own i18n keys under a page-scoped prefix.
 *
 * The component looks up:
 *   `${namespace}.heading1`        — text before the coloured span
 *   `${namespace}.heading2`        — coloured span text
 *   `${namespace}.subtitle`        — paragraph beneath the heading
 *   `${namespace}.form.name`
 *   `${namespace}.form.nameError`            — shown when name is empty
 *   `${namespace}.form.nameMinLengthError`   — shown when name is too short
 *   `${namespace}.form.email`
 *   `${namespace}.form.emailError`
 *   `${namespace}.form.subject`              — required select label
 *   `${namespace}.form.subjectPlaceholder`
 *   `${namespace}.form.subjectError`         — shown when no subject is chosen
 *   `${namespace}.form.message`
 *   `${namespace}.form.messageError`         — shown when message is empty
 *   `${namespace}.form.messageMinLengthError` — shown when message is too short
 *   `${namespace}.form.submit`
 *   `${namespace}.form.sending`
 *   `${namespace}.form.success`
 *   `${namespace}.form.error`     — fallback shown when `POST /contact` fails
 *                                   and the response carries no problem-detail
 *                                   message (validation/rate-limit errors
 *                                   surface the backend's own message instead)
 *
 * ## Backend
 * Submits to `POST /contact` (`PublicContactApi`, public, throttled 3/60s by
 * default). A hidden honeypot field (`company`) is included per the backend
 * contract — real visitors never see it; a bot that fills it gets a silent
 * 201 with no email sent. See `docs/reference/backend/cms-blog-contact.md`.
 *
 * The Subject dropdown mirrors `ios-contact-page`'s: same 5 categories, same
 * shared `contact.subjects.*` i18n keys (not namespace-scoped — the options
 * are generic across every contact form, so they live in one place). The
 * *submitted* value is the translated label (e.g. "General inquiry"), not the
 * internal option code (`general`) — the backend field is freeform text with
 * no enum, and admins reading the inbox need readable copy, not codes.
 *
 * ## Usage
 * ```html
 * <!-- default namespace = 'mockExam.contact' -->
 * <ios-landing-contact-section />
 *
 * <!-- override for another page, and tag submissions with the CMS slug -->
 * <ios-landing-contact-section namespace="scrumMaster.contact" pageSlug="about-scrum" />
 * ```
 *
 * ## RTL
 * The two-column layout (heading | form) mirrors naturally via `flex-row`.
 * All padding uses logical properties (`ps-`, `pe-`). The send icon has no
 * inherent directionality. The submit arrow (`arrow-up-right`) is direction-
 * neutral for a submit action and does not flip.
 */

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideArrowUpRight, LucideSend } from '@lucide/angular';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { IosIcon, Select, type SelectOption, provideIcons } from '@ui';

import { PublicContactApi } from '../data-access/contact.api';

@Component({
  selector: 'ios-landing-contact-section',
  imports: [IosIcon, ReactiveFormsModule, Select],
  providers: [provideIcons(LucideArrowUpRight, LucideSend)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="bg-ios-surface-warm px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      aria-labelledby="landing-contact-heading"
    >
      <div class="flex flex-col lg:flex-row items-start justify-between gap-12">
        <!-- Start column — icon + heading + subtitle -->
        <div class="flex flex-col gap-6 lg:w-[635px]">
          <div
            class="flex items-center justify-center w-14 h-14 rounded-full bg-ios-brand-yellow-soft shrink-0"
            aria-hidden="true"
          >
            <ios-icon name="send" class="w-5 h-5 text-ios-brand-primary" />
          </div>

          <div class="flex flex-col gap-4">
            <h2
              id="landing-contact-heading"
              class="font-heading font-extrabold text-[32px] leading-[1.2] text-ios-brand-dark"
            >
              {{ lang.t(namespace() + '.heading1')
              }}<span class="text-ios-brand-primary">{{ lang.t(namespace() + '.heading2') }}</span>
            </h2>
            <div class="w-[89px] h-1 rounded-full bg-ios-brand-amber" aria-hidden="true"></div>
            <p class="font-body font-normal text-[16px] leading-[1.625] text-ios-fg-muted">
              {{ lang.t(namespace() + '.subtitle') }}
            </p>
          </div>
        </div>

        <!-- End column — contact form card -->
        <div
          class="bg-white border border-ios-brand-yellow-soft rounded-2xl p-8
                 flex flex-col gap-6 w-full lg:w-[580px]"
        >
          <form
            [formGroup]="contactForm"
            (ngSubmit)="onSubmit()"
            class="flex flex-col gap-6"
            novalidate
          >
            <!-- Honeypot — hidden from real visitors, left empty by them. Bots
                 that autofill every field trip this and the backend silently
                 drops the submission (still returns the uniform 201). -->
            <div class="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
              <label for="landing-contact-company">Company</label>
              <input
                id="landing-contact-company"
                type="text"
                formControlName="company"
                tabindex="-1"
                autocomplete="off"
              />
            </div>

            <!-- Name -->
            <div class="flex flex-col gap-1">
              <label for="landing-contact-name" class="sr-only">
                {{ lang.t(namespace() + '.form.name') }}
              </label>
              <div
                class="flex items-center gap-2 px-3 py-3 rounded-lg
                       bg-ios-surface-muted border border-ios-line
                       focus-within:border-ios-brand-primary focus-within:ring-1 focus-within:ring-ios-brand-primary/30
                       transition-colors"
              >
                <input
                  id="landing-contact-name"
                  type="text"
                  formControlName="name"
                  [placeholder]="lang.t(namespace() + '.form.name')"
                  autocomplete="name"
                  class="flex-1 bg-transparent font-body font-medium text-[16px]
                         text-ios-brand-dark placeholder:text-ios-brand-muted
                         focus:outline-none"
                  [attr.aria-invalid]="
                    contactForm.get('name')?.invalid && contactForm.get('name')?.touched
                      ? 'true'
                      : null
                  "
                  aria-describedby="landing-name-error"
                />
              </div>
              @if (nameError(); as error) {
                <p
                  id="landing-name-error"
                  class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                  aria-live="polite"
                >
                  {{ error }}
                </p>
              }
            </div>

            <!-- Email -->
            <div class="flex flex-col gap-1">
              <label for="landing-contact-email" class="sr-only">
                {{ lang.t(namespace() + '.form.email') }}
              </label>
              <div
                class="flex items-center gap-2 px-3 py-3 rounded-lg
                       bg-ios-surface-muted border border-ios-line
                       focus-within:border-ios-brand-primary focus-within:ring-1 focus-within:ring-ios-brand-primary/30
                       transition-colors"
              >
                <input
                  id="landing-contact-email"
                  type="email"
                  formControlName="email"
                  [placeholder]="lang.t(namespace() + '.form.email')"
                  autocomplete="email"
                  class="flex-1 bg-transparent font-body font-medium text-[16px]
                         text-ios-brand-dark placeholder:text-ios-brand-muted
                         focus:outline-none"
                  [attr.aria-invalid]="
                    contactForm.get('email')?.invalid && contactForm.get('email')?.touched
                      ? 'true'
                      : null
                  "
                  aria-describedby="landing-email-error"
                />
              </div>
              @if (contactForm.get('email')?.invalid && contactForm.get('email')?.touched) {
                <p
                  id="landing-email-error"
                  class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                  aria-live="polite"
                >
                  {{ lang.t(namespace() + '.form.emailError') }}
                </p>
              }
            </div>

            <!-- Subject -->
            <ios-select
              id="landing-contact-subject"
              [label]="''"
              [options]="subjectOptions"
              [placeholder]="lang.t(namespace() + '.form.subjectPlaceholder')"
              [control]="contactForm.controls.subject"
              [required]="true"
              [errorText]="lang.t(namespace() + '.form.subjectError')"
            />

            <!-- Message -->
            <div class="flex flex-col gap-1">
              <label for="landing-contact-message" class="sr-only">
                {{ lang.t(namespace() + '.form.message') }}
              </label>
              <div
                class="flex items-start gap-2 px-3 py-3 rounded-lg
                       bg-ios-surface-muted border border-ios-line
                       focus-within:border-ios-brand-primary focus-within:ring-1 focus-within:ring-ios-brand-primary/30
                       transition-colors min-h-[101px]"
              >
                <textarea
                  id="landing-contact-message"
                  formControlName="message"
                  [placeholder]="lang.t(namespace() + '.form.message')"
                  rows="3"
                  class="flex-1 bg-transparent font-body font-medium text-[16px]
                         text-ios-brand-dark placeholder:text-ios-brand-muted
                         focus:outline-none resize-none"
                  [attr.aria-invalid]="
                    contactForm.get('message')?.invalid && contactForm.get('message')?.touched
                      ? 'true'
                      : null
                  "
                  aria-describedby="landing-message-error"
                ></textarea>
              </div>
              @if (messageError(); as error) {
                <p
                  id="landing-message-error"
                  class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                  aria-live="polite"
                >
                  {{ error }}
                </p>
              }
            </div>

            <!-- TODO(design-tokens): promote the warm amber #8e6636 below to a Tailwind theme token. -->
            <button
              type="submit"
              class="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl
                     font-body font-semibold text-[16px] leading-[1.4]
                     hover:opacity-90 transition-opacity
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                     disabled:opacity-50 disabled:cursor-not-allowed
                     bg-cer-brown-dark text-cer-brown-soft"
              style="--tw-ring-color: rgb(142 102 54 / 0.5);"
              [disabled]="submitting()"
            >
              @if (submitting()) {
                {{ lang.t(namespace() + '.form.sending') }}
              } @else {
                {{ lang.t(namespace() + '.form.submit') }}
                <ios-icon name="arrow-up-right" class="w-5 h-5" aria-hidden="true" />
              }
            </button>
          </form>

          <!-- Success message -->
          @if (submitted()) {
            <p
              class="text-center font-body font-semibold text-[15px] text-ios-success"
              aria-live="polite"
              role="status"
            >
              {{ lang.t(namespace() + '.form.success') }}
            </p>
          }

          <!-- Error message -->
          @if (errorMessage(); as error) {
            <p
              class="text-center font-body font-semibold text-[15px] text-ios-danger"
              aria-live="assertive"
              role="alert"
            >
              {{ error }}
            </p>
          }
        </div>
      </div>
    </section>
  `,
})
export class LandingContactSection {
  /**
   * i18n key prefix for all strings in this section.
   * Override per page — e.g. `namespace="scrumMaster.contact"`.
   * Defaults to `'mockExam.contact'`.
   */
  readonly namespace = input<string>('mockExam.contact');

  /**
   * Slug of the CMS page this section is embedded on. Sent as `pageSlug` so
   * the backend can resolve a per-page recipient override. Optional —
   * omitted when the host page has no CMS slug.
   */
  readonly pageSlug = input<string | undefined>(undefined);

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly contactApi = inject(PublicContactApi);
  protected readonly lang = inject(LanguageService);

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly contactForm = this.fb.group({
    name: this.fb.control('', [(c) => Validators.required(c), (c) => Validators.minLength(2)(c)]),
    email: this.fb.control('', [(c) => Validators.required(c), (c) => Validators.email(c)]),
    subject: this.fb.control('', [(c) => Validators.required(c)]),
    message: this.fb.control('', [
      (c) => Validators.required(c),
      (c) => Validators.minLength(10)(c),
    ]),
    // Honeypot — real visitors never see or fill this (see template).
    company: this.fb.control(''),
  });

  /**
   * Same 5 categories as `ios-contact-page`, sharing the ungated
   * `contact.subjects.*` i18n keys rather than namespacing them per page —
   * the options are generic across every contact form on the site.
   */
  protected readonly subjectOptions: SelectOption[] = [
    { value: 'general', label: this.lang.t('contact.subjects.general') },
    { value: 'certifications', label: this.lang.t('contact.subjects.certifications') },
    { value: 'support', label: this.lang.t('contact.subjects.support') },
    { value: 'partnership', label: this.lang.t('contact.subjects.partnership') },
    { value: 'other', label: this.lang.t('contact.subjects.other') },
  ];

  /**
   * `name` fails `required` OR `minlength` — each needs its own copy, not the
   * generic "required" string for both (a value of e.g. "Jo" trips minlength
   * while satisfying required, so showing the required-error text would be
   * factually wrong).
   */
  protected nameError(): string | null {
    return this.fieldError('name', 'nameError', 'nameMinLengthError');
  }

  /** Same required-vs-minlength split as {@link nameError}, for `message`. */
  protected messageError(): string | null {
    return this.fieldError('message', 'messageError', 'messageMinLengthError');
  }

  private fieldError(
    controlName: 'name' | 'message',
    requiredKey: string,
    minLengthKey: string,
  ): string | null {
    const control = this.contactForm.get(controlName);
    if (!control || !control.touched || control.valid) return null;
    const key = control.errors?.['minlength'] ? minLengthKey : requiredKey;
    return this.lang.t(`${this.namespace()}.form.${key}`);
  }

  /**
   * The backend's `subject` field is freeform text (no enum) — send the
   * translated label ("General inquiry"), not the internal option code
   * (`general`), so admins reading the inbox see readable copy.
   */
  private subjectLabel(value: string): string {
    return this.subjectOptions.find((o) => o.value === value)?.label ?? value;
  }

  protected onSubmit(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { name, email, subject, message, company } = this.contactForm.getRawValue();
    this.contactApi
      .submit({
        name,
        email,
        subject: this.subjectLabel(subject),
        message,
        company,
        pageSlug: this.pageSlug(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.contactForm.reset();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(
            problemDetailMessage(err) ?? this.lang.t(this.namespace() + '.form.error'),
          );
        },
      });
  }
}
