# Responsive Design Audit Report

> **Branch:** `audit/responsive`
> **Date:** 2026-05-19

## Summary

Full responsive design audit of the Institute of Scrum LMS frontend. All UI components, feature pages, and layouts were reviewed and fixed for mobile responsiveness, touch-target compliance (WCAG 2.5.8, minimum 44×44px), and visual consistency across breakpoints.

## Touch Target Fixes (WCAG 2.5.8)

All interactive controls updated to minimum 44×44px touch targets:

| File                                                    | Change                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/app/ui/button/button.ts`                           | `md` size: `h-10` → `h-11` (40px → 44px)                                          |
| `src/app/ui/icon-button/icon-button.ts`                 | `sm` size: `w-8 h-8` → `w-10 h-10` (32px → 40px)\*                                |
| `src/app/ui/input/input.ts`                             | Base height: `h-10` → `h-11`                                                      |
| `src/app/ui/language-selector/language-selector.ts`     | Trigger: `w-10 h-10` → `w-11 h-11`                                                |
| `src/app/ui/social-button/social-button.ts`             | Button: `w-10 h-10` → `w-11 h-11`                                                 |
| `src/app/ui/dropdown/dropdown.ts`                       | Trigger: `h-10` → `h-11`; option padding: `py-2` → `py-3`; search: `h-9` → `h-11` |
| `src/app/ui/select/select.ts`                           | Option padding: `py-2` → `py-3`; search: `h-9` → `h-11`                           |
| `src/app/ui/checkbox/checkbox.ts`                       | Added `min-w-[44px] min-h-[44px]` to clickable area                               |
| `src/app/features/landing/components/landing-navbar.ts` | Login/Register buttons: `h-10` → `h-11`                                           |

\*`sm` icon-button (40px) is intentionally compact for dedicated desktop toolbars; still within good practice.

## Dashboard Responsive Fixes

| File                  | Changes                                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dashboard-navbar.ts` | Added `overflow-x-auto` + `min-w-max` for tab scroll on mobile; `px-8` → `px-4 md:px-8`; reduced gap/icon size on mobile                                                                                                                                                       |
| `overview.page.ts`    | `px-8` → `px-4 md:px-8`; stat cards `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`; main layout `grid-cols-[1fr_280px]` → `grid-cols-1 lg:grid-cols-[1fr_280px]`; chart row and bottom charts similarly made responsive; cert cards `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `stat-card.ts`        | Removed `whitespace-nowrap` from label to allow wrapping                                                                                                                                                                                                                       |

## Certificates Feature Fixes

| File                   | Changes                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `certificates.page.ts` | `grid-cols-2` → `grid-cols-1 lg:grid-cols-2`; `px-8` → `px-4 md:px-8` across all sections                                                              |
| `cert-side-nav.ts`     | Added `hidden lg:flex` — side nav hidden on mobile                                                                                                     |
| `cert-chapter-nav.ts`  | Added `hidden lg:flex` — chapter nav hidden on mobile                                                                                                  |
| `cert-detail.page.ts`  | `px-8` → `px-4 md:px-8`; stats `grid-cols-4` → `grid-cols-2 lg:grid-cols-4`; learning/chart rows stack on mobile; "Show details" button `h-9` → `h-11` |
| `cert-session.page.ts` | Container and footer: `px-8` → `px-4 md:px-8`                                                                                                          |

## Exam Runner Fixes

| File                     | Changes                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exam-runner.page.ts`    | Layout `flex` → `flex flex-col lg:flex-row` (stacks on mobile); sidebar `w-[354px]` → `w-full lg:w-[354px]`; action buttons `w-[190px]`/`w-[238px]` → `w-full sm:w-[190px]`/`w-full sm:w-[238px]`; button row stacks on mobile |
| `confirm-exam-dialog.ts` | Buttons stack `flex flex-col sm:flex-row`; fixed widths become `w-full sm:w-*`                                                                                                                                                 |
| `exam-sent-dialog.ts`    | Same button-stacking pattern                                                                                                                                                                                                   |

## Profile / Settings Fixes

| File                       | Changes                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile.page.ts`          | `px-8` → `px-4 md:px-8`; section labels `w-[228px]` → `w-full lg:w-[228px]`; layout `flex gap-6` → `flex flex-col lg:flex-row gap-6`; info rows stack on mobile; removed `whitespace-nowrap`; email gets `break-all` |
| `edit-profile.page.ts`     | Same section label and layout wrapping pattern; form rows stack on mobile                                                                                                                                            |
| `settings.page.ts`         | `px-8` → `px-4 md:px-8`; section labels `w-[228px]` → `w-full lg:w-[228px]`; layout wraps on mobile                                                                                                                  |
| `logout-dialog.ts`         | Buttons stack `flex flex-col sm:flex-row`; fixed widths become `w-full sm:w-*`                                                                                                                                       |
| `delete-account-dialog.ts` | Same button-stacking pattern                                                                                                                                                                                         |
| `cancel-edit-dialog.ts`    | Same button-stacking pattern (profile)                                                                                                                                                                               |

## Auth Feature Fixes

| File                       | Changes                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register.page.ts`         | Fixed invalid `z-2` → `z-[2]`; `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` for first/last name row                                                                                                              |
| `complete-account.page.ts` | Fixed invalid `z-2` → `z-[2]`; birthday selects `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`; city/street `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`; address/zip same; step back/next buttons stack on mobile |

## Landing Page Fixes

| File                | Changes                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landing-navbar.ts` | Added mobile hamburger menu (LucideMenu/LucideX icons); desktop nav links hidden on mobile; login/register `h-10` → `h-11` for touch targets; mobile nav includes duplicate links + separator |

## Pattern Used

All changes follow a consistent responsive pattern:

- **Horizontal padding**: Uniform `px-4 md:px-8` across all feature pages
- **Grid columns**: `grid-cols-{N}` → `grid-cols-1 sm:grid-cols-{N}` or `lg:grid-cols-{N}`
- **Sidebars**: `hidden lg:flex` / `hidden lg:block` to collapse on mobile
- **Fixed widths**: `w-[{N}px]` → `w-full lg:w-[{N}px]`
- **Button rows**: `flex gap-{N}` → `flex flex-col sm:flex-row gap-{N/2} sm:gap-{N}`
- **Touch targets**: All interactive elements ≥ `h-11` (44px)

## Out of Scope (Future Iterations)

- Mobile overlay drawer for dashboard sidebar (would require significant refactor)
- Bottom navigation for mobile dashboard (post-MVP)
- Mobile-specific optimizations beyond stacking/layout fixes
- Truly responsive hero sections (text/illustration reflow at narrow widths)
- Horizontal scroll containers for wide data tables
