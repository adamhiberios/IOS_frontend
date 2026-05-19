import { type AbstractControl, type ValidatorFn } from '@angular/forms';

/**
 * Group-level validator that confirms two sibling controls hold the same value.
 *
 * Use case: confirm-password matches password. Applied to the parent group so
 * the cross-field constraint stays out of the individual control validators.
 *
 * The validator both:
 *   - returns `{ mismatch: true }` on the group, so consumers can read it via
 *     `form.errors?.mismatch`, and
 *   - sets/clears the same `mismatch` flag on the *match* control so the
 *     control-level `errors` object is also accurate (without clobbering any
 *     other validators that might be applied to that control).
 */
export function matchFieldsValidator(controlName: string, matchControlName: string): ValidatorFn {
  return (group: AbstractControl) => {
    const control = group.get(controlName);
    const matchControl = group.get(matchControlName);
    if (!control || !matchControl) {
      return null;
    }

    if (control.value !== matchControl.value) {
      const merged = { ...(matchControl.errors ?? {}), mismatch: true };
      matchControl.setErrors(merged);
      return { mismatch: true };
    }

    if (matchControl.hasError('mismatch')) {
      const remaining = { ...(matchControl.errors ?? {}) };
      delete remaining['mismatch'];
      matchControl.setErrors(Object.keys(remaining).length > 0 ? remaining : null);
    }
    return null;
  };
}
