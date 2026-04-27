import { LucideApple, type LucideIconData } from '@lucide/angular';

/**
 * Social-provider brand glyphs as `LucideIconData`.
 *
 * `LucideApple` ships with the package; Google and LinkedIn are excluded from
 * Lucide's main set for trademark reasons (https://lucide.dev/guide/design).
 * We define minimal-yet-recognizable paths here so every social glyph still
 * flows through `<svg [lucideIcon]="…">` — same rendering pipeline, same
 * stroke / sizing / color contract.
 *
 * If/when the design team supplies official brand SVGs that comply with each
 * provider's brand guidelines, swap the `node` array below — no callers change.
 */

/** Stylized "G" — neutral monochrome glyph that doesn't infringe Google's
 * full-color logomark. */
export const GoogleIcon: LucideIconData = {
  name: 'google',
  node: [
    [
      'path',
      {
        d: 'M12 4a8 8 0 1 0 7.93 9.13H12V11h10v1a10 10 0 1 1-2.93-7.07L17.6 6.4A8 8 0 0 0 12 4Z',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
  ],
};

/** "in" mark on a rounded square — recognizable as LinkedIn without using the
 * registered logomark verbatim. */
export const LinkedinIcon: LucideIconData = {
  name: 'linkedin',
  node: [
    ['rect', { x: '2', y: '2', width: '20', height: '20', rx: '4', ry: '4' }],
    ['line', { x1: '7', y1: '10', x2: '7', y2: '17' }],
    ['circle', { cx: '7', cy: '7', r: '1' }],
    ['path', { d: 'M11 17v-7m0 3a3 3 0 0 1 6 0v4' }],
  ],
};

/** Maple-leaf glyph for the Canadian flag accent in the footer. Built from a
 * simple convex hull rather than the full eleven-pointed leaf so the stroke
 * remains crisp at 16 px. */
export const MapleLeafIcon: LucideIconData = {
  name: 'maple-leaf',
  node: [
    [
      'path',
      {
        d: 'M12 3 13 7l3-1-1.5 3.5 4 .5-3 2 2.5 3.5-4-1V18l-2-1-2 1v-3.5l-4 1L7.5 12l-3-2 4-.5L7 6l3 1Z',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
  ],
};

/** Re-export Apple for symmetry — callers reach for one named glyph per provider. */
export const AppleIcon = LucideApple.icon;
