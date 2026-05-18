import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { LanguageService } from '@core/i18n';

import type { CertDetailNavItem, CertDetailSection } from '../data-access/certificates.model';

/** Static nav items for the certificate detail left side-nav. */
const NAV_ITEMS: readonly { id: CertDetailNavItem['id']; labelKey: string }[] = [
  { id: 'overview', labelKey: 'dashboard.breadcrumb.overview' },
  { id: 'materials', labelKey: 'dashboard.certs.learningMaterialsNav' },
  { id: 'mock-test', labelKey: 'dashboard.certs.mockTestNav' },
];

/**
 * `ios-cert-side-nav` — left vertical side-nav for the certificate detail page.
 *
 * Width: 228 px (Figma spec).
 *
 * Active item:
 *   · Background: #e8edf0 (ESM/esm-1)
 *   · Inline-end border: 6 px solid #113348 (ESM/esm-8) — uses `border-e`
 *     so the border always faces the main content area in both LTR and RTL.
 *   · Text: 16 px / bold / #113348
 *
 * Inactive item:
 *   · Background: white
 *   · Text: 16 px / medium / #272827
 *   · Hover: #f6f6f6 tint
 *
 * Figma: node 17732-48171 (side-nav container).
 */
@Component({
  selector: 'ios-cert-side-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="hidden lg:flex flex-col w-[228px] shrink-0"
      [attr.aria-label]="lang.t('dashboard.certs.certification')"
    >
      @for (item of navItems; track item.id) {
        <button
          type="button"
          class="flex items-center w-full px-6 py-4 text-start text-[16px] leading-[1.4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
          [class.bg-cer-blue-soft]="activeSection() === item.id"
          [class.border-e-[6px]]="activeSection() === item.id"
          [class.border-cer-blue-text]="activeSection() === item.id"
          [class.font-bold]="activeSection() === item.id"
          [class.text-cer-blue-text]="activeSection() === item.id"
          [class.bg-white]="activeSection() !== item.id"
          [class.font-medium]="activeSection() !== item.id"
          [class.text-ios-fg]="activeSection() !== item.id"
          [class.hover:bg-ios-surface-muted]="activeSection() !== item.id"
          [attr.aria-current]="activeSection() === item.id ? 'page' : null"
          (click)="sectionChange.emit(item.id)"
        >
          {{ lang.t(item.labelKey) }}
        </button>
      }
    </nav>
  `,
})
export class CertSideNav {
  readonly activeSection = input.required<CertDetailSection>();
  readonly sectionChange = output<CertDetailSection>();

  protected readonly lang = inject(LanguageService);
  protected readonly navItems = NAV_ITEMS;
}
