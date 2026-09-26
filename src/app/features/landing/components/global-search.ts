import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  type ElementRef,
  type OnDestroy,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  LucideAward,
  LucideBookOpen,
  LucideCirclePlay,
  LucideFileText,
  LucideLayers,
  LucideLoaderCircle,
  LucideNewspaper,
  LucideSearch,
  LucideX,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, type LucideIconName, provideIcons } from '@ui';

import { MIN_SEARCH_QUERY_LENGTH, PublicSearchStore } from '../data-access/search.store';
import {
  SEARCH_RESULT_TYPES,
  type SearchResult,
  type SearchResultType,
} from '../data-access/search.model';

const TYPE_ICONS: Record<SearchResultType, LucideIconName> = {
  certificate: 'award',
  cms_page: 'file-text',
  blog_article: 'newspaper',
  learning_module: 'layers',
  lesson: 'circle-play',
};

/**
 * `ios-global-search` — the site-wide search dialog opened from the landing
 * navbar (button or Ctrl/⌘+K), backed by `GET /search`.
 *
 * Follows the APG combobox-with-listbox pattern: focus stays in the input,
 * ArrowUp/ArrowDown move the active option (`aria-activedescendant`), Enter
 * opens it, Escape closes the dialog. Tab is trapped inside the panel; the
 * caller restores focus to its trigger on `closed`.
 *
 * Snippets are plain text with separate highlight ranges from the backend and
 * are rendered as text nodes — never through `[innerHTML]`.
 */
@Component({
  selector: 'ios-global-search',
  imports: [ReactiveFormsModule, IosIcon],
  providers: [
    provideIcons(
      LucideAward,
      LucideBookOpen,
      LucideCirclePlay,
      LucideFileText,
      LucideLayers,
      LucideLoaderCircle,
      LucideNewspaper,
      LucideSearch,
      LucideX,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[60]">
      <!-- Backdrop -->
      <button
        type="button"
        tabindex="-1"
        class="absolute inset-0 w-full h-full bg-black/50 cursor-default"
        [attr.aria-label]="lang.t('landing.search.close')"
        (click)="closed.emit()"
      ></button>

      <div class="relative flex justify-center px-4 pt-[8vh] sm:pt-[12vh] pointer-events-none">
        <div
          #panel
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="lang.t('landing.search.dialogLabel')"
          class="pointer-events-auto w-full max-w-[680px] max-h-[80vh] flex flex-col
                 rounded-2xl bg-white shadow-2xl overflow-hidden"
          (keydown.escape)="closed.emit()"
          (keydown.tab)="trapFocus($event)"
          (keydown.shift.tab)="trapFocus($event)"
        >
          <!-- Search input -->
          <!-- The row's brand underline is the input's focus indicator; the global
               :focus-visible outline is unlayered, hence the important modifier. -->
          <div
            class="flex items-center gap-3 px-5 border-b border-ios-border-light
                   has-[input:focus-visible]:shadow-[inset_0_-2px_0_var(--color-ios-brand-primary)]"
          >
            <ios-icon name="search" class="w-5 h-5 shrink-0 text-ios-fg-7" aria-hidden="true" />
            <label for="global-search-input" class="sr-only">
              {{ lang.t('landing.search.inputLabel') }}
            </label>
            <input
              #input
              id="global-search-input"
              type="search"
              role="combobox"
              autocomplete="off"
              spellcheck="false"
              maxlength="100"
              aria-autocomplete="list"
              aria-controls="global-search-results"
              [attr.aria-expanded]="store.items().length > 0"
              [attr.aria-activedescendant]="activeOptionId()"
              [formControl]="searchControl"
              [placeholder]="lang.t('landing.search.placeholder')"
              class="flex-1 min-w-0 h-16 bg-transparent text-[16px] text-ios-fg-13
                     placeholder:text-ios-fg-7 focus-visible:outline-none!
                     [&::-webkit-search-cancel-button]:hidden"
              (keydown.arrowdown)="moveActive($event, 1)"
              (keydown.arrowup)="moveActive($event, -1)"
              (keydown.enter)="openActive($event)"
            />
            @if (store.isLoading() || isPending() || navigating()) {
              <ios-icon
                name="loader-circle"
                class="w-5 h-5 shrink-0 animate-spin text-ios-brand-primary"
                aria-hidden="true"
              />
            }
            <button
              type="button"
              class="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg
                     text-ios-fg-8 hover:bg-ios-surface-strong transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [attr.aria-label]="lang.t('landing.search.close')"
              (click)="closed.emit()"
            >
              <ios-icon name="x" class="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <!-- Type filter chips — only once there is something to filter -->
          @if (store.totalAcrossTypes() > 0) {
            <div
              class="flex gap-2 px-5 py-3 overflow-x-auto border-b border-ios-border-light"
              role="group"
              [attr.aria-label]="lang.t('landing.search.filterLabel')"
            >
              <button
                type="button"
                [class]="chipClass(store.activeType() === null)"
                [attr.aria-pressed]="store.activeType() === null"
                (click)="store.setType(null)"
              >
                {{ lang.t('landing.search.types.all') }}
                <span class="opacity-70">{{ store.totalAcrossTypes() }}</span>
              </button>
              @for (type of availableTypes(); track type) {
                <button
                  type="button"
                  [class]="chipClass(store.activeType() === type)"
                  [attr.aria-pressed]="store.activeType() === type"
                  (click)="store.setType(type)"
                >
                  {{ lang.t('landing.search.types.' + type) }}
                  <span class="opacity-70">{{ store.countsByType()[type] }}</span>
                </button>
              }
            </div>
          }

          <!-- Body -->
          <div class="flex-1 overflow-y-auto" aria-live="polite">
            @if (isQueryTooShort()) {
              <p class="px-5 py-10 text-center text-[15px] text-ios-fg-8">
                {{ lang.t('landing.search.hint', { min: minLength }) }}
              </p>
            } @else if ((store.isLoading() || isPending()) && store.items().length === 0) {
              <!-- Skeleton rows hold the dialog at a result-list height while
                   the first page is in flight, instead of collapsing to the header. -->
              <ul class="py-2" aria-hidden="true">
                @for (row of skeletonRows; track row) {
                  <li class="mx-2 flex items-start gap-3 px-3 py-3 motion-safe:animate-pulse">
                    <span class="w-10 h-10 shrink-0 rounded-lg bg-ios-surface-strong"></span>
                    <span class="flex flex-col gap-2 flex-1 pt-1">
                      <span class="h-4 w-2/5 rounded bg-ios-surface-strong"></span>
                      <span class="h-3 w-4/5 rounded bg-ios-surface-strong"></span>
                      <span class="h-3 w-3/5 rounded bg-ios-surface-strong"></span>
                    </span>
                  </li>
                }
              </ul>
              <p class="sr-only">{{ lang.t('landing.search.searching') }}</p>
            } @else if (store.status() === 'error') {
              <div class="px-5 py-10 flex flex-col items-center gap-3 text-center">
                <p class="text-[15px] text-ios-danger">{{ store.error() }}</p>
                <button
                  type="button"
                  class="px-4 h-10 rounded-lg bg-ios-brand-primary-soft text-ios-brand-primary
                         font-heading font-semibold text-[14px] hover:opacity-90
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  (click)="store.retry()"
                >
                  {{ lang.t('landing.search.retry') }}
                </button>
              </div>
            } @else if (store.isEmpty()) {
              <p class="px-5 py-10 text-center text-[15px] text-ios-fg-8">
                {{ lang.t('landing.search.noResults', { query: store.query() }) }}
              </p>
            } @else if (store.items().length > 0) {
              <ul
                id="global-search-results"
                role="listbox"
                [attr.aria-label]="lang.t('landing.search.resultsLabel')"
                class="py-2"
              >
                @for (result of store.items(); track result.type + result.id; let i = $index) {
                  <li
                    [id]="optionId(i)"
                    role="option"
                    [attr.aria-selected]="i === activeIndex()"
                    class="mx-2 flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors"
                    [class.bg-ios-surface-strong]="i === activeIndex()"
                    tabindex="-1"
                    (mouseenter)="activeIndex.set(i)"
                    (click)="open(result)"
                    (keydown.enter)="open(result)"
                  >
                    <span
                      class="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg
                             bg-ios-brand-primary-soft text-ios-brand-primary"
                      aria-hidden="true"
                    >
                      <ios-icon [name]="typeIcon(result.type)" class="w-5 h-5" />
                    </span>
                    <span class="flex flex-col gap-1 min-w-0 flex-1">
                      <span class="flex items-center gap-2 min-w-0">
                        <span
                          class="font-heading font-semibold text-[15px] text-ios-fg-13 truncate"
                          dir="auto"
                        >
                          {{ result.title }}
                        </span>
                        <span
                          class="shrink-0 px-2 py-0.5 rounded-full bg-ios-surface-strong
                                 text-[12px] font-medium text-ios-fg-8"
                        >
                          {{ lang.t('landing.search.types.' + result.type) }}
                        </span>
                      </span>
                      @if (result.snippet.length) {
                        <span
                          class="text-[13px] leading-snug text-ios-fg-8 line-clamp-2"
                          dir="auto"
                        >
                          @for (seg of result.snippet; track $index) {
                            @if (seg.match) {
                              <mark class="bg-transparent font-semibold text-ios-fg-13">{{
                                seg.text
                              }}</mark>
                            } @else {
                              {{ seg.text }}
                            }
                          }
                        </span>
                      }
                    </span>
                  </li>
                }
              </ul>

              @if (store.hasMore()) {
                <div class="px-5 pb-4 flex justify-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 h-10 rounded-lg
                           font-heading font-semibold text-[14px] text-ios-brand-primary
                           hover:bg-ios-surface-strong transition-colors disabled:opacity-60
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                    [disabled]="store.isLoadingMore()"
                    (click)="store.loadMore()"
                  >
                    @if (store.isLoadingMore()) {
                      <ios-icon
                        name="loader-circle"
                        class="w-4 h-4 animate-spin"
                        aria-hidden="true"
                      />
                    }
                    {{ lang.t('landing.search.loadMore') }}
                  </button>
                </div>
              }
            }
          </div>

          <!-- Keyboard hints (pointer devices) -->
          <div
            class="hidden sm:flex items-center gap-4 px-5 py-2.5 border-t border-ios-border-light
                   text-[12px] text-ios-fg-7"
            aria-hidden="true"
          >
            <span
              ><kbd class="font-sans">↑</kbd> <kbd class="font-sans">↓</kbd>
              {{ lang.t('landing.search.kbdNavigate') }}</span
            >
            <span><kbd class="font-sans">↵</kbd> {{ lang.t('landing.search.kbdOpen') }}</span>
            <span><kbd class="font-sans">Esc</kbd> {{ lang.t('landing.search.kbdClose') }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GlobalSearch implements OnDestroy {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(PublicSearchStore);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** Emitted when the dialog should close (Escape, backdrop, ✕, or after navigating). */
  readonly closed = output<void>();

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  protected readonly minLength = MIN_SEARCH_QUERY_LENGTH;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly activeIndex = signal(-1);
  protected readonly navigating = signal(false);

  /** Types that have at least one match, in display order. */
  protected readonly availableTypes = computed(() =>
    SEARCH_RESULT_TYPES.filter((t) => (this.store.countsByType()[t] ?? 0) > 0),
  );

  protected readonly activeOptionId = computed(() =>
    this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );

  /**
   * Debounced + de-duped so a keystroke burst fires one request — the
   * endpoint's rate limit is 30/min per client.
   */
  /** Live (undebounced) input — drives the hint and the pending spinner. */
  private readonly rawQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  protected readonly isQueryTooShort = computed(
    () => this.rawQuery().trim().length < MIN_SEARCH_QUERY_LENGTH,
  );

  /** Typed, but the debounce hasn't handed the query to the store yet. */
  protected readonly isPending = computed(
    () => !this.isQueryTooShort() && this.rawQuery().trim() !== this.store.query(),
  );

  private readonly searchValue = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  private readonly previousOverflow: string;
  /** Navigating usually destroys the host page (and this dialog with it). */
  private destroyed = false;

  constructor() {
    this.store.reset();
    effect(() => this.store.setQuery(this.searchValue()));
    // A new result set invalidates the highlighted option.
    effect(() => {
      this.store.items();
      this.activeIndex.set(-1);
    });
    // Focus the input once rendered.
    effect(() => this.input().nativeElement.focus());

    // Keep the page behind the modal from scrolling.
    const body = this.document.body;
    this.previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.document.body.style.overflow = this.previousOverflow;
    this.store.reset();
  }

  protected optionId(index: number): string {
    return `global-search-option-${index}`;
  }

  protected typeIcon(type: SearchResultType): LucideIconName {
    return TYPE_ICONS[type] ?? 'book-open';
  }

  protected chipClass(active: boolean): string {
    const base =
      'inline-flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-full text-[13px] font-semibold ' +
      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50';
    return active
      ? `${base} bg-ios-brand-primary text-white`
      : `${base} bg-ios-surface-strong text-ios-fg-10 hover:bg-ios-brand-primary-soft`;
  }

  protected moveActive(event: Event, delta: 1 | -1): void {
    const count = this.store.items().length;
    if (count === 0) return;
    event.preventDefault();
    const next = (this.activeIndex() + delta + count) % count;
    this.activeIndex.set(next);
    this.document.getElementById(this.optionId(next))?.scrollIntoView({ block: 'nearest' });
  }

  protected openActive(event: Event): void {
    event.preventDefault();
    const items = this.store.items();
    const result = items[this.activeIndex()] ?? (items.length ? items[0] : undefined);
    if (result) void this.open(result);
  }

  protected async open(result: SearchResult): Promise<void> {
    if (this.navigating()) return;
    this.navigating.set(true);
    try {
      const route = await this.store.resolveRoute(result);
      await this.router.navigateByUrl(route);
      // Same-page targets keep the navbar alive — close explicitly. An emit
      // after destruction would throw, so skip it when the page was replaced.
      if (!this.destroyed) this.closed.emit();
    } finally {
      if (!this.destroyed) this.navigating.set(false);
    }
  }

  /** Keep Tab / Shift+Tab cycling inside the dialog. */
  protected trapFocus(event: Event): void {
    const focusables = Array.from(
      this.panel().nativeElement.querySelectorAll<HTMLElement>(
        'input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.document.activeElement;
    const shift = (event as KeyboardEvent).shiftKey;

    if (shift && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!shift && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
