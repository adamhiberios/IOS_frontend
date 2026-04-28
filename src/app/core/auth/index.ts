/**
 * Public surface of `core/auth/`.
 *
 * Feature folders import from this barrel only — never reach into individual
 * files. Internals (mock backend, helpers) intentionally stay private.
 */

export { AuthStore, type SubmitState } from './auth.store';
export { authGuard, publicOnlyGuard } from './auth.guard';
export { roleGuard, type AppRole } from './role.guard';
export { HasRoleDirective } from './has-role.directive';
export type {
  AuthSession,
  LoginCredentials,
  LogoutReason,
  RegisterPayload,
  Role,
  User,
} from './auth.model';
