import { InjectionToken, type Provider } from '@angular/core';
import { type LucideIconData } from '@lucide/angular';

/**
 * Minimal structural type for a Lucide icon component class.
 *
 * Every `@lucide/angular` icon class declares `static readonly icon: LucideIconData`
 * in its TypeScript definition, so `typeof LucideAward` etc. satisfy this type
 * without any `any` — no `Type<any>`, no unsafe-call, no unsafe-member-access.
 *
 * We deliberately avoid `LucideIcon` (which extends `Type<LucideIconProps>` with
 * `new(...args: any[])`) because that `any[]` constructor signature is what
 * triggers `@typescript-eslint/no-unsafe-call` at every `provideIcons()` call site.
 */
export interface LucideIconClass {
  readonly icon: LucideIconData;
}

/**
 * Internal multi-token that collects icon batches from `provideIcons()` calls.
 *
 * Named `IOS_ICON_BATCHES` (not `LUCIDE_ICONS`) to avoid collision with
 * `@lucide/angular`'s own exported `LUCIDE_ICONS` token.
 *
 * Each `provideIcons(A, B, C)` call contributes one `[A, B, C]` entry.
 * `IosIcon` injects this token, flattens all arrays, and builds a lookup map
 * of `iconData.name → LucideIconData` once during construction.
 *
 * Never import this directly in feature code — use `provideIcons()` only.
 */
export const IOS_ICON_BATCHES = new InjectionToken<LucideIconClass[][]>('IOS_ICON_BATCHES');

/**
 * Register one or more Lucide icon components so `<ios-icon>` can render them.
 *
 * Call this in the `providers` array of any standalone component, route, or
 * `app.config.ts` that uses those icons. Only registered icons land in the
 * bundle — unregistered names log a dev-mode warning and render nothing.
 *
 * ── Example ──────────────────────────────────────────────────────────
 *
 * ```ts
 * // In a standalone component:
 * @Component({
 *   providers: [provideIcons(LucideAward, LucideArrowRight)],
 * })
 *
 * // Or globally in app.config.ts for icons used on every page:
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideIcons(LucideAward, LucideArrowRight)],
 * };
 * ```
 *
 * ── Icon names ───────────────────────────────────────────────────────
 *
 * Template names come from `LucideIconData.name` (already kebab-case):
 *   LucideArrowRight  →  'arrow-right'
 *   LucideAward       →  'award'
 *   LucideZap         →  'zap'
 */
export function provideIcons(...icons: LucideIconClass[]): Provider {
  return { provide: IOS_ICON_BATCHES, useValue: icons, multi: true };
}
