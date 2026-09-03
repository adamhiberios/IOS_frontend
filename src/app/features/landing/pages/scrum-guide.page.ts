/**
 * `ios-scrum-guide-page` — public "Download Scrum Guide" gated-download page
 * (IDD-267).
 *
 * Structure (top → bottom):
 *   1. Navbar   — reuses ios-landing-navbar
 *   2. Hero     — dark-red bg, breadcrumb + "Download Scrum Guide" title
 *   3. Form     — name + email, then the download control
 *   4. Footer   — reuses ios-landing-footer
 *
 * ## The gate
 * Per the ticket, the download control stays **hidden** until the visitor has
 * supplied both a name and a valid email; it appears only once both fields are
 * satisfied. That is `canDownload()` — a `computed()` over the form's status
 * signal, so it re-evaluates on every keystroke without a manual subscription.
 *
 * ## Backend
 * Submits to `POST /resource-downloads` (`PublicResourceDownloadApi`, public,
 * throttled 5/60s by default). A hidden honeypot field (`company`) is included
 * per the backend contract — a bot that fills it gets a silent 201 with no row
 * stored.
 *
 * The backend records the lead but never serves the asset, so the PDF is
 * hosted here and released once the capture succeeds. If the capture fails the
 * file is withheld and the error is shown inline, leaving the visitor free to
 * retry — the gate is the point of the page.
 *
 * All text is routed through `LanguageService.t()` for EN / AR / FR i18n.
 * Keys live under the `guide.*` namespace in assets/i18n/*.json.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideDownload, LucideFileText, LucideShieldCheck } from '@lucide/angular';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';
import { PublicResourceDownloadApi } from '../data-access/resource-download.api';

/**
 * Where the gated asset lives. Served from `src/app/assets/` (mapped to
 * `/assets/` by angular.json), so it is same-origin and needs no CORS.
 *
 * NOTE: the checked-in file is a PLACEHOLDER — replace it with the official
 * Scrum Guide PDF before release. See `src/app/assets/docs/scrum-guide.pdf`.
 */
const GUIDE_PDF_PATH = '/assets/docs/scrum-guide.pdf';

/** Filename the visitor's browser saves the asset under. */
const GUIDE_FILENAME = 'scrum-guide.pdf';

/** Identifies which gated asset this page serves, for backend attribution. */
const RESOURCE_SLUG = 'scrum-guide';

/** Slug of this page, sent alongside the capture for attribution. */
const PAGE_SLUG = 'guide';

@Component({
  selector: 'ios-scrum-guide-page',
  imports: [ReactiveFormsModule, LandingNavbar, LandingFooter, PageHero, IosIcon, ScrollToTop],
  providers: [provideIcons(LucideDownload, LucideFileText, LucideShieldCheck)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════════════════
         1. Navbar
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-navbar />

    <!-- ═══════════════════════════════════════════════════════════
         2. Hero banner
    ═══════════════════════════════════════════════════════════ -->
    <ios-page-hero
      [title]="lang.t('guide.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('guide.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('guide.hero.back')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. Lead-capture form
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="guide-form-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]">
        <div class="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          <!-- Left — pitch -->
          <div class="flex flex-col gap-4 flex-1 min-w-0">
            <span
              class="self-start inline-flex items-center justify-center px-6 py-2 rounded-full
                     bg-ios-brand-yellow-soft border border-ios-brand-gold
                     font-body font-semibold text-[14px] text-ios-brand-primary"
            >
              {{ lang.t('guide.badge') }}
            </span>

            <h2
              id="guide-form-heading"
              class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2] text-ios-brand-dark"
            >
              {{ lang.t('guide.heading1')
              }}<span class="text-ios-brand-primary">{{ lang.t('guide.heading2') }}</span>
            </h2>

            <div class="w-[81px] h-1 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>

            <p class="font-body font-medium text-[16px] leading-[1.6] text-ios-fg-muted max-w-2xl">
              {{ lang.t('guide.description') }}
            </p>

            <p class="flex items-center gap-2 font-body text-[14px] text-ios-fg-muted">
              <ios-icon
                name="shield-check"
                class="w-4 h-4 text-ios-brand-primary"
                aria-hidden="true"
              />
              {{ lang.t('guide.privacyNote') }}
            </p>
          </div>

          <!-- Right — form card -->
          <div
            class="w-full lg:max-w-[520px] flex flex-col gap-5 p-6 md:p-8 rounded-2xl
                   bg-white border border-ios-line"
          >
            <form
              [formGroup]="guideForm"
              (ngSubmit)="onSubmit()"
              class="relative flex flex-col gap-4"
              novalidate
            >
              <!-- Honeypot — hidden from real visitors, left empty by them. Bots
                   that autofill every field trip this and the backend silently
                   drops the submission (still returns the uniform 201).

                   Hidden by clipping (sr-only) rather than the -left-[9999px]
                   offset the contact forms use: in RTL the left edge is the
                   overflow direction, so that offset stretches the document to
                   ~10,000px wide and makes the whole page scroll sideways in
                   Arabic. Clipping is direction-agnostic. aria-hidden keeps it
                   out of the accessibility tree despite sr-only. -->
              <div class="sr-only" aria-hidden="true">
                <label for="guide-company">Company</label>
                <input
                  id="guide-company"
                  type="text"
                  formControlName="company"
                  tabindex="-1"
                  autocomplete="off"
                />
              </div>

              <!-- Name -->
              <div class="flex flex-col gap-1">
                <label
                  for="guide-name"
                  class="font-body font-semibold text-[14px] text-ios-brand-dark"
                >
                  {{ lang.t('guide.form.name') }}
                </label>
                <div
                  class="flex items-center gap-2 px-3 py-3 rounded-lg
                         bg-ios-surface-muted border border-ios-line
                         focus-within:border-ios-brand-primary focus-within:ring-1 focus-within:ring-ios-brand-primary/30
                         transition-colors"
                >
                  <input
                    id="guide-name"
                    type="text"
                    formControlName="fullName"
                    [placeholder]="lang.t('guide.form.namePlaceholder')"
                    autocomplete="name"
                    class="flex-1 bg-transparent font-body font-medium text-[16px]
                           text-ios-brand-dark placeholder:text-ios-brand-muted
                           focus:outline-none"
                    [attr.aria-invalid]="
                      guideForm.get('fullName')?.invalid && guideForm.get('fullName')?.touched
                        ? 'true'
                        : null
                    "
                    aria-describedby="guide-name-error"
                  />
                </div>
                @if (guideForm.get('fullName')?.invalid && guideForm.get('fullName')?.touched) {
                  <p
                    id="guide-name-error"
                    class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                    aria-live="polite"
                  >
                    {{ lang.t('guide.form.nameError') }}
                  </p>
                }
              </div>

              <!-- Email -->
              <div class="flex flex-col gap-1">
                <label
                  for="guide-email"
                  class="font-body font-semibold text-[14px] text-ios-brand-dark"
                >
                  {{ lang.t('guide.form.email') }}
                </label>
                <div
                  class="flex items-center gap-2 px-3 py-3 rounded-lg
                         bg-ios-surface-muted border border-ios-line
                         focus-within:border-ios-brand-primary focus-within:ring-1 focus-within:ring-ios-brand-primary/30
                         transition-colors"
                >
                  <input
                    id="guide-email"
                    type="email"
                    formControlName="email"
                    [placeholder]="lang.t('guide.form.emailPlaceholder')"
                    autocomplete="email"
                    class="flex-1 bg-transparent font-body font-medium text-[16px]
                           text-ios-brand-dark placeholder:text-ios-brand-muted
                           focus:outline-none"
                    [attr.aria-invalid]="
                      guideForm.get('email')?.invalid && guideForm.get('email')?.touched
                        ? 'true'
                        : null
                    "
                    aria-describedby="guide-email-error"
                  />
                </div>
                @if (guideForm.get('email')?.invalid && guideForm.get('email')?.touched) {
                  <p
                    id="guide-email-error"
                    class="text-ios-danger text-[13px] leading-[1.4] ps-1"
                    aria-live="polite"
                  >
                    {{ lang.t('guide.form.emailError') }}
                  </p>
                }
              </div>

              <!-- Download control — hidden until BOTH fields are satisfied
                   (IDD-267 acceptance criterion). A polite live region
                   announces its arrival to screen-reader users, who would
                   otherwise get no signal that a new control appeared. -->
              <div aria-live="polite">
                @if (canDownload()) {
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="w-full bg-ios-brand-primary text-white font-heading font-semibold text-[15px]
                           h-12 px-6 rounded-xl inline-flex items-center justify-center gap-2
                           hover:bg-ios-brand-primary-hover transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  >
                    {{ submitting() ? lang.t('guide.form.sending') : lang.t('guide.form.submit') }}
                    <ios-icon name="download" class="w-4 h-4" aria-hidden="true" />
                  </button>
                } @else {
                  <p class="font-body text-[14px] leading-[1.4] text-ios-fg-muted text-center">
                    {{ lang.t('guide.form.gateHint') }}
                  </p>
                }
              </div>

              @if (downloaded()) {
                <p
                  class="flex items-center gap-2 font-body text-[14px] text-ios-brand-primary"
                  aria-live="polite"
                >
                  <ios-icon name="file-text" class="w-4 h-4" aria-hidden="true" />
                  {{ lang.t('guide.form.success') }}
                </p>
              }

              @if (errorMessage(); as error) {
                <p class="text-ios-danger text-[13px] leading-[1.4]" aria-live="polite">
                  {{ error }}
                </p>
              }
            </form>

            <!-- Native download target. Clicked programmatically once the lead
                 is captured — an <a download> rather than a synthetic Blob so
                 the browser streams the file straight from the same origin. -->
            <a
              #downloadLink
              [href]="pdfPath"
              [download]="pdfFilename"
              class="hidden"
              aria-hidden="true"
              tabindex="-1"
            ></a>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class ScrumGuidePage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly downloadApi = inject(PublicResourceDownloadApi);
  protected readonly lang = inject(LanguageService);

  /** Native anchor used to release the file once the lead is captured. */
  private readonly downloadLink = viewChild<{ nativeElement: HTMLAnchorElement }>('downloadLink');

  protected readonly pdfPath = GUIDE_PDF_PATH;
  protected readonly pdfFilename = GUIDE_FILENAME;

  protected readonly submitting = signal(false);
  protected readonly downloaded = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly guideForm = this.fb.group({
    fullName: this.fb.control('', [
      (c) => Validators.required(c),
      (c) => Validators.minLength(2)(c),
    ]),
    email: this.fb.control('', [(c) => Validators.required(c), (c) => Validators.email(c)]),
    // Honeypot — real visitors never see or fill this (see template).
    company: this.fb.control(''),
  });

  /**
   * Form validity as a signal. `statusChanges` only fires on *subsequent*
   * changes, so the group's current status seeds the initial value — without
   * it the gate would mis-read as invalid until the first keystroke.
   */
  private readonly formStatus = toSignal(this.guideForm.statusChanges, {
    initialValue: this.guideForm.status,
  });

  /**
   * Gate for the download control: both name and email must be satisfied
   * before it renders at all (IDD-267). Derived from {@link formStatus} so it
   * tracks every edit; the honeypot has no validators and cannot affect it.
   */
  protected readonly canDownload = computed(() => this.formStatus() === 'VALID');

  protected onSubmit(): void {
    this.guideForm.markAllAsTouched();
    if (this.guideForm.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { fullName, email, company } = this.guideForm.getRawValue();
    this.downloadApi
      .submit({
        email,
        fullName,
        company,
        resourceSlug: RESOURCE_SLUG,
        pageSlug: PAGE_SLUG,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.downloaded.set(true);
          this.downloadLink()?.nativeElement.click();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(problemDetailMessage(err) ?? this.lang.t('guide.form.error'));
        },
      });
  }
}
