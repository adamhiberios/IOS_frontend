import { type AbstractControl, type ValidationErrors, type ValidatorFn } from '@angular/forms';

/**
 * `local@domain.tld` — a dot-separated domain ending in an alphabetic TLD of
 * two or more letters. Deliberately simple: it exists to reject *incomplete*
 * input, not to police RFC 5322 edge cases (the backend stays authoritative).
 */
const COMPLETE_EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[a-z]{2,}$/i;

/**
 * Validator for a *complete* email address.
 *
 * Angular's `Validators.email` follows the HTML spec, which accepts
 * `user@host` with no TLD — so a gate built on it opens one keystroke after
 * the `@` (IDD-267). Compose this with `Validators.email` to also require a
 * dotted domain and a TLD before the value counts as valid.
 *
 * Empty values are treated as valid (let `Validators.required` own that
 * concern).
 */
export function completeEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value as unknown;
    if (typeof raw !== 'string' || raw.length === 0) {
      return null;
    }
    return COMPLETE_EMAIL.test(raw.trim()) ? null : { completeEmail: true };
  };
}
