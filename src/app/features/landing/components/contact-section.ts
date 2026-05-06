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
 *   `${namespace}.form.nameError`
 *   `${namespace}.form.email`
 *   `${namespace}.form.emailError`
 *   `${namespace}.form.message`
 *   `${namespace}.form.messageError`
 *   `${namespace}.form.submit`
 *   `${namespace}.form.sending`
 *   `${namespace}.form.success`
 *
 * ## Usage
 * ```html
 * <!-- default namespace = 'mockExam.contact' -->
 * <ios-landing-contact-section />
 *
 * <!-- override for another page -->
 * <ios-landing-contact-section namespace="scrumMaster.contact" />
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

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

@Component({
  selector: 'ios-landing-contact-section',
  imports: [IosIcon, ReactiveFormsModule],
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
            <!-- Name -->
            <div class="flex flex-col gap-1">
              <label for="landing-contact-name" class="sr-only">
                {{ lang.t(namespace() + '.form.name') }}
              </label>
              <div
                class="flex items-center gap-2 px-3 py-3 rounded-lg
                       bg-ios-surface-muted border border-[#c4c5c4]
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
              @if (contactForm.get('name')?.invalid && contactForm.get('name')?.touched) {
                <p
                  id="landing-name-error"
                  class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                  aria-live="polite"
                >
                  {{ lang.t(namespace() + '.form.nameError') }}
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
                       bg-ios-surface-muted border border-[#c4c5c4]
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

            <!-- Message -->
            <div class="flex flex-col gap-1">
              <label for="landing-contact-message" class="sr-only">
                {{ lang.t(namespace() + '.form.message') }}
              </label>
              <div
                class="flex items-start gap-2 px-3 py-3 rounded-lg
                       bg-ios-surface-muted border border-[#c4c5c4]
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
              @if (contactForm.get('message')?.invalid && contactForm.get('message')?.touched) {
                <p
                  id="landing-message-error"
                  class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                  aria-live="polite"
                >
                  {{ lang.t(namespace() + '.form.messageError') }}
                </p>
              }
            </div>

            <!-- Submit — warm amber CTA; TODO: promote #8e6636 to a design token -->
            <button
              type="submit"
              class="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl
                     font-body font-semibold text-[16px] leading-[1.4]
                     hover:opacity-90 transition-opacity
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                     disabled:opacity-50 disabled:cursor-not-allowed"
              style="background-color: #8e6636; color: #f4f0eb; --tw-ring-color: rgb(142 102 54 / 0.5);"
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

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly lang = inject(LanguageService);

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);

  protected readonly contactForm = this.fb.group({
    name: this.fb.control('', [(c) => Validators.required(c), (c) => Validators.minLength(2)(c)]),
    email: this.fb.control('', [(c) => Validators.required(c), (c) => Validators.email(c)]),
    message: this.fb.control('', [
      (c) => Validators.required(c),
      (c) => Validators.minLength(10)(c),
    ]),
  });

  protected onSubmit(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid) return;

    this.submitting.set(true);
    // TODO: wire to ContactApi once backend endpoint is live (see docs/04-api-integration-data-flow.md)
    setTimeout(() => {
      this.submitting.set(false);
      this.submitted.set(true);
      this.contactForm.reset();
    }, 1200);
  }
}
