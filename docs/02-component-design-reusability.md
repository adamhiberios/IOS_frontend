# 02 — Component Design & Reusability

This document defines how we design, compose, and reuse components. The goal is a small, well-tested set of primitives that every feature composes from — so design consistency, accessibility, and RTL correctness are solved once, not per screen.

---

## 1. Guiding Principles

1. **Composition over configuration.** Small components that do one thing well are combined to build complex UIs, rather than one mega-component with a huge `@Input()` surface.
2. **Presentational by default.** Components in `ui/` and `shared/` never call HTTP, never read global state, and do not know about features. They render what they are given and emit what the user does.
3. **Stateless where possible, local state where necessary.** Local UI state (open/closed, focused, hovered) lives in the component. Business state lives in feature stores ([03 — State Management](./03-state-management.md)).
4. **Accessibility is non-negotiable.** A component is not "done" until it's keyboard-navigable, focus-visible, labelled, announced correctly, and passes contrast. See [06 — Performance, Security & Accessibility](./06-performance-security-accessibility.md).
5. **RTL-safe by construction.** Every component is reviewed in both LTR (English) and RTL (Arabic). Physical directions (`left`/`right`) are banned in favor of logical directions (`start`/`end`).
6. **OnPush + Signals.** All components use `ChangeDetectionStrategy.OnPush`. Inputs are signal inputs. Outputs are typed.

---

## 2. Component Taxonomy

We use a four-tier taxonomy, scoped by location:

| Tier          | Location                          | Examples                                                          | State allowed?                     |
| ------------- | --------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| **Primitive** | `src/app/ui/`                     | `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Avatar`, `Tooltip`, `Icon`, `Spinner` | Local UI only                      |
| **Composite** | `src/app/ui/`                     | `Dialog`, `Dropdown`, `Tabs`, `Accordion`, `DataTable`, `Pagination`, `Stepper`, `Toast`, `EmptyState` | Local UI only                      |
| **Layout**    | `src/app/layouts/`                | `MainLayout`, `AuthLayout`, `AdminLayout`, `Sidebar`, `TopNav`, `Footer`, `Breadcrumb` | Reads auth/user signals  |
| **Feature**   | `src/app/features/<feature>/components/` | `CourseCard`, `LessonPlayer`, `ExamTimer`, `CertificatePreview`    | Reads feature store                |

Only **Feature** components may consume feature stores. Primitives and Composites must be portable enough to drop into a Storybook or a marketing site with no dependencies other than `ui/` itself.

---

## 3. Folder Convention for a Component

Every non-trivial component lives in its own folder:

```
ui/button/
├── button.component.ts       # Template inline if <40 lines; else button.component.html
├── button.component.scss     # Optional — prefer Tailwind; use SCSS only for complex states
├── button.types.ts           # Public types (variants, sizes, props)
└── index.ts                  # Public barrel export
```

Trivial single-file components (e.g., a Badge) may keep everything in a single `badge.component.ts`.

---

## 4. Component API Rules

### 4.1 Inputs

- Use **signal inputs**: `readonly foo = input<string>('default')`.
- Use `input.required<T>()` for required inputs — it fails fast at runtime.
- Never mutate inputs inside the component.
- Group related config into a single object input only when there are 4+ related props.

### 4.2 Outputs

- Use the new `output<T>()` API: `readonly selected = output<Course>()`.
- Name events as **past-tense verbs**: `selected`, `submitted`, `dismissed`, `pageChanged`.
- Avoid `change` — too generic. Prefer `valueChanged`, `selectionChanged`.

### 4.3 Models (two-way binding)

- Use `model<T>()` for two-way bindings on primitives that own editable state (inputs, checkboxes, switches).
- Every `model()` must have a sensible default.

### 4.4 Example primitive

```ts
// src/app/ui/button/button.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'ios-button',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() || null"
      [ngClass]="classes()"
    >
      @if (loading()) {
        <ios-spinner class="me-2" size="sm" aria-hidden="true" />
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);

  readonly pressed = output<MouseEvent>();

  readonly classes = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };
    const variants: Record<ButtonVariant, string> = {
      primary:   'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-400',
      tertiary:  'bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-400',
      ghost:     'bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-300',
      danger:    'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
    };
    return [base, sizes[this.size()], variants[this.variant()], this.fullWidth() ? 'w-full' : ''].join(' ');
  });
}
```

Notice:
- No global state, no HTTP, no feature knowledge.
- `aria-busy` announced while loading; disabled while loading.
- `me-2` (margin-inline-end) instead of `mr-2` — RTL-safe.
- Uses an `ios-` prefix (see [Engineering Guidelines §3.2](./05-engineering-guidelines.md#3-naming-conventions)).

---

## 5. Smart vs Presentational

We use the **container/presentational** split, but leniently:

- **Presentational (dumb) components** — `ui/`, `shared/`, and most of `features/*/components/`. Receive inputs, emit outputs. No injection of services beyond pure utilities (translation, `Router` for `routerLink` only).
- **Smart (container) components** — almost always route-level `pages/*`. They inject feature stores and services, wire data into presentational children, and handle side effects.

This boundary keeps the presentational layer storybook-able and future-proofed for a later design-system extraction.

---

## 6. Design System & Tokens

All design decisions (color, spacing, radius, shadow, typography) live as **CSS custom properties** in `src/styles/tokens.css`, then surfaced in Tailwind via `tailwind.config.ts`. Components consume tokens only via Tailwind classes — never hardcoded hex values.

```css
/* src/styles/tokens.css */
:root {
  /* Brand */
  --color-brand-50:  #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;

  /* Neutral */
  --color-neutral-50:  #f8fafc;
  --color-neutral-900: #0f172a;

  /* Semantic */
  --color-success-600: #16a34a;
  --color-warning-600: #d97706;
  --color-danger-600:  #dc2626;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* Spacing scale is Tailwind's default (4-px base). */

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-arabic: 'Cairo', 'Noto Sans Arabic', system-ui, sans-serif;
}

html[dir='rtl'] { font-family: var(--font-arabic), var(--font-sans); }
```

```ts
// tailwind.config.ts (excerpt)
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand:   { 50: 'var(--color-brand-50)', 500: 'var(--color-brand-500)', 600: 'var(--color-brand-600)', 700: 'var(--color-brand-700)' },
        neutral: { 50: 'var(--color-neutral-50)', 900: 'var(--color-neutral-900)' },
        success: { 600: 'var(--color-success-600)' },
        warning: { 600: 'var(--color-warning-600)' },
        danger:  { 600: 'var(--color-danger-600)' },
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
      fontFamily: { sans: 'var(--font-sans)', arabic: 'var(--font-arabic)' },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-rtl'), // enables `rtl:` / `ltr:` variants
  ],
} satisfies Config;
```

**Hard rules**

1. No hex codes in templates or component styles. Only Tailwind color utilities mapped to tokens.
2. No arbitrary `style=""` attributes in templates. Use classes.
3. Raw pixel values are allowed only via Tailwind's scale (`w-6`, `p-4`, etc.). No `w-[123px]` without architect approval.

---

## 7. RTL & Bilingual (EN / AR) Handling

Arabic support is a day-one requirement. Every component must be RTL-correct.

**Do**

- Use logical CSS: `ms-*` (margin-inline-start), `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s`, `border-e`.
- Use the `rtl:` / `ltr:` Tailwind variants from `tailwindcss-rtl` when a class genuinely differs by direction (e.g., icon rotation).
- Mirror directional icons (chevrons, arrows) in RTL: `rtl:rotate-180` or a dedicated `<ios-icon>` with a `directional` input.
- Set `dir="auto"` on user-generated-content containers so mixed-direction text renders correctly within an Arabic page.
- Use Transloco for all strings: `{{ 'courses.title' | transloco }}`.

**Don't**

- Use `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right` in production code. (An ESLint rule will enforce this.)
- Hardcode English strings in templates.
- Flip the entire page with `transform: scaleX(-1)` — it breaks text, numbers, and icons.

**Locale switching**

A single `LocaleService` (in `core/i18n/`) manages:

- Current locale signal (`readonly locale = signal<'en' | 'ar'>('en')`).
- `document.documentElement.dir` set to `'rtl' | 'ltr'`.
- `document.documentElement.lang` set to `'en' | 'ar'`.
- Transloco active language.
- User preference persisted to backend (auth'd users) and `cookie` (guests — `SameSite=Lax`).

No component reads locale directly — they react to the signal.

---

## 8. State Coupling Rules

- **Primitives & Composites (`ui/`)**: zero state knowledge. Zero `inject()` of feature services.
- **Shared utilities (`shared/`)**: may `inject()` cross-cutting services (Router, LocaleService) but never feature stores.
- **Layouts**: may `inject()` the `AuthService` signal-store and `LocaleService`.
- **Feature components**: may `inject()` their own feature store, plus `core/` and `shared/`.
- **Pages (route components)**: compose feature components, inject stores, handle side effects.

A component that needs "someone else's" state is a sign the boundary is wrong — open an architecture discussion before bypassing.

---

## 9. Forms

- Every form uses **typed Reactive Forms**.
- Every form field uses a `ios-form-field` wrapper (in `ui/`) that renders the label, control, error, and help text with correct `aria-describedby` wiring.
- Validators are composed from:
  - Angular's built-in validators (`required`, `email`, `minLength`).
  - A shared `Validators` utility in `shared/forms/validators.ts` for project-specific rules.
  - A `zodValidator(schema)` helper for complex cross-field validation, reusing the same Zod schemas that validate API payloads.

```ts
this.form = this.fb.group({
  email: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.email] }),
  password: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.minLength(8)] }),
});
```

Error messages are looked up by validator key from the translation bundle, not hardcoded.

---

## 10. Reusability Strategy

1. **Extract on third use.** A component/utility that is copy-pasted twice stays in the feature. On the third need, it is moved to `shared/` or `ui/` (architect review on the PR).
2. **Public API discipline.** Every `ui/` module exports only what is public via a barrel (`index.ts`). Deep imports (`ui/button/button.component`) are forbidden.
3. **Documentation per component.** Every `ui/` component has a `README.md` next to it describing props, events, slots, a11y notes, and an RTL screenshot pair. (Storybook may be introduced later; until then, the README is the spec.)
4. **Deprecation policy.** Breaking changes to a shared/ui component require a deprecation cycle: add the new API, mark the old `@deprecated` with a migration note, remove after two releases.

---

## 11. Performance Considerations for Components

- **`ChangeDetectionStrategy.OnPush` everywhere.** Combined with Signals, this gives near-zero unnecessary re-renders.
- **`trackBy` / `@for … track`** required on every list. Never omit tracking.
- **Lazy-load heavy composites** (rich-text editor, chart, video player) via `@defer` blocks with `@placeholder` skeletons.
- **`loading="lazy"`** on all `<img>` below the fold; `decoding="async"`.
- **Virtualize** any list with potentially 100+ items using `@angular/cdk/scrolling`.
- **Signals first**, RxJS second. Use RxJS only where multiple async streams combine (debounced search, WebSockets, long-running effects), and expose the result as a signal via `toSignal()`.

---

## 12. Example: Building a Feature Screen from Primitives

A typical course list page composes like this:

```
CourseListPage (smart, feature/courses/pages/course-list)
├─ ios-page-header             (ui)
│   └─ ios-breadcrumb          (ui)
├─ CourseFilters               (feature component)
│   ├─ ios-input                (ui)
│   ├─ ios-select               (ui)
│   └─ ios-button               (ui)
├─ CourseGrid                  (feature component)
│   └─ CourseCard (x N)        (feature component)
│       ├─ ios-badge            (ui)
│       ├─ ios-avatar           (ui)
│       └─ ios-button            (ui)
└─ ios-pagination              (ui)
```

The smart page:

- Injects `CoursesStore`.
- Reads signals (`courses`, `filters`, `pagination`) and passes them down as inputs.
- Listens to child outputs and calls store methods.
- Renders loading / empty / error states using `@if` and the shared `ios-empty-state` / `ios-error-state` / `ios-skeleton` composites.
