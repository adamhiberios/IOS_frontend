/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthStore } from '@core/auth';
import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Button, Input as IosInput, SocialButton, type SocialProvider } from '@ui';

const SOCIALS: readonly SocialProvider[] = ['google', 'apple', 'linkedin'];

/**
 * Login page (EPIC 3 — UI only, backend mocked).
 *
 * Composition:
 *   - `<ios-auth-header>` and `<ios-auth-footer>` from `@layouts/auth-shell`
 *   - `<ios-input>`, `<ios-accent-bars>`, `<ios-social-button>` from `@ui`
 */
@Component({
  selector: 'ios-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthHeader,
    AuthFooter,
    AccentBars,
    IosInput,
    Button,
    SocialButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main class="flex-1 flex items-start md:items-center justify-center px-4 pt-24 pb-10">
        <ios-accent-bars top="10.4rem" />
        <section class="w-full z-2 max-w-xl bg-white border border-gray-200 rounded-xl p-6 md:p-8">
          <header class="mb-6">
            <h1 class="text-2xl font-bold text-ios-brand-dark">Hello again, login to continue</h1>
            <p class="text-sm text-gray-500 mt-1">
              Please enter your email and password to continue.
            </p>
          </header>

          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            novalidate
            class="flex flex-col gap-4"
            aria-labelledby="login-heading"
          >
            <h2 id="login-heading" class="sr-only absolute w-px h-px -m-px overflow-hidden clip-0">
              Login credentials
            </h2>

            <!-- Email or Username -->
            <ios-input
              id="identifier"
              label="Email or username"
              type="text"
              [control]="form.controls.identifier"
              placeholder="Email or username"
              [errorText]="hasError('identifier') ? 'Email or username required' : ''"
            />

            <!-- Password -->
            <ios-input
              id="password"
              label="Password"
              type="password"
              [control]="form.controls.password"
              placeholder="Password"
              [errorText]="hasError('password') ? 'Password required' : ''"
            />

            <!-- Forgot password link -->
            <div class="text-right -mt-2">
              <a
                routerLink="/auth/forgot-password"
                class="text-sm text-gray-600 hover:text-gray-900"
              >
                Forget password?
              </a>
            </div>

            <!-- Session-expired / forced-logout banner — set by /auth/login?reason=… -->
            @if (sessionBanner()) {
              <p
                role="status"
                class="text-sm p-2 rounded bg-amber-50 text-amber-800 border border-amber-200"
              >
                {{ sessionBanner() }}
              </p>
            }

            <!-- Server-side error (invalid credentials, network, etc.) -->
            @if (errorMessage()) {
              <p
                role="alert"
                class="text-sm p-2 rounded bg-red-50 text-red-700 border border-red-200"
              >
                {{ errorMessage() }}
              </p>
            }

            <!-- Submit Button -->
            <ios-button type="submit" variant="primary" [fullWidth]="true" [loading]="isPending()">
              Login
            </ios-button>
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-3 my-5">
            <div class="flex-1 h-px bg-gray-300"></div>
            <p class="text-sm text-gray-600 whitespace-nowrap">Or continue with</p>
            <div class="flex-1 h-px bg-gray-300"></div>
          </div>

          <!-- Social Login -->
          <div class="flex justify-center gap-3">
            @for (provider of socials; track provider) {
              <ios-social-button [provider]="provider" (click)="onSocialLogin(provider)" />
            }
          </div>

          <!-- Register Link -->
          <p class="text-center text-sm text-gray-600 mt-5">
            Haven't account?
            <a routerLink="/auth/register" class="text-red-700 font-medium underline">
              Register now
            </a>
          </p>

          <p class="text-center text-xs text-gray-400 mt-5">
            © 2026 Institute of Scrum. All rights reserved.
          </p>
        </section>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly socials = SOCIALS;

  protected readonly form = this.fb.group({
    identifier: this.fb.control('', {
      validators: [Validators.required],
    }),
    password: this.fb.control('', {
      validators: [Validators.required],
    }),
  });

  /** UI bindings derived from the AuthStore submit-state machine. */
  protected readonly isPending = computed(() => this.auth.submitState().status === 'pending');
  protected readonly errorMessage = computed(() => {
    const s = this.auth.submitState();
    return s.status === 'error' ? s.message : '';
  });

  /** Banner copy driven by `?reason=` per /docs/07 §2.4 (logout reasons). */
  private readonly reason = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('reason'))), {
    initialValue: null,
  });
  /** Where the user was trying to go before the auth gate redirected them. */
  private readonly returnUrl = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('returnUrl'))),
    { initialValue: null },
  );

  protected readonly sessionBanner = computed(() => {
    switch (this.reason()) {
      case 'idle':
        return 'You were signed out due to inactivity.';
      case 'refresh-failed':
        return 'Your session expired. Please sign in again.';
      case 'forced':
        return 'Your account was signed out. Contact support if this is unexpected.';
      default:
        return '';
    }
  });

  protected hasError = (controlName: string): boolean => {
    const control = this.form.get(controlName);
    return !!(control?.invalid && control?.touched);
  };

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // AuthStore handles state transitions, navigation on success, and error
    // surfacing via the submitState signal — the page just kicks the call.
    void this.auth.login(this.form.getRawValue(), this.returnUrl()).catch(() => {
      /* error already in AuthStore.submitState() */
    });
  }

  protected onSocialLogin(_provider: SocialProvider): void {
    // Social OAuth handoff lands with the real auth API; mocked for now.
  }
}

export default LoginPage;
