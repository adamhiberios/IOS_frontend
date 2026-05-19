import { type AbstractControl, type ValidatorFn } from '@angular/forms';

/**
 * Detailed error shape produced by {@link strongPasswordValidator}.
 *
 * The validator returns `null` (valid) or `{ strongPassword: StrongPasswordErrors }`
 * with one or more boolean / object flags set. Templates can read this shape to
 * render granular hints (e.g. "needs an uppercase letter", "needs ≥ 8 chars").
 *
 * EPIC 3 — backend isn't ready yet, so the strength rules are owned by the
 * client. When the auth API ships its real password policy endpoint, mirror
 * those rules here so the UX hint and the server contract stay aligned.
 */
export interface StrongPasswordErrors {
  /** Set when the password is shorter than {@link STRONG_PASSWORD_MIN_LENGTH}. */
  readonly minLength?: { readonly required: number; readonly actual: number };
  readonly missingUppercase?: true;
  readonly missingLowercase?: true;
  readonly missingDigit?: true;
  readonly missingSpecial?: true;
}

export const STRONG_PASSWORD_MIN_LENGTH = 8;

const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const DIGIT = /[0-9]/;
// Common ASCII specials. Intentionally narrow — extending the alphabet later
// is safe; widening rules is harder to validate against the real backend
// policy when it lands.
const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

/**
 * Validator that enforces:
 *   - minimum length of {@link STRONG_PASSWORD_MIN_LENGTH}
 *   - at least one uppercase, lowercase, digit, and special character
 *
 * Empty values are treated as valid (let `Validators.required` own that
 * concern); callers are expected to compose this with `Validators.required`
 * when the field is mandatory.
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const raw = control.value as unknown;
    if (typeof raw !== 'string' || raw.length === 0) {
      return null;
    }

    // Build mutably; the public {@link StrongPasswordErrors} contract is
    // readonly so consumers can't be tempted to mutate the validator output.
    const errors: {
      -readonly [K in keyof StrongPasswordErrors]: StrongPasswordErrors[K];
    } = {};
    if (raw.length < STRONG_PASSWORD_MIN_LENGTH) {
      errors.minLength = {
        required: STRONG_PASSWORD_MIN_LENGTH,
        actual: raw.length,
      };
    }
    if (!UPPERCASE.test(raw)) {
      errors.missingUppercase = true;
    }
    if (!LOWERCASE.test(raw)) {
      errors.missingLowercase = true;
    }
    if (!DIGIT.test(raw)) {
      errors.missingDigit = true;
    }
    if (!SPECIAL.test(raw)) {
      errors.missingSpecial = true;
    }

    return Object.keys(errors).length > 0
      ? { strongPassword: errors as StrongPasswordErrors }
      : null;
  };
}
