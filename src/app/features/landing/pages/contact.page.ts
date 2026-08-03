/**
 * `ios-contact-page` — public contact page for the Institute of Scrum website.
 *
 * Structure (top → bottom):
 *   1. Navbar (reuses ios-landing-navbar)
 *   2. Hero banner — "Home / Contact" breadcrumb with decorative circles
 *   3. "Get in touch" section — icon, heading, subtitle + contact form card
 *   4. Footer (reuses ios-landing-footer)
 *   5. Scroll-to-top floating button
 *
 * All strings are routed through `LanguageService.t()` for EN/AR i18n.
 */

/* eslint-disable @typescript-eslint/unbound-method -- Angular Validators.pattern */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideArrowUpRight, LucideSend } from '@lucide/angular';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, Select, type SelectOption, provideIcons } from '@ui';

import { PublicContactApi } from '../data-access/contact.api';
import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

@Component({
  selector: 'ios-contact-page',
  imports: [
    LandingNavbar,
    LandingFooter,
    PageHero,
    Select,
    IosIcon,
    ReactiveFormsModule,
    ScrollToTop,
  ],
  providers: [provideIcons(LucideArrowUpRight, LucideSend)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 1. Navbar -->
    <ios-landing-navbar />

    <!-- 2. Hero banner -->
    <ios-page-hero
      [title]="lang.t('contact.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('contact.hero.breadcrumb.home')"
      breadcrumbLink="/"
      [backLink]="'/'"
      [ariaBackLabel]="lang.t('contact.hero.back')"
    />

    <!-- 3. Get in touch section -->
    <section class="relative px-10 md:px-32 lg:px-46 py-18 lg:py-[72px] bg-white">
      <!-- Decorative background elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          class="absolute top-[40%] right-[10%] w-96 h-96 rounded-full bg-ios-brand-primary-soft opacity-30 blur-3xl"
        ></div>
      </div>

      <div class="relative flex flex-col lg:flex-row gap-10 lg:gap-16 items-start justify-between">
        <!-- Left: heading + subtitle -->
        <div class="flex flex-col gap-6 lg:w-[500px]">
          <!-- Icon badge -->
          <div
            class="flex items-center justify-center w-14 h-14 rounded-full bg-ios-brand-yellow-soft"
          >
            <ios-icon name="send" class="w-5 h-5 text-ios-brand-amber" />
          </div>

          <div class="flex flex-col gap-4">
            <h2 class="font-heading font-extrabold text-[32px] leading-[1.2] text-ios-brand-dark">
              {{ lang.t('contact.heading.intro') }}
              <span class="text-ios-brand-primary">{{ lang.t('contact.heading.cta') }}</span>
            </h2>
            <div class="w-[89px] h-1 rounded-full bg-ios-brand-amber"></div>
            <p class="font-body font-normal text-[16px] leading-[1.6] text-ios-fg-muted">
              {{ lang.t('contact.heading.subtitle') }}
            </p>
          </div>
        </div>

        <!-- Right: contact form card -->
        <div
          class="w-full lg:w-[580px] border-2 border-ios-border-light border-solid rounded-xl p-8 flex flex-col gap-8"
        >
          <!-- Honeypot — hidden from real visitors, left empty by them. Bots
               that autofill every field trip this and the backend silently
               drops the submission (still returns the uniform 201). -->
          <div class="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
            <label for="contact-company">Company</label>
            <input
              id="contact-company"
              type="text"
              [formControl]="form.controls.company"
              tabindex="-1"
              autocomplete="off"
            />
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-1">
            <label
              for="contact-name"
              class="block text-sm font-heading font-medium text-ios-brand-dark"
            >
              {{ lang.t('contact.form.name') }}
            </label>
            <input
              id="contact-name"
              type="text"
              [formControl]="form.controls.name"
              autocomplete="name"
              class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-body font-medium text-ios-fg-10 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary"
              [attr.aria-invalid]="hasError('name') ? 'true' : null"
              aria-describedby="contact-name-error"
            />
            @if (nameError(); as error) {
              <p id="contact-name-error" class="text-ios-danger text-[13px] leading-[1.4]" aria-live="polite">
                {{ error }}
              </p>
            }
          </div>

          <!-- Email -->
          <div class="flex flex-col gap-1">
            <label
              for="contact-email"
              class="block text-sm font-heading font-medium text-ios-brand-dark"
            >
              {{ lang.t('contact.form.email') }}
            </label>
            <input
              id="contact-email"
              type="email"
              [formControl]="form.controls.email"
              autocomplete="email"
              class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-body font-medium text-ios-fg-10 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary"
              [attr.aria-invalid]="hasError('email') ? 'true' : null"
              aria-describedby="contact-email-error"
            />
            @if (hasError('email')) {
              <p id="contact-email-error" class="text-ios-danger text-[13px] leading-[1.4]" aria-live="polite">
                {{ lang.t('contact.form.emailError') }}
              </p>
            }
          </div>

          <!-- Subject select -->
          <ios-select
            id="contact-subject"
            [label]="lang.t('contact.form.subject')"
            [options]="subjectOptions"
            [placeholder]="lang.t('contact.form.subjectPlaceholder')"
            [control]="form.controls.subject"
            [required]="true"
            [errorText]="lang.t('contact.form.subjectError')"
          />

          <!-- Message textarea -->
          <div class="flex flex-col gap-1">
            <label
              for="contact-message"
              class="block text-sm font-heading font-medium text-ios-brand-dark"
            >
              {{ lang.t('contact.form.message') }}
            </label>
            <textarea
              id="contact-message"
              [formControl]="form.controls.message"
              rows="5"
              class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-body font-medium text-ios-fg-10 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary resize-none"
              [attr.aria-invalid]="hasError('message') ? 'true' : null"
              aria-describedby="contact-message-error"
            ></textarea>
            @if (messageError(); as error) {
              <p id="contact-message-error" class="text-ios-danger text-[13px] leading-[1.4]" aria-live="polite">
                {{ error }}
              </p>
            }
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            (click)="onSubmit()"
            [disabled]="submitting()"
            [attr.aria-busy]="submitting()"
            class="inline-flex items-center justify-center gap-2 w-full h-12 px-8 rounded-lg bg-ios-brand-primary text-white font-heading font-semibold text-[15px] hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-50 disabled:pointer-events-none"
          >
            @if (submitting()) {
              <span
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              ></span>
              {{ lang.t('contact.form.sending') }}
            } @else {
              {{ lang.t('contact.form.submit') }}
              <ios-icon name="arrow-up-right" class="w-5 h-5" />
            }
          </button>

          <!-- Success message -->
          @if (submitted()) {
            <p
              class="text-center font-body font-semibold text-[15px] text-ios-success"
              aria-live="polite"
              role="status"
            >
              {{ lang.t('contact.form.success') }}
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

    <!-- 4. Footer -->
    <ios-landing-footer />

    <!-- 5. Scroll-to-top (shared primitive) -->
    <ios-scroll-to-top />
  `,
})
export class ContactPage {
  protected readonly lang = inject(LanguageService);
  private readonly fb = inject(FormBuilder);
  private readonly contactApi = inject(PublicContactApi);

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    subject: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    message: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(10)],
    }),
    // Honeypot — real visitors never see or fill this (see template).
    company: this.fb.nonNullable.control(''),
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly subjectOptions: SelectOption[] = [
    { value: 'general', label: this.lang.t('contact.subjects.general') },
    { value: 'certifications', label: this.lang.t('contact.subjects.certifications') },
    { value: 'support', label: this.lang.t('contact.subjects.support') },
    { value: 'partnership', label: this.lang.t('contact.subjects.partnership') },
    { value: 'other', label: this.lang.t('contact.subjects.other') },
  ];

  protected hasError(field: 'name' | 'email' | 'message'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  /**
   * `name` fails `required` OR `minlength` — each needs its own copy, not the
   * generic "required" string for both (e.g. "sdfsdf" trips minlength on
   * `message` while satisfying required, so the required-error text would be
   * factually wrong there).
   */
  protected nameError(): string | null {
    return this.fieldError('name', 'contact.form.nameError', 'contact.form.nameMinLengthError');
  }

  /** Same required-vs-minlength split as {@link nameError}, for `message`. */
  protected messageError(): string | null {
    return this.fieldError(
      'message',
      'contact.form.messageError',
      'contact.form.messageMinLengthError',
    );
  }

  private fieldError(
    field: 'name' | 'message',
    requiredKey: string,
    minLengthKey: string,
  ): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return null;
    return this.lang.t(control.errors?.['minlength'] ? minLengthKey : requiredKey);
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
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.submitted.set(false);
    this.errorMessage.set(null);

    const { name, email, subject, message, company } = this.form.getRawValue();
    this.contactApi
      .submit({
        name,
        email,
        subject: this.subjectLabel(subject),
        message,
        company,
        pageSlug: 'contact',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.form.reset();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(
            problemDetailMessage(err) ?? this.lang.t('contact.form.error'),
          );
        },
      });
  }
}
