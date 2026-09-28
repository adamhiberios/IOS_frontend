import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgOptimizedImage } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideCircleAlert } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import { LanguageService } from '@core/i18n';
import {
  CertificatesBadge,
  IosIcon,
  PageBreadcrumbBar,
  PageFooter,
  ScrollToTop,
  provideIcons,
} from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { CertificateVerifyApi } from '../data-access/certificate-verify.api';
import {
  type CertificateVerification,
  type VerifyStatus,
} from '../data-access/certificate-verify.model';

/** Motion for the result reveal — the same curve as the app's slide-in utilities. */
const REVEAL_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const REVEAL_MS = 450;
/** How far the result card travels down into place, as it fades in. */
const CARD_SLIDE_PX = 24;

/** Result-card tint per certificate family (Figma: epo-1 / esm / esf soft). */
const FAMILY_SURFACE: Record<CertificateVerification['family'], string> = {
  esm: 'bg-cer-blue-soft',
  epo: 'bg-cer-green-soft',
  esf: 'bg-cer-brown-soft',
};

/**
 * `ios-verify-certificate-page` — public certificate verification (IDD-258),
 * reached from the navbar's Certifications → Verify Certificate link.
 *
 * Figma: 13480-27830 (empty) · 13484-28293 (certificate found).
 *
 * The visitor types the reference number printed on the certificate; the page
 * asks `GET /verify/:certId` (public) and shows the certificate — badge, code,
 * programme, holder, reference — above a status line: valid, revoked, or no
 * such certificate. No sign-in needed: this is how an employer checks a
 * candidate's certificate.
 *
 * The example image shows where the number is printed. Its layers are placed
 * exactly as in Figma (a crop of the certificate, the highlight ellipse, and
 * the certificate again masked to the ellipse), on a fixed 602 × 363 stage
 * pinned to the right edge, so on a narrow screen the crop loses its left
 * side — the signature — and keeps the highlighted number in view.
 */
@Component({
  selector: 'ios-verify-certificate-page',
  imports: [
    LandingNavbar,
    PageBreadcrumbBar,
    PageFooter,
    ScrollToTop,
    CertificatesBadge,
    IosIcon,
    NgOptimizedImage,
    ReactiveFormsModule,
  ],
  providers: [provideIcons(LucideCircleAlert)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      /* The ellipse-shaped window onto the certificate (Figma mask group). */
      .verify-example-highlight {
        mask-image: url('/assets/images/verify-certificate/highlight-mask.svg');
        mask-position: 456px 496px;
        mask-size: 273.211px 88px;
        mask-repeat: no-repeat;
      }
    `,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-landing-navbar />

      <ios-page-breadcrumb-bar backLink="/" [backLabel]="lang.t('verifyCertificate.back')">
        <li>
          <h1 class="font-body font-semibold text-ios-fg-13">
            {{ lang.t('verifyCertificate.title') }}
          </h1>
        </li>
      </ios-page-breadcrumb-bar>

      <main id="main-content" class="flex-1 px-4 pt-8 pb-16 font-body">
        <!-- Example on the start side, form on the end side; the certificate
             appears under the form, so the page grows as little as possible.
             Stacked (example, form, certificate) on small screens. -->
        <div class="mx-auto grid w-full max-w-[1244px] gap-8 lg:grid-cols-2 lg:items-start">
          <!-- Example: where the reference number is printed -->
          <figure class="flex w-full min-w-0 flex-col gap-3">
            <figcaption
              class="font-heading text-[22px] sm:text-[24px] font-bold leading-[1.2] text-ios-fg-13"
              dir="auto"
            >
              {{ lang.t('verifyCertificate.example') }}
            </figcaption>
            <div
              class="relative h-[367px] w-full overflow-hidden rounded-lg border-2 border-ios-fg-8 bg-ios-surface-soft shadow-[0px_8px_30px_0px_rgba(0,0,0,0.1)]"
              role="img"
              [attr.aria-label]="lang.t('verifyCertificate.exampleAlt')"
            >
              <div class="absolute top-0 right-0 h-[363px] w-[602px]" aria-hidden="true">
                <div
                  class="absolute left-[-260px] top-[-241px] h-[565.188px] w-[804px] border-4 border-ios-border-light shadow-[10px_10px_15.4px_0px_rgba(0,0,0,0.13)]"
                >
                  <img
                    ngSrc="/assets/images/verify-certificate/certificate-example.webp"
                    alt=""
                    fill
                    priority
                    class="object-cover pointer-events-none"
                  />
                </div>
                <img
                  ngSrc="/assets/images/verify-certificate/highlight-ellipse.svg"
                  alt=""
                  width="279"
                  height="94"
                  priority
                  class="absolute left-[260px] top-[252px] block h-[94px] w-[279.209px] max-w-none"
                />
                <div
                  class="verify-example-highlight absolute left-[-193px] top-[-241px] h-[565px] w-[788px] shadow-[10px_10px_15.4px_0px_rgba(0,0,0,0.13)]"
                >
                  <div class="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                      ngSrc="/assets/images/verify-certificate/certificate-example.webp"
                      alt=""
                      width="1563"
                      height="1107"
                      priority
                      class="absolute left-[-8.04%] top-0 h-full w-[101.27%] max-w-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </figure>

          <div #formColumn class="flex w-full min-w-0 flex-col">
            <!-- Heading -->
            <div
              class="flex w-full flex-col items-center gap-2 text-center lg:items-start lg:text-start"
            >
              <h2
                class="font-heading text-[22px] sm:text-[24px] font-bold leading-[1.2] text-ios-fg-13"
                dir="auto"
              >
                {{ lang.t('verifyCertificate.title') }}
              </h2>
              <p class="text-sm sm:text-base font-medium leading-[1.4] text-ios-fg-8" dir="auto">
                {{ lang.t('verifyCertificate.subtitle') }}
              </p>
            </div>

            <!-- Form -->
            <form
              class="mt-5 flex w-full flex-col"
              [formGroup]="form"
              (ngSubmit)="verify()"
              novalidate
            >
              <div class="flex w-full flex-col">
                <div class="flex w-full flex-col gap-1">
                  <label
                    for="verify-reference"
                    class="px-2 text-base font-semibold leading-[1.4] text-ios-fg"
                  >
                    {{ lang.t('verifyCertificate.fieldLabel') }}
                  </label>
                  <input
                    id="verify-reference"
                    type="text"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck="false"
                    dir="ltr"
                    formControlName="reference"
                    [placeholder]="lang.t('verifyCertificate.placeholder')"
                    aria-describedby="verify-status"
                    class="w-full rounded-lg border border-ios-line bg-ios-surface-mid p-3 text-base font-bold leading-[1.3] text-ios-fg placeholder:font-medium placeholder:leading-[1.4] placeholder:text-ios-fg-7 focus:outline-none focus:border-ios-fg-8 focus-visible:ring-2 focus-visible:ring-ios-brand-primary/30"
                  />
                </div>

                <div id="verify-status" class="[&>p]:mt-4" aria-live="polite">
                  @switch (status()) {
                    @case ('found') {
                      @if (result()?.valid) {
                        <p
                          class="flex w-full items-center gap-[10px] rounded-xl bg-ios-success-50 p-4 text-base font-semibold leading-[1.4] text-ios-fg-11"
                        >
                          <img
                            ngSrc="/assets/images/verify-certificate/information-line.svg"
                            alt=""
                            width="24"
                            height="24"
                            class="shrink-0"
                          />
                          <span dir="auto">{{ lang.t('verifyCertificate.valid') }}</span>
                        </p>
                      } @else {
                        <p [class]="problemClass">
                          <ios-icon name="circle-alert" class="h-6 w-6 shrink-0 text-ios-danger" />
                          <span dir="auto">{{ lang.t('verifyCertificate.revoked') }}</span>
                        </p>
                      }
                    }
                    @case ('not-found') {
                      <p [class]="problemClass">
                        <ios-icon name="circle-alert" class="h-6 w-6 shrink-0 text-ios-danger" />
                        <span dir="auto">{{ lang.t('verifyCertificate.notFound') }}</span>
                      </p>
                    }
                    @case ('error') {
                      <p [class]="problemClass">
                        <ios-icon name="circle-alert" class="h-6 w-6 shrink-0 text-ios-danger" />
                        <span dir="auto">{{ lang.t('verifyCertificate.error') }}</span>
                      </p>
                    }
                  }
                </div>
              </div>

              <button
                type="submit"
                [disabled]="!canSubmit()"
                class="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-ios-brand-primary px-6 py-4 text-[18px] font-semibold leading-[1.4] text-ios-brand-primary-soft transition-opacity hover:bg-ios-brand-primary-hover disabled:opacity-40 disabled:hover:bg-ios-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 focus-visible:ring-offset-2"
              >
                {{
                  status() === 'checking'
                    ? lang.t('verifyCertificate.checking')
                    : lang.t('verifyCertificate.submit')
                }}
              </button>
            </form>

            <!-- The certificate that was found -->
            @if (result(); as cert) {
              <section
                #resultCard
                class="mt-8 flex w-full min-w-0 flex-col gap-6 overflow-hidden rounded-lg p-6 sm:p-8"
                [class]="surfaceClass()"
                [attr.aria-label]="lang.t('verifyCertificate.resultLabel')"
              >
                <div class="flex w-full items-start gap-4">
                  <ios-certificates-badge
                    class="block h-[122px] w-[98px] shrink-0"
                    [svgPath]="cert.badgeAsset"
                    [code]="cert.programCode"
                    [fullName]="cert.program"
                  />
                  <div class="flex min-w-0 flex-1 flex-col py-[14px]">
                    <p
                      class="font-heading text-[20px] font-bold leading-[1.2] text-ios-fg"
                      dir="auto"
                    >
                      {{ cert.programCode }}
                    </p>
                    <p class="text-base font-medium leading-[1.4] text-ios-fg-10" dir="auto">
                      {{ cert.program }}
                    </p>
                  </div>
                </div>
                <dl
                  class="flex w-full flex-wrap items-center justify-between gap-4 sm:px-[21px] text-[18px] text-ios-fg"
                >
                  <div class="flex min-w-0 flex-col gap-1">
                    <dt class="font-medium leading-[1.4]">
                      {{ lang.t('verifyCertificate.fullName') }}
                    </dt>
                    <dd class="font-bold leading-[1.2] break-words" dir="auto">
                      {{ cert.holderName }}
                    </dd>
                  </div>
                  <div class="flex min-w-0 flex-col gap-1">
                    <dt class="font-medium leading-[1.4]">
                      {{ lang.t('verifyCertificate.referenceNumber') }}
                    </dt>
                    <dd class="font-bold leading-[1.2] break-all" dir="ltr">{{ cert.certId }}</dd>
                  </div>
                </dl>
              </section>
            }
          </div>
        </div>
      </main>

      <ios-page-footer />
      <ios-scroll-to-top />
    </div>
  `,
})
export class VerifyCertificatePage {
  private readonly api = inject(CertificateVerifyApi);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  protected readonly lang = inject(LanguageService);

  private readonly formColumn = viewChild.required<ElementRef<HTMLElement>>('formColumn');
  private readonly resultCard = viewChild<ElementRef<HTMLElement>>('resultCard');

  protected readonly form = inject(NonNullableFormBuilder).group({ reference: '' });
  private readonly reference = this.form.controls.reference;

  protected readonly status = signal<VerifyStatus>('idle');
  protected readonly result = signal<CertificateVerification | null>(null);

  /** Mirrors the control so the button reacts as the visitor types. */
  private readonly referenceValue = toSignal(this.reference.valueChanges, { initialValue: '' });

  protected readonly canSubmit = computed(
    () => this.referenceValue().trim() !== '' && this.status() !== 'checking',
  );

  protected readonly surfaceClass = computed(() => {
    const cert = this.result();
    return cert ? FAMILY_SURFACE[cert.family] : '';
  });

  /** Status line for revoked / not found / failed — the valid line's shape, in danger colours. */
  protected readonly problemClass =
    'flex w-full items-center gap-[10px] rounded-xl bg-ios-danger-soft p-4 text-base font-semibold leading-[1.4] text-ios-fg-11';

  protected async verify(): Promise<void> {
    // Reference numbers are upper-case (IOS-ESM-2026-000123); accept any case.
    const certId = this.reference.value.trim().toUpperCase();
    if (!certId || this.status() === 'checking') return;

    this.status.set('checking');
    try {
      const cert = await firstValueFrom(this.api.verify(certId));
      this.showResult(cert);
      this.status.set(cert ? 'found' : 'not-found');
    } catch {
      this.showResult(null);
      this.status.set('error');
    }
  }

  /**
   * Swap the result in with motion instead of a jump: the card slides down
   * into place under the form. The form is also FLIP-animated (measure,
   * change, invert, play) so any shift it takes when the layout changes — on
   * a stacked phone layout, say — glides rather than jumps. Skipped for
   * visitors who ask for reduced motion.
   */
  private showResult(cert: CertificateVerification | null): void {
    const before = this.formColumn().nativeElement.getBoundingClientRect();
    this.result.set(cert);
    afterNextRender(() => this.playReveal(before), { injector: this.injector });
  }

  private playReveal(before: DOMRect): void {
    const view = this.document.defaultView;
    if (!view || view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timing: KeyframeAnimationOptions = { duration: REVEAL_MS, easing: REVEAL_EASING };

    const column = this.formColumn().nativeElement;
    const after = column.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (dx !== 0 || dy !== 0) {
      column.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        timing,
      );
    }

    const card = this.resultCard()?.nativeElement;
    if (card) {
      // Slides down into place under the form.
      card.animate(
        [
          { opacity: 0, transform: `translateY(-${CARD_SLIDE_PX}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { ...timing, delay: 80, fill: 'backwards' },
      );
    }
  }
}

export default VerifyCertificatePage;
