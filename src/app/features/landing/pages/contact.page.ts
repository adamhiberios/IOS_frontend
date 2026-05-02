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
import { LucideArrowUp, LucideArrowUpRight, LucideSend } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, Select, type SelectOption, provideIcons } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

@Component({
  selector: 'ios-contact-page',
  imports: [LandingNavbar, LandingFooter, PageHero, Select, IosIcon, ReactiveFormsModule],
  providers: [provideIcons(LucideArrowUpRight, LucideSend, LucideArrowUp)],
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
          <!-- Subject select -->
          <ios-select
            id="contact-subject"
            [label]="lang.t('contact.form.subject')"
            [options]="subjectOptions"
            [placeholder]="lang.t('contact.form.subjectPlaceholder')"
            [control]="form.controls.subject"
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
            ></textarea>
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            (click)="onSubmit()"
            [disabled]="form.invalid || submitting()"
            [attr.aria-busy]="submitting()"
            class="inline-flex items-center justify-center gap-2 w-full h-12 px-8 rounded-lg bg-ios-brand-primary text-white font-heading font-semibold text-[15px] hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-50 disabled:pointer-events-none"
          >
            @if (submitting()) {
              <span
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              ></span>
            }
            {{ lang.t('contact.form.submit') }}
            <ios-icon name="arrow-up-right" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>

    <!-- 4. Footer -->
    <ios-landing-footer />

    <!-- 5. Scroll-to-top button -->
    <button
      (click)="scrollToTop()"
      class="fixed bottom-8 right-8 z-50 flex items-center justify-center w-11 h-11 rounded-full border-2 border-ios-brand-primary-soft bg-ios-brand-primary-soft hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
      [attr.aria-label]="lang.t('contact.scrollToTop')"
    >
      <ios-icon name="arrow-up" class="w-5 h-5 text-ios-brand-primary" />
    </button>
  `,
})
export class ContactPage {
  protected readonly lang = inject(LanguageService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    subject: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    message: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  protected readonly submitting = signal(false);

  protected readonly subjectOptions: SelectOption[] = [
    { value: 'general', label: this.lang.t('contact.subjects.general') },
    { value: 'certifications', label: this.lang.t('contact.subjects.certifications') },
    { value: 'support', label: this.lang.t('contact.subjects.support') },
    { value: 'partnership', label: this.lang.t('contact.subjects.partnership') },
    { value: 'other', label: this.lang.t('contact.subjects.other') },
  ];

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);

    // TODO: wire up to backend API when available
    setTimeout(() => {
      this.submitting.set(false);
      this.form.reset();
      // Navigate to a success page or show a toast in production
    }, 1500);
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
