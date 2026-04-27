/**
 * Nominal-typing helper. Use to mint distinct ID types that the compiler
 * won't accept interchangeably with each other or with raw strings:
 *
 *   export type UserId = Branded<string, 'UserId'>;
 *   export type CourseId = Branded<string, 'CourseId'>;
 *
 * Crossing boundaries (DTO → model) is the right place to attach the brand;
 * see /docs/04 §4 on mappers.
 */
declare const __brand: unique symbol;

export type Branded<T, B> = T & { readonly [__brand]: B };
