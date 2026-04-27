/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { AccentBars, Input as IosInput, SocialButton, type SocialProvider } from '@ui';

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

            <!-- Submit Button -->
            <button
              type="submit"
              class="w-full h-11 bg-red-800 text-white text-sm font-semibold rounded-lg mt-2 hover:opacity-90 transition-opacity"
            >
              Login
            </button>

            @if (mockSubmitState() === 'submitted') {
              <p class="text-center text-green-600 text-sm p-2 bg-green-50 rounded">
                Login successful! (Mock)
              </p>
            }
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

  protected readonly socials = SOCIALS;
  protected readonly mockSubmitState = signal<'idle' | 'pending' | 'submitted'>('idle');

  protected readonly form = this.fb.group({
    identifier: this.fb.control('', {
      validators: [Validators.required],
    }),
    password: this.fb.control('', {
      validators: [Validators.required],
    }),
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
    this.mockSubmitState.set('pending');
    queueMicrotask(() => this.mockSubmitState.set('submitted'));
  }

  protected onSocialLogin(provider: SocialProvider): void {
    console.log('Social login:', provider);
  }
}

export default LoginPage;
