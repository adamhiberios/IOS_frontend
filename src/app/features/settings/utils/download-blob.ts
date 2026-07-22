/**
 * Trigger a client-side file download for an in-memory {@link Blob}.
 *
 * Creates a temporary object URL, clicks a synthetic anchor, then revokes the
 * URL on the next tick. Kept feature-local (settings only needs it for the GDPR
 * data export); promote to `shared/utils` if another feature needs it.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has been dispatched so the download isn't cancelled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
