/**
 * Cross-feature pure validator — canonical implementation lives in `@shared/utils`.
 * This barrel keeps the existing import path stable for the auth pages while
 * disallowing other features from reaching across via deep relative paths.
 */
export { matchFieldsValidator } from '@shared/utils';
