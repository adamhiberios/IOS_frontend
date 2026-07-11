import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';

/**
 * Admin home — the landing page after admin sign-in.
 *
 * Intentionally minimal: it confirms the signed-in staff member and their role
 * and orients them to the (growing) admin navigation. A metrics dashboard is
 * deferred — the backend exposes no aggregate/analytics endpoints yet
 * (`docs/backend-analysis.md` → BE-I-07), so there is no real data to show and
 * we never fabricate any.
 */
@Component({
  selector: 'ios-admin-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-3xl">
      <h1 class="text-2xl font-bold text-ios-brand-dark">
        {{ lang.t('admin.home.title') }}
      </h1>
      <p class="text-sm text-gray-500 mt-1">
        {{ lang.t('admin.home.subtitle') }}
      </p>

      <dl class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <dt class="text-xs uppercase tracking-wide text-gray-500">
            {{ lang.t('admin.home.signedInAs') }}
          </dt>
          <dd class="mt-1 text-base font-semibold">{{ displayName() }}</dd>
          <dd class="text-sm text-gray-500">{{ email() }}</dd>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <dt class="text-xs uppercase tracking-wide text-gray-500">
            {{ lang.t('admin.home.role') }}
          </dt>
          <dd class="mt-1 text-base font-semibold">{{ roleLabel() }}</dd>
        </div>
      </dl>
    </section>
  `,
})
export class AdminHomePage {
  private readonly auth = inject(AuthStore);
  protected readonly lang = inject(LanguageService);

  protected readonly displayName = computed(() => this.auth.user()?.fullName ?? '');
  protected readonly email = computed(() => this.auth.user()?.email ?? '');

  protected readonly roleLabel = computed(() => {
    const role = this.auth.roles()[0];
    if (!role) return '';
    const spaced = role.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  });
}

export default AdminHomePage;
