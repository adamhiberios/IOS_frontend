/**
 * Normalisation for admin-authored lesson HTML.
 *
 * Lesson bodies are written in the admin curriculum editor, and in practice the
 * content is pasted in from Word or Google Docs. That paste carries two
 * artefacts that Angular's sanitiser has no reason to remove, because neither is
 * a security concern — they are a layout concern:
 *
 * 1. **Non-breaking spaces.** Word joins runs of words with U+00A0. The browser
 *    treats such a run as one unbreakable token, so a whole clause becomes a
 *    single "word" far wider than the column. Nothing can wrap it at a space,
 *    because as far as layout is concerned there are no spaces.
 * 2. **Layout-hostile inline styles**, chiefly `white-space: nowrap` and fixed
 *    pixel widths on tables and cells, plus the legacy `width`/`height`
 *    presentational attributes.
 *
 * Together these forced the lesson wider than its column and put a horizontal
 * scrollbar on the whole page (IDD-261).
 *
 * Normalising here — rather than overriding in CSS — keeps the stylesheet free
 * of `!important` and blanket selectors, and means the renderer only ever deals
 * with well-formed prose. It matters for wrapping specifically: `overflow-wrap:
 * break-word` is harmless on text with real spaces, but on an nbsp-joined run it
 * has no legal break point and splits mid-word instead ("The pla / n still
 * matters"). Replacing the spaces removes the cause; the CSS stays gentle.
 *
 * Parsing is done with `DOMParser`, which builds an inert document — scripts do
 * not run and resources are not fetched. The result still goes through Angular's
 * sanitiser at the `[innerHTML]` binding, so this narrows what reaches the DOM
 * and never widens it.
 */

/**
 * Inline style declarations dropped from authored content. Everything else an
 * author sets (colour, alignment, emphasis) is left alone — only declarations
 * that can force an element outside its column are removed.
 */
const LAYOUT_STYLE_PROPS = [
  'white-space',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
] as const;

/**
 * Legacy presentational sizing attributes, still emitted by office suites for
 * table geometry. Left in place on media, where they carry the intrinsic aspect
 * ratio the browser uses to reserve space.
 */
const SIZED_TABLE_PARTS = 'table[width], table[height], td[width], th[width], col[width]';

/**
 * Strips the paste artefacts described above. Returns the HTML unchanged when
 * there is nothing to normalise, and returns `null` for absent content so the
 * caller's "no content" branch still works.
 */
export function normalizeLessonHtml(html: string | null): string | null {
  if (html === null || html.trim() === '') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  // Non-breaking spaces → ordinary spaces, so the text has real break points.
  // Applied wholesale: a deliberate nbsp is rare in authored lesson prose,
  // whereas Word emits them throughout, and an unwrappable line is the worse
  // outcome of the two.
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.nodeValue;
    if (text !== null && text.includes('\u00A0')) {
      node.nodeValue = text.replace(/\u00A0/g, ' ');
    }
  }

  for (const el of Array.from(body.querySelectorAll<HTMLElement>('[style]'))) {
    for (const prop of LAYOUT_STYLE_PROPS) el.style.removeProperty(prop);
    // An element whose only declarations were layout ones is left with an empty
    // style attribute; drop it rather than leave the noise in the DOM.
    if (el.getAttribute('style')?.trim() === '') el.removeAttribute('style');
  }

  for (const el of Array.from(body.querySelectorAll(SIZED_TABLE_PARTS))) {
    el.removeAttribute('width');
    el.removeAttribute('height');
  }

  return body.innerHTML;
}
