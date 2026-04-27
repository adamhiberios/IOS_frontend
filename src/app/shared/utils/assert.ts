/**
 * Runtime invariant. Throws a descriptive error if the condition is false.
 * Use for "this should never happen" cases that TypeScript can't narrow on
 * its own — e.g. a route param that should always be present.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Exhaustiveness check. Place in the `default:` arm of a switch on a
 * discriminated union so the compiler complains when a new variant is added
 * but unhandled.
 */
export function assertNever(value: never, context = 'unhandled variant'): never {
  throw new Error(`${context}: ${JSON.stringify(value)}`);
}
