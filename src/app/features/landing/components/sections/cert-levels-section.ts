/**
 * `ios-cert-levels-section` — "Choose Your Certification Path" tabbed carousel (section 5).
 *
 * Manages active-tab state locally (UI state).
 *
 * ## Data ownership
 * Every certificate on screen comes from `PublicCatalogStore` — there is no
 * hardcoded fallback catalog. Tabs are the distinct career **tracks** the
 * backend publishes (Scrum Master / Product Owner / Scrum Facilitator …), one
 * tab per track that has at least one certificate; each card's chip shows that
 * certificate's `level` tier, since the tab already conveys the role.
 *
 * Only the surrounding marketing copy is local: per-track description, CTA
 * label and audience blurb are locale-reactive via `lang.t()`, keyed by the
 * recognised track (unrecognised tracks fall back to generic copy and display
 * the backend's raw track string). Badge colors and the certification detail
 * route are structural constants.
 *
 * ## No data, no section
 * While the catalog is loading, or if it errors or returns nothing, `levels()`
 * is empty and the entire `<section>` is omitted rather than rendering a
 * placeholder.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCircleQuestionMark } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { ViewportService } from '@core/viewport';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import { CertCard, type CertCardData } from '../cert-card';
import { PublicCatalogStore } from '../../data-access/catalog.store';
import {
  formatPrice,
  levelRank,
  normalizeTrack,
  TRACK_ORDER,
  type KnownTrack,
} from '../../data-access/catalog.mappers';
import type { PublicCertificate } from '../../data-access/catalog.model';

// ---------------------------------------------------------------------------
// Local shape (view model — never goes to the API)
// ---------------------------------------------------------------------------

interface CertLevelDef {
  id: string;
  tabLabel: string;
  description: string;
  explorePath: string;
  exploreLink: string;
  /**
   * Optional URL fragment for `exploreLink`, bound separately via
   * `[fragment]` on the `routerLink`. `routerLink` treats its string input
   * as literal path commands — a `#fragment` embedded directly in that
   * string is NOT parsed out as a fragment, it's matched as part of the
   * path itself (and 404s, since no such route exists).
   */
  exploreFragment?: string;
  audienceDesc: string;
  certCards: CertCardData[];
}

@Component({
  selector: 'ios-cert-levels-section',
  imports: [RouterLink, IosIcon, SectionBadge, CertCard],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight, LucideCircleQuestionMark)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Dismisses the mobile "who should pursue" popover on outside tap / Escape.
  // Both handlers no-op cheaply while nothing is open.
  host: {
    '(document:click)': 'closeAudience()',
    '(document:keydown.escape)': 'closeAudience()',
  },
  // Mobile card-swipe feedback (IDD-300). The card enters from the side the
  // user swiped from, so forward and backward steps are distinguishable.
  // `:host-context` is needed because `dir` lives on <html>, outside this
  // component's emulated encapsulation.
  styles: `
    .cert-swipe {
      animation: cert-swipe-forward 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .cert-swipe[data-dir='-1'] {
      animation-name: cert-swipe-back;
    }
    :host-context([dir='rtl']) .cert-swipe {
      animation-name: cert-swipe-back;
    }
    :host-context([dir='rtl']) .cert-swipe[data-dir='-1'] {
      animation-name: cert-swipe-forward;
    }

    @keyframes cert-swipe-forward {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    @keyframes cert-swipe-back {
      from {
        opacity: 0;
        transform: translateX(-24px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    /* Motion-sensitive users still get a state-change cue, without travel. */
    @media (prefers-reduced-motion: reduce) {
      .cert-swipe,
      .cert-swipe[data-dir='-1'],
      :host-context([dir='rtl']) .cert-swipe,
      :host-context([dir='rtl']) .cert-swipe[data-dir='-1'] {
        animation: cert-swipe-fade 160ms ease-out both;
      }
      @keyframes cert-swipe-fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    }
  `,
  template: `
    <!-- Nothing published (or still loading / errored) — omit the section entirely. -->
    @if (levels().length > 0) {
      <section
        [attr.aria-label]="lang.t('landing.sections.certLevelsSectionAriaLabel')"
        class="bg-ios-surface-warm py-20 lg:py-28"
      >
        <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
          <!-- Header -->
          <div class="mb-10">
            <div class="mb-5">
              <ios-section-badge
                [text]="lang.t('landing.sections.levelsExplained')"
                variant="gold"
              />
            </div>
            <h2 class="font-heading font-bold text-[clamp(1.5rem,3vw,2.25rem)] leading-tight mb-3">
              <span class="text-ios-brand-dark">{{ lang.t('landing.sections.threeLevels') }} </span>
              <span class="text-ios-brand-primary">{{
                lang.t('landing.sections.threeLevelsHighlight')
              }}</span>
            </h2>
            <p class="text-[16px] text-ios-fg-mid leading-relaxed mb-5">
              {{ lang.t('landing.sections.threeLevelsSubtitle') }}
            </p>
            <div class="w-36 h-1 bg-ios-brand-gold rounded-full"></div>
          </div>

          @if (viewport.isMobile()) {
            <!--
            Mobile: the tab/carousel model collapses into a vertical stack — every
            level is rendered in order (Scrum Master → Product Owner → …) with its
            label as a plain heading instead of a tab button, and its certificates
            paged one at a time. Structurally different enough from the desktop
            tree that it is an @if branch rather than a CSS override.
          -->
            <div class="flex flex-col gap-10">
              @for (level of levels(); track level.id) {
                @let cards = level.certCards;
                @let idx = cardIdx(level.id);

                <!--
                No card chrome around the intro: the description, explore link
                and audience toggle sit directly on the section background, so
                the only card on screen is the certificate itself.
              -->
                <div class="flex flex-col items-start gap-4">
                  <!-- Tab label as a static heading (no tab semantics on mobile) -->
                  <h3
                    class="inline-block font-heading font-bold text-[15px] text-ios-fg-13
                         border-b-2 border-ios-brand-primary pb-1"
                  >
                    {{ level.tabLabel }}
                  </h3>

                  <!-- Description stacked above the explore link -->
                  <p class="text-[15px] text-ios-fg-8 leading-relaxed">
                    {{ level.description }}
                  </p>
                  <a
                    [routerLink]="level.exploreLink"
                    [fragment]="level.exploreFragment"
                    class="inline-flex items-center gap-2 text-ios-brand-primary font-heading font-semibold text-[14px]
                         hover:underline focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-ios-brand-primary/50 rounded-lg"
                  >
                    {{ level.explorePath }}
                    <ios-icon
                      name="arrow-right"
                      class="w-4 h-4 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </a>

                  <!--
                  "Who Should Pursue This" collapses to its icon; the copy floats
                  over the content on tap. Tap-to-toggle rather than :hover, which
                  is unreliable (sticky) on touch pointers.
                -->
                  <div class="relative">
                    <button
                      type="button"
                      (click)="toggleAudience(level.id, $event)"
                      [attr.aria-expanded]="audienceOpenFor() === level.id"
                      [attr.aria-controls]="'audience-' + level.id"
                      [attr.aria-label]="lang.t('landing.levels.whoShouldPursueToggle')"
                      class="w-9 h-9 rounded-full border border-ios-fg-7 bg-ios-surface-strong
                           flex items-center justify-center cursor-pointer
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                    >
                      <ios-icon
                        name="circle-question-mark"
                        class="w-4 h-4 text-ios-fg-mid"
                        aria-hidden="true"
                      />
                    </button>
                    @if (audienceOpenFor() === level.id) {
                      <div
                        [id]="'audience-' + level.id"
                        class="absolute z-20 top-11 start-0 w-[min(22rem,calc(100vw-3.5rem))]
                             rounded-xl bg-ios-surface-strong border border-ios-border-light shadow-lg p-4"
                      >
                        <p class="font-heading font-semibold text-[15px] text-ios-fg-10 mb-1">
                          {{ lang.t('landing.levels.whoShouldPursue') }}
                        </p>
                        <p class="text-[14px] text-ios-fg-8 leading-relaxed">
                          {{ level.audienceDesc }}
                        </p>
                      </div>
                    }
                  </div>

                  <!--
                  One certificate at a time. The arrows straddle the card's side
                  edges at its vertical midpoint; the half that hangs outside
                  (20px) stays within the section's 24px gutter, so they never
                  cause horizontal overflow. The start/end insets plus the
                  mirrored rtl: translate keep them on the correct sides in
                  Arabic.

                  The touch-pan-y class lets the browser keep handling vertical
                  page scroll while we read the horizontal component ourselves,
                  so a swipe steps the card instead of being swallowed as a
                  page scroll gesture.
                -->
                  <div
                    class="relative w-full touch-pan-y"
                    (touchstart)="onCardTouchStart($event)"
                    (touchend)="onCardTouchEnd($event, level.id, cards.length)"
                  >
                    <!--
                    Rendered through @for over a single-element window rather
                    than @if: swapping the index under @if only rebinds the
                    input on the existing node, so the card's text changed with
                    no visible motion and a swipe read as "nothing happened"
                    (IDD-300). Tracking by id destroys and recreates the node
                    on every step, which restarts the entry animation below.
                  -->
                    @for (cert of visibleCards(cards, idx); track cert.id) {
                      <div class="cert-swipe" [attr.data-dir]="cardDir(level.id)">
                        <ios-cert-card [cert]="cert" />
                      </div>
                    }

                    @if (cards.length > 1) {
                      @if (idx > 0) {
                        <button
                          type="button"
                          (click)="stepCard(level.id, -1, cards.length)"
                          [attr.aria-label]="lang.t('common.previousCertification')"
                          class="absolute z-10 top-1/2 start-0
                               -translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2
                               w-10 h-10 rounded-full border border-ios-brand-gold bg-white shadow-md
                               flex items-center justify-center text-ios-brand-primary cursor-pointer
                               hover:bg-ios-brand-gold/10 transition-colors
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                        >
                          <ios-icon
                            name="arrow-left"
                            class="w-4 h-4 rtl:rotate-180"
                            aria-hidden="true"
                          />
                        </button>
                      }
                      @if (idx < cards.length - 1) {
                        <button
                          type="button"
                          (click)="stepCard(level.id, 1, cards.length)"
                          [attr.aria-label]="lang.t('common.nextCertification')"
                          class="absolute z-10 top-1/2 end-0
                               -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2
                               w-10 h-10 rounded-full border border-ios-brand-gold bg-white shadow-md
                               flex items-center justify-center text-ios-brand-primary cursor-pointer
                               hover:bg-ios-brand-gold/10 transition-colors
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                        >
                          <ios-icon
                            name="arrow-right"
                            class="w-4 h-4 rtl:rotate-180"
                            aria-hidden="true"
                          />
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <!--
            Tab row — one tab per published track, plus the Prev/Next arrows.
            Sticky at the absolute top of the viewport (top-0) while the
            section is in view, so it stays reachable without any scroll-back.
            z-[60] — above the navbar's z-50 — so this bar takes over the top
            edge and sits in front of the navbar rather than being hidden
            behind it once both reach the same stuck position. The navbar
            reappears once the user scrolls back above this section.
          -->
            <div
              class="sticky top-0 z-[60] bg-ios-surface-warm
                   flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-8 py-3"
            >
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2" role="tablist">
                @for (level of levels(); track level.id; let idx = $index) {
                  <button
                    type="button"
                    role="tab"
                    [attr.aria-selected]="activeLevelIdx() === idx"
                    (click)="selectLevel(idx)"
                    class="px-2 py-2 text-[15px] text-start cursor-pointer
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                  >
                    <!-- inline-block so the underline sizes to the label text, not the button -->
                    <span
                      class="inline-block pb-1 border-b-2 transition-colors"
                      [class.font-bold]="activeLevelIdx() === idx"
                      [class.text-ios-fg-13]="activeLevelIdx() === idx"
                      [class.border-ios-brand-primary]="activeLevelIdx() === idx"
                      [class.font-medium]="activeLevelIdx() !== idx"
                      [class.text-ios-fg-mid]="activeLevelIdx() !== idx"
                      [class.border-transparent]="activeLevelIdx() !== idx"
                      [class.hover:text-ios-brand-primary]="activeLevelIdx() !== idx"
                    >
                      {{ level.tabLabel }}
                    </span>
                  </button>
                }
              </div>

              <!-- Prev / Next arrows -->
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="prevLevel()"
                  [attr.aria-label]="lang.t('common.previousLevel') || 'Previous level'"
                  class="w-10 h-10 rounded-full border border-ios-brand-gold
                     flex items-center justify-center text-ios-brand-primary
                     hover:bg-ios-brand-gold/10 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                >
                  <ios-icon name="arrow-left" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  (click)="nextLevel()"
                  [attr.aria-label]="lang.t('common.nextLevel') || 'Next level'"
                  class="w-10 h-10 rounded-full border border-ios-brand-gold
                     flex items-center justify-center text-ios-brand-primary
                     hover:bg-ios-brand-gold/10 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                >
                  <ios-icon name="arrow-right" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Carousel track -->
            <div
              #carouselTrack
              class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
            >
              @for (level of levels(); track level.id) {
                <div class="w-full flex-shrink-0 snap-center">
                  <div
                    class="bg-white border border-ios-border-light rounded-2xl p-8 flex flex-col gap-6"
                  >
                    <!-- Description row -->
                    <div class="grid grid-cols-3 gap-6 items-start">
                      <p class="col-span-2 text-[15px] text-ios-fg-8 leading-relaxed">
                        {{ level.description }}
                      </p>
                      <div class="col-span-1 flex justify-end">
                        <a
                          [routerLink]="level.exploreLink"
                          [fragment]="level.exploreFragment"
                          class="inline-flex items-center gap-2 text-ios-brand-primary font-heading font-semibold text-[14px]
                             hover:underline focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-ios-brand-primary/50 rounded-lg"
                        >
                          {{ level.explorePath }}
                          <ios-icon
                            name="arrow-right"
                            class="w-4 h-4 rtl:rotate-180"
                            aria-hidden="true"
                          />
                        </a>
                      </div>
                    </div>

                    <!-- Who Should Pursue This -->
                    <div class="rounded-xl bg-ios-surface-strong p-4 flex items-start gap-3">
                      <div
                        class="w-9 h-9 rounded-full border border-ios-fg-7 flex items-center justify-center flex-shrink-0"
                      >
                        <ios-icon
                          name="circle-question-mark"
                          class="w-4 h-4 text-ios-fg-mid"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <p class="font-heading font-semibold text-[15px] text-ios-fg-10 mb-1">
                          {{ lang.t('landing.levels.whoShouldPursue') }}
                        </p>
                        <p class="text-[14px] text-ios-fg-8 leading-relaxed">
                          {{ level.audienceDesc }}
                        </p>
                      </div>
                    </div>

                    <!-- Cert cards -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      @for (cert of level.certCards; track cert.id) {
                        <ios-cert-card [cert]="cert" />
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class CertLevelsSection {
  protected readonly lang = inject(LanguageService);
  protected readonly catalogStore = inject(PublicCatalogStore);
  protected readonly viewport = inject(ViewportService);
  protected readonly activeLevelIdx = signal(0);

  /**
   * Mobile only — index of the certificate currently shown for each level,
   * keyed by `CertLevelDef.id`. A map rather than a single index because the
   * mobile layout renders every level at once, each paging independently.
   * Missing keys read as `0`, so no seeding is needed when the tab set changes.
   */
  private readonly cardIdxByLevel = signal<Record<string, number>>({});

  /**
   * Mobile only — direction of each level's most recent card step (`1` forward,
   * `-1` back), so the entry animation can travel the way the user swiped.
   * Missing keys read as `1`, matching the first-paint direction.
   */
  private readonly cardDirByLevel = signal<Record<string, 1 | -1>>({});

  /** Mobile only — id of the level whose audience popover is open, if any. */
  protected readonly audienceOpenFor = signal<string | null>(null);

  private readonly carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');

  /** Brand color per recognised track — tints the tier chip on its cards. */
  private static readonly TRACK_BADGE_COLOR: Record<KnownTrack, string> = {
    scrumMaster: '#426981',
    productOwner: '#515e4d',
    scrumFacilitator: '#a69075',
  };
  /** Chip color for a track we ship no copy or palette for. */
  private static readonly UNKNOWN_TRACK_COLOR = '#5a5a5a';
  /**
   * Heading id of each track's own section on the All Certifications page
   * (`all-certifications.page.ts`) — the "Explore" link jumps straight to
   * the matching track section instead of the generic page intro.
   */
  private static readonly TRACK_EXPLORE_FRAGMENT: Record<KnownTrack, string> = {
    scrumMaster: 'all-certs-sm-heading',
    productOwner: 'all-certs-po-heading',
    scrumFacilitator: 'all-certs-sf-heading',
  };
  /** Fragment for a track we ship no dedicated section for — the page intro. */
  private static readonly UNKNOWN_TRACK_EXPLORE_FRAGMENT = 'all-certs-intro-heading';
  /** Generic placeholder used when the backend has no `badgeImageUrl` set. */
  private static readonly FALLBACK_BADGE_IMAGE = '/assets/icons/certificate_budge.svg';

  constructor() {
    // The section renders nothing until the catalogue resolves, so there is no
    // lazier moment to ask for it. `load()` is idempotent and shared.
    void this.catalogStore.load();

    // Tabs only exist once the catalogue resolves, and a reload can drop a
    // track — keep the active tab in range instead of blanking the carousel.
    effect(() => {
      const count = this.levels().length;
      if (count > 0 && this.activeLevelIdx() >= count) this.activeLevelIdx.set(0);
    });
  }

  // -------------------------------------------------------------------------
  // Mobile-only interaction
  // -------------------------------------------------------------------------

  /** Index of the certificate currently shown for `levelId` (defaults to 0). */
  protected cardIdx(levelId: string): number {
    return this.cardIdxByLevel()[levelId] ?? 0;
  }

  /**
   * Moves a level's card window by `delta`, clamped to `[0, total - 1]`.
   * Clamped rather than wrapped: the arrows are hidden at the ends, so a wrap
   * here would only ever be reachable through a stale click.
   */
  protected stepCard(levelId: string, delta: number, total: number): void {
    this.cardDirByLevel.update((map) => ({ ...map, [levelId]: delta < 0 ? -1 : 1 }));
    this.cardIdxByLevel.update((map) => {
      const next = Math.min(Math.max((map[levelId] ?? 0) + delta, 0), Math.max(total - 1, 0));
      return { ...map, [levelId]: next };
    });
  }

  /** Direction of `levelId`'s last card step — drives the entry animation. */
  protected cardDir(levelId: string): 1 | -1 {
    return this.cardDirByLevel()[levelId] ?? 1;
  }

  /**
   * The single card currently visible for a level, as a one-element list so the
   * template can render it through `@for` and get a fresh DOM node (and so a
   * fresh animation) on every step. Empty when the index has no card, which
   * keeps `@for`'s `track cert.id` off an undefined entry.
   */
  protected visibleCards(cards: readonly CertCardData[], idx: number): CertCardData[] {
    const card = cards[idx];
    return card ? [card] : [];
  }

  /** Horizontal start position of an in-flight swipe on the mobile card, if any. */
  private swipeStartX: number | null = null;

  /** Minimum horizontal travel (px) before a touch gesture counts as a swipe. */
  private static readonly SWIPE_THRESHOLD_PX = 40;

  /** Records the touch start X so `onCardTouchEnd` can measure swipe distance. */
  protected onCardTouchStart(event: TouchEvent): void {
    this.swipeStartX = event.touches[0]?.clientX ?? null;
  }

  /**
   * Mobile swipe support for the single-card-at-a-time carousel: a left swipe
   * steps to the next certificate, a right swipe steps back, mirroring what
   * the prev/next arrow buttons already do. `stepCard` clamps at the ends, so
   * a swipe past the last/first card is simply a no-op.
   */
  protected onCardTouchEnd(event: TouchEvent, levelId: string, total: number): void {
    const startX = this.swipeStartX;
    this.swipeStartX = null;
    if (startX === null || total <= 1) return;

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < CertLevelsSection.SWIPE_THRESHOLD_PX) return;

    this.stepCard(levelId, deltaX < 0 ? 1 : -1, total);
  }

  /**
   * Toggles the audience popover. Stops propagation so the document-level
   * dismiss handler doesn't close it in the same click.
   */
  protected toggleAudience(levelId: string, event: Event): void {
    event.stopPropagation();
    this.audienceOpenFor.update((current) => (current === levelId ? null : levelId));
  }

  protected closeAudience(): void {
    if (this.audienceOpenFor() !== null) this.audienceOpenFor.set(null);
  }

  // -------------------------------------------------------------------------
  // Catalogue → view model
  // -------------------------------------------------------------------------

  /** Locale-resolved tier name for a card's chip ("Foundation", "General", …). */
  private tierLabel(level: PublicCertificate['level']): string {
    return this.lang.t(level ? `landing.levels.tiers.${level}` : 'landing.levels.tiers.unknown');
  }

  /**
   * Tabs built from `PublicCatalogStore.items()`, one per distinct `track`.
   * Recognised tracks lead in product order (Scrum Master → Product Owner →
   * Scrum Facilitator) and carry their bespoke marketing copy; unrecognised
   * tracks follow alphabetically with generic copy and their raw backend
   * string as the label, and certificates with no track at all land in a
   * trailing "General" tab so nothing is silently dropped.
   *
   * Empty while the catalogue is loading, errored, or genuinely empty — the
   * template omits the whole section in that case.
   */
  protected readonly levels = computed<CertLevelDef[]>(() => {
    interface TrackGroup {
      id: string;
      /** Lexicographic ordering key: recognised tracks first, then the rest. */
      sortKey: string;
      tabLabel: string;
      known: KnownTrack | null;
      certs: PublicCertificate[];
    }

    const groups = new Map<string, TrackGroup>();

    for (const cert of this.catalogStore.items()) {
      const raw = cert.track?.trim() ?? '';
      const known = raw ? normalizeTrack(raw) : null;
      const id = known ?? (raw ? `track:${raw.toLowerCase()}` : 'track:unassigned');

      let group = groups.get(id);
      if (!group) {
        group = {
          id,
          sortKey: known ? `0${TRACK_ORDER.indexOf(known)}` : `1${raw.toLowerCase() || '￿'}`,
          tabLabel: known
            ? this.lang.t(`landing.levels.tracks.${known}.tabLabel`)
            : raw || this.lang.t('landing.levels.tiers.unknown'),
          known,
          certs: [],
        };
        groups.set(id, group);
      }
      group.certs.push(cert);
    }

    return [...groups.values()]
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((group): CertLevelDef => {
        const copyKey = `landing.levels.tracks.${group.known ?? 'other'}`;
        const badgeColor = group.known
          ? CertLevelsSection.TRACK_BADGE_COLOR[group.known]
          : CertLevelsSection.UNKNOWN_TRACK_COLOR;

        return {
          id: group.id,
          tabLabel: group.tabLabel,
          description: this.lang.t(`${copyKey}.description`),
          explorePath: this.lang.t(`${copyKey}.explorePath`),
          exploreLink: '/certifications',
          // Jumps straight to this track's own section on the All
          // Certifications page (e.g. "Scrum Master Track") instead of
          // landing at the top — the router's anchorScrolling (see
          // app.config.ts) scrolls to it on navigation.
          exploreFragment: group.known
            ? CertLevelsSection.TRACK_EXPLORE_FRAGMENT[group.known]
            : CertLevelsSection.UNKNOWN_TRACK_EXPLORE_FRAGMENT,
          audienceDesc: this.lang.t(`${copyKey}.audienceDesc`),
          certCards: [...group.certs]
            .sort(
              (a, b) =>
                levelRank(a.level) - levelRank(b.level) ||
                a.programCode.localeCompare(b.programCode),
            )
            .map((cert) => ({
              id: cert.id,
              abbreviation: cert.programCode,
              fullName: cert.title,
              // The tab conveys the role, so the chip carries the tier.
              levelBadge: this.tierLabel(cert.level),
              badgeColor,
              badgeImage: cert.badgeImageUrl || CertLevelsSection.FALLBACK_BADGE_IMAGE,
              price: formatPrice(cert.price, cert.currency, this.lang.locale()),
              detailLink: `/certifications/${cert.programCode.toLowerCase()}`,
            })),
        };
      });
  });

  protected selectLevel(idx: number): void {
    this.activeLevelIdx.set(idx);
    this.scrollToLevel(idx);
  }

  protected prevLevel(): void {
    const next = (this.activeLevelIdx() - 1 + this.levels().length) % this.levels().length;
    this.activeLevelIdx.set(next);
    this.scrollToLevel(next);
  }

  protected nextLevel(): void {
    const next = (this.activeLevelIdx() + 1) % this.levels().length;
    this.activeLevelIdx.set(next);
    this.scrollToLevel(next);
  }

  private scrollToLevel(idx: number): void {
    const card = this.carouselTrack()?.nativeElement?.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}
