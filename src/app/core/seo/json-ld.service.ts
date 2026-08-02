import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** `id` of the single `<script type="application/ld+json">` tag this service owns. */
const SCRIPT_ID = 'ios-json-ld';

/**
 * Injects the backend-computed schema.org JSON-LD (`seo.jsonLd` on the blog
 * article / catalog certificate detail responses — see
 * `StructuredDataService` on the backend) into a single
 * `<script type="application/ld+json">` tag in `<head>`.
 *
 * The app is a plain CSR SPA (no Angular Universal / SSR — see
 * `docs/implementation-progress.md` task 13), so this only helps crawlers
 * that execute JavaScript (Googlebot does); it is not a substitute for
 * server-rendered structured data.
 *
 * One tag, reused across navigations: a detail page calls {@link set} on
 * load and **must** call {@link clear} in `ngOnDestroy` so the tag doesn't
 * linger — describing the wrong page — once the user has navigated away.
 * Never construct the JSON-LD client-side; it must come verbatim from the
 * backend field so Organization identity (name/logo/sameAs, sourced from
 * backend config) stays a single source of truth.
 */
@Injectable({ providedIn: 'root' })
export class JsonLdService {
  private readonly document = inject(DOCUMENT);

  /** Serialize `data` verbatim into the shared JSON-LD `<script>` tag. */
  set(data: Record<string, unknown> | readonly Record<string, unknown>[]): void {
    const script = this.getOrCreateScript();
    script.text = JSON.stringify(data);
  }

  /** Remove the JSON-LD tag, if present. Call from `ngOnDestroy`. */
  clear(): void {
    this.document.getElementById(SCRIPT_ID)?.remove();
  }

  private getOrCreateScript(): HTMLScriptElement {
    const existing = this.document.getElementById(SCRIPT_ID);
    if (existing instanceof HTMLScriptElement) {
      return existing;
    }
    const script = this.document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    this.document.head.appendChild(script);
    return script;
  }
}
