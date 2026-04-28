import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

import { type AppRole } from './role.guard';
import { AuthStore } from './auth.store';

/**
 * Structural directive — render the host template only if the current user
 * has at least one of the supplied roles.
 *
 * Selector is `iosHasRole` because `eslint.config.js` enforces the `ios`
 * camelCase prefix on every attribute directive (§5). The doc snippet at
 * /docs/07 §3.3 spells it `*hasRole`; we keep the project-wide naming
 * convention here and update the doc reference in a follow-up.
 *
 * Usage:
 *
 *   <button *iosHasRole="['admin', 'instructor']">Edit course</button>
 *
 *   <ng-container *iosHasRole="['admin']">
 *     <ios-admin-only-widget />
 *   </ng-container>
 *
 * The check is reactive — the view re-renders when the user logs in/out
 * or when their role list changes (e.g. an admin promotes them in another
 * tab and the broadcast-channel coordinator updates the signal).
 */
@Directive({
  selector: '[iosHasRole]',
})
export class HasRoleDirective {
  private readonly auth = inject(AuthStore);
  private readonly view = inject(ViewContainerRef);
  private readonly tpl = inject(TemplateRef<unknown>);
  private rendered = false;

  /** Allowed roles. Reactive — updates re-evaluate the gate. */
  readonly iosHasRole = input.required<readonly AppRole[]>();

  constructor() {
    effect(() => {
      const allowed = this.iosHasRole();
      const ok = this.auth.isAuthenticated() && this.auth.hasAnyRole(allowed);

      if (ok && !this.rendered) {
        this.view.createEmbeddedView(this.tpl);
        this.rendered = true;
      } else if (!ok && this.rendered) {
        this.view.clear();
        this.rendered = false;
      }
    });
  }
}
