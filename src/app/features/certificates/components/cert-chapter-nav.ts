import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { LanguageService } from '@core/i18n';

/**
 * The minimum an item needs to appear in this nav. Widened from the old
 * `SessionChapter` (which also carried `paragraphs`) when the session viewer was
 * rewired to real lessons: the nav only ever read `id` + `title`, so demanding a
 * body it never renders forced callers to fabricate one.
 */
export interface CertNavItem {
  readonly id: string;
  readonly title: string;
}

/**
 * `ios-cert-chapter-nav` — left vertical list for the session viewer.
 *
 * Now lists the **sibling lessons of the current module** rather than chapters
 * within one document: a backend lesson is a single `contentHtml` blob with no
 * chapter structure, so lesson-to-lesson is the real navigation the design's
 * chapter list was standing in for.
 *
 * Width: 354 px (Figma spec).
 *
 * Active item  → inline-start (left in LTR) border 2 px solid `#143d56` (ESM/esm-7).
 * Inactive item → inline-start border 2 px solid `#dcdcdc` (Black/Black -5).
 * All items     → 16 px / SemiBold / `#141514`, px-6 py-4.
 *
 * Uses `border-s` (logical CSS) so the border correctly flips sides in RTL,
 * always remaining on the side closest to the scroll gutter.
 *
 * Figma: node 17732-48585.
 */
@Component({
  selector: 'ios-cert-chapter-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="hidden lg:flex flex-col w-[354px] shrink-0"
      [attr.aria-label]="lang.t('dashboard.certs.sessionChapters')"
    >
      @for (chapter of chapters(); track chapter.id) {
        <button
          type="button"
          class="flex items-center w-full px-6 py-4 text-start text-[16px] font-semibold leading-[1.4] text-ios-fg-13 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
          [class.border-s-2]="true"
          [class.border-cer-blue]="activeChapterId() === chapter.id"
          [class.border-ios-border-light]="activeChapterId() !== chapter.id"
          [class.bg-[#f8fafc]]="activeChapterId() === chapter.id"
          [attr.aria-current]="activeChapterId() === chapter.id ? 'true' : null"
          (click)="chapterChange.emit(chapter.id)"
        >
          {{ chapter.title }}
        </button>
      }
    </nav>
  `,
})
export class CertChapterNav {
  protected readonly lang = inject(LanguageService);
  /** Ordered list of items to render in the sidebar. */
  readonly chapters = input.required<readonly CertNavItem[]>();
  /** ID of the currently active chapter. */
  readonly activeChapterId = input.required<string>();
  /** Emits the chapter ID when the user clicks a sidebar item. */
  readonly chapterChange = output<string>();
}
