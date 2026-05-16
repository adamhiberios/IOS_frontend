// Layouts — shell components composed at route level.
// app-shell  -> authenticated routes (header, sidebar, main outlet, footer).
// auth-shell -> unauthenticated routes (login, register, password reset, MFA).
// Layouts are presentational only; auth state is read from core/auth via DI.

export { AuthHeader, AuthFooter } from './auth-shell';
export { DashboardNavbar } from './app-shell/dashboard-navbar';
export { UserMenuDropdown } from './app-shell/user-menu-dropdown';
