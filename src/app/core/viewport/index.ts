/**
 * Viewport layer — root singleton exposing breakpoint state as signals.
 *
 * Only for layouts whose *structure* differs across breakpoints. Purely visual
 * differences belong in Tailwind responsive variants.
 */
export { ViewportService } from './viewport';
