import { Directive, ElementRef, SecurityContext, effect, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * `[iosSanitizedHtml]` — renders admin-authored HTML (lesson bodies, blog
 * articles) like `[innerHTML]`, but with its images lazy-loaded.
 *
 * `[innerHTML]` cannot do this: Angular's sanitiser allow-list has no `loading`
 * or `decoding` attribute, so `loading="lazy"` is stripped from authored
 * content, and setting it after render is too late — the browser starts the
 * fetch as soon as the `<img>` is inserted. A lesson built from a Word document
 * with a dozen infographics would download every one of them up front.
 *
 * The content goes through the same `DomSanitizer` (`SecurityContext.HTML`) the
 * binding would use — never bypassed — and is then parsed with `DOMParser`,
 * which builds an inert document (no scripts, no fetches). The only change made
 * is adding `loading`/`decoding` to `<img>` elements, before the nodes are moved
 * into the host.
 */
@Directive({
  selector: '[iosSanitizedHtml]',
})
export class SanitizedHtml {
  readonly iosSanitizedHtml = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    effect(() => {
      const safe = this.sanitizer.sanitize(SecurityContext.HTML, this.iosSanitizedHtml()) ?? '';
      const doc = new DOMParser().parseFromString(safe, 'text/html');

      for (const img of Array.from(doc.body.querySelectorAll('img'))) {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      }

      this.host.nativeElement.replaceChildren(...Array.from(doc.body.childNodes));
    });
  }
}
