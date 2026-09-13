import { ChangeDetectionStrategy, Component, type OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars } from '@ui';

import { LanguageService } from '@core/i18n';
import { problemDetailMessage } from '@core/http';

import { ExamApi } from '../data-access/exam.api';
import { type ExamReadyNavState } from '../data-access/exam.model';

/**
 * `ios-exam-start-page` — landing target of the direct exam link in the
 * access-code email (`/assessments/start?t=<token>`, backend `MailService`).
 *
 * Calls `POST /exam/access/resolve`, which never consumes the code (mail
 * scanners prefetch links), and routes on the returned state:
 *   - `ready`     → the ready page with the token as `code`, same nav state the
 *                   verify page hands over, so `start` works unchanged.
 *   - `resume`    → straight back into the open sitting (the runner restores it).
 *   - `completed` → the scored attempt's review.
 * Every hop uses `replaceUrl` so the token doesn't stay in browser history.
 *
 * A missing or rejected token shows an error with a way to enter the code by
 * hand on the verify page. Unauthenticated visitors never get here — the
 * `assessments` `authGuard` sends them to login with this URL as `returnUrl`.
 */
@Component({
  selector: 'ios-exam-start-page',
  imports: [RouterLink, AuthHeader, AuthFooter, AccentBars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <div class="flex flex-col flex-1 pt-16">
        <main class="relative flex-1 flex flex-col items-center px-4 py-12">
          <ios-accent-bars top="7rem" start="27.5%" end="27.5%" />

          <div class="relative z-10 w-full max-w-[606px] flex flex-col gap-6">
            <h1 class="text-2xl font-semibold text-ios-fg-13" dir="auto">
              {{ lang.t('assessments.start.title') }}
            </h1>

            @if (errorMessage(); as message) {
              <p
                class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
                role="alert"
              >
                {{ message }}
              </p>
              <a
                routerLink="/assessments/verify"
                class="flex h-14 w-full items-center justify-center rounded-xl
                       bg-ios-brand-primary text-ios-brand-primary-soft font-semibold text-lg
                       transition-colors hover:bg-ios-brand-primary-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('assessments.start.enterCode') }}
              </a>
            } @else {
              <p class="text-lg font-medium text-ios-fg-8 leading-relaxed" aria-live="polite">
                {{ lang.t('assessments.start.resolving') }}
              </p>
            }
          </div>
        </main>

        <ios-auth-footer />
      </div>
    </div>
  `,
})
export class ExamStartPage implements OnInit {
  protected readonly lang = inject(LanguageService);
  private readonly api = inject(ExamApi);
  private readonly router = inject(Router);

  /** The `?t=` token from the email link (component input binding). */
  readonly t = input('');

  private readonly _error = signal<string | null>(null);
  protected readonly errorMessage = this._error.asReadonly();

  ngOnInit(): void {
    void this.resolve();
  }

  private async resolve(): Promise<void> {
    const token = (this.t() ?? '').trim();
    if (!token) {
      this._error.set(this.lang.t('assessments.start.missingToken'));
      return;
    }
    try {
      const link = await firstValueFrom(this.api.resolveLink(token));
      if (!link) {
        this._error.set(this.lang.t('assessments.start.invalidLink'));
        return;
      }
      switch (link.state) {
        case 'ready': {
          const state: ExamReadyNavState = {
            code: token,
            examId: link.examId,
            examTitle: link.examTitle,
            durationMinutes: link.durationMinutes,
          };
          await this.router.navigate(['/assessments/ready'], { state, replaceUrl: true });
          return;
        }
        case 'resume':
          await this.router.navigate(['/assessments/run', link.sessionId], { replaceUrl: true });
          return;
        case 'completed':
          await this.router.navigate(['/assessments/review', link.attemptId], {
            replaceUrl: true,
          });
          return;
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        this._error.set(this.lang.t('assessments.start.invalidLink'));
      } else {
        this._error.set(problemDetailMessage(err) ?? this.lang.t('assessments.start.genericError'));
      }
    }
  }
}

export default ExamStartPage;
