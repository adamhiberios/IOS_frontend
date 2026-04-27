/**
 * Shared layer — cross-feature pure utilities, pipes, directives, and types.
 * MUST be free of state, side effects, and feature-specific knowledge.
 * Anything stateful belongs in core/, anything feature-specific stays inside features/<feature>/.
 */

export * from './utils';
export * from './types';
