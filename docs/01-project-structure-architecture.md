# 01 — Project Structure & Architecture

This document defines the high-level architecture and on-disk structure of the Institute of Scrum LMS frontend. It is binding: every contributor is expected to follow the layout and boundaries described here.

---

## 1. Technology Stack

| Layer                | Choice                                                      | Notes                                                    |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| Framework            | **Angular 19** (latest stable)                              | Standalone components, zoneless where possible           |
| Language             | **TypeScript 5.x**, `strict: true`                          |                                                          |
| Reactivity           | **Signals** (`signal`, `computed`, `effect`, `linkedSignal`) | Primary reactive primitive                               |
| Templates            | Angular templates + new control flow (`@if`, `@for`, `@switch`) | No `*ngIf` / `*ngFor` in new code                    |
| Styling              | **Tailwind CSS 3.x** (JIT)                                  | Design tokens via `tailwind.config.ts`                   |
| Component library    | **Custom** (in-house)                                       | Built on Angular CDK primitives where needed             |
| State                | **Signals + injectable services**                           | See [State Management](./03-state-management.md)         |
| HTTP                 | `HttpClient` + interceptors                                 | See [API Integration](./04-api-integration-data-flow.md) |
| Real-time            | Native `WebSocket` or `rxjs/webSocket`                      | For notifications, exam events                           |
| Internationalization | **Transloco** (JSON-based, runtime switch)                  | EN + AR (RTL)                                            |
| Routing              | Angular Router, **lazy-loaded** feature routes              | Standalone route definitions                             |
| Forms                | **Reactive Forms** (typed forms)                            | No template-driven forms in new code                     |
| Build                | Angular CLI (esbuild application builder)                   | Differential loading disabled (ES2022 baseline)          |
| Rendering            | **Client-Side Rendering (CSR)** only                        | No SSR (decision locked)                                 |

---

## 2. Architectural Principles

1. **Feature-first, then layer.** The folder tree is organized around business features (courses, exams, certifications, insight), not technical layers. Layers (`core`, `shared`, `ui`) exist only to hold cross-cutting concerns.
2. **Standalone everything.** Every component, directive, and pipe is standalone. `NgModule` is not used.
3. **One-way data flow.** Parents pass data down via inputs; children emit events up via outputs. State lives in services, never in singletons imported directly by components.
4. **Lazy by default.** Every feature is lazy-loaded. The initial bundle is reserved for the shell, auth, and the router.
5. **Boundaries enforced by ESLint.** A dependency-cruiser / `@nx/enforce-module-boundaries`-style ESLint rule prevents features from importing each other directly (they go through shared libs or route-level composition).
6. **RTL is a first-class citizen.** Every component is tested in both LTR and RTL. Physical CSS properties (`left`, `right`, `margin-left`) are banned in favor of logical ones (`start`, `end`, `margin-inline-start`) or Tailwind `rtl:` variants.

---

## 3. Workspace Layout

```
institute-of-scrum/
├── docs/                          # This documentation (version-controlled)
├── public/                        # Static assets served as-is (favicon, robots.txt)
├── src/
│   ├── app/
│   │   ├── core/                  # Singletons: guards, interceptors, global services
│   │   ├── shared/                # Reusable, stateless building blocks used across features
│   │   ├── ui/                    # Custom component library (atoms + composites)
│   │   ├── layouts/               # Shell/page layouts (auth-layout, main-layout, admin-layout)
│   │   ├── features/              # Business features (lazy-loaded)
│   │   │   ├── auth/
│   │   │   ├── courses/
│   │   │   ├── enrollments/
│   │   │   ├── assessments/       # Exams, quizzes
│   │   │   ├── certifications/
│   │   │   ├── insight/           # News / updates portal
│   │   │   ├── reporting/         # Learner analytics dashboards
│   │   │   ├── notifications/
│   │   │   └── admin/             # Admin / instructor console routes
│   │   ├── app.config.ts          # Application providers (root)
│   │   ├── app.routes.ts          # Top-level routes (all lazy)
│   │   └── app.component.ts       # Shell (<router-outlet />)
│   ├── assets/
│   │   ├── i18n/                  # Transloco JSON (en.json, ar.json)
│   │   ├── images/
│   │   └── icons/
│   ├── environments/
│   │   ├── environment.ts         # DEV defaults
│   │   ├── environment.test.ts
│   │   ├── environment.uat.ts
│   │   └── environment.prod.ts
│   ├── styles/
│   │   ├── tailwind.css           # @tailwind base/components/utilities
│   │   ├── tokens.css             # CSS custom properties (design tokens)
│   │   └── rtl.css                # RTL-specific utilities
│   ├── index.html
│   └── main.ts                    # bootstrapApplication(AppComponent, appConfig)
├── .eslintrc.cjs
├── .prettierrc
├── .editorconfig
├── angular.json
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

### 3.1 Folder Responsibilities

| Folder      | Contents                                                                                                                    | Rules                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `core/`     | App-wide singletons: HTTP interceptors, route guards, global error handler, logger, config service.                         | Provided once via `providedIn: 'root'` or `app.config.ts`. **Never imported by `features/*`** directly — consumed via DI only.  |
| `shared/`   | Stateless utilities and primitives used by multiple features: pipes, directives, helper functions, constants, types, DTOs. | Must not depend on any feature. Pure, easily testable.                                                                          |
| `ui/`       | **Custom component library** (buttons, inputs, dialogs, tables, cards, tabs). Tailwind-styled, a11y-correct, RTL-safe.      | Stateless presentational components only. No HTTP calls, no feature knowledge.                                                  |
| `layouts/`  | Page shells that compose navigation, sidebars, footers (auth shell, main shell, admin shell).                               | Consume `ui/` + `shared/`. Do not own business state.                                                                           |
| `features/` | One folder per business feature. Each is lazy-loaded and self-contained.                                                    | May depend on `core/`, `shared/`, `ui/`, `layouts/`. **May not import from sibling features** — route-level composition only. |

### 3.2 Feature Folder Template

Every feature under `features/<feature>/` follows the same internal structure:

```
features/courses/
├── courses.routes.ts              # Standalone route definitions for this feature
├── data-access/
│   ├── courses.api.ts             # HTTP calls (REST endpoints)
│   ├── courses.store.ts           # Signals-based store (state + actions)
│   ├── courses.mappers.ts         # DTO <-> domain model transforms
│   └── courses.model.ts           # Domain types
├── pages/                         # Route-level smart components
│   ├── course-list/
│   ├── course-detail/
│   └── course-enroll/
├── components/                    # Feature-local presentational components
│   ├── course-card/
│   ├── course-filter/
│   └── course-progress/
├── guards/                        # Feature-specific route guards (e.g., enrollment required)
├── resolvers/                     # Route resolvers (optional)
└── utils/                         # Feature-scoped helpers
```

Anything reused across features is **moved up** to `shared/` or `ui/`.

---

## 4. Application Bootstrap (`app.config.ts`)

Providers are registered once at the application root. Feature-level providers live inside the feature's route configuration.

```ts
// src/app/app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';

import { appRoutes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { localeInterceptor } from './core/http/locale.interceptor';
import { retryInterceptor } from './core/http/retry.interceptor';
import { translocoConfig } from './core/i18n/transloco.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withViewTransitions(),
    ),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        localeInterceptor,
        retryInterceptor,
        errorInterceptor, // last so it sees the final error
      ]),
    ),
    provideTransloco(translocoConfig),
  ],
};
```

---

## 5. Routing Strategy

### 5.1 Top-level routes — all lazy

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    children: [
      { path: '', loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES) },
      { path: 'courses', loadChildren: () => import('./features/courses/courses.routes').then(m => m.COURSES_ROUTES) },
      { path: 'insight', loadChildren: () => import('./features/insight/insight.routes').then(m => m.INSIGHT_ROUTES) },
    ],
  },
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component')
      .then(m => m.AuthLayoutComponent),
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'learner',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    loadChildren: () => import('./features/enrollments/enrollments.routes').then(m => m.ENROLLMENTS_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin', 'instructor'])],
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', loadComponent: () => import('./features/errors/not-found.component').then(m => m.NotFoundComponent) },
];
```

### 5.2 Conventions

- **All routes are lazy.** Non-lazy routes require architect approval.
- **Preloading**: `withPreloading(PreloadAllModules)` is enabled in production only.
- **Data loading** uses route `resolve` for critical-path data, and in-component `effect()` + store signals for the rest.
- **Route-level providers** are used to scope stores and services to a feature where full isolation is needed (e.g., an exam session).
- **Route data** carries permission requirements (`data: { roles: ['admin'] }`) consumed by `roleGuard`.

---

## 6. High-Level Runtime Architecture

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                           Browser (Angular SPA)                          │
 │                                                                          │
 │  ┌────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐  │
 │  │   UI (ui/)     │ ◄─┤  Pages/Features │ ◄─┤  Feature Stores (sig.)  │  │
 │  │  presentational│   │  smart compos.  │   │  signals + computed     │  │
 │  └────────────────┘   └─────────────────┘   └────────────┬────────────┘  │
 │                                                          │ reads/writes  │
 │  ┌───────────────────────────────────────────────────────▼────────────┐  │
 │  │                      Data-Access Services                          │  │
 │  │       courses.api.ts │ exams.api.ts │ certifications.api.ts        │  │
 │  └───────┬───────────────────────────────────────────┬────────────────┘  │
 │          │ HttpClient (REST + interceptors)          │ WebSocket client  │
 └──────────┼───────────────────────────────────────────┼───────────────────┘
            │                                           │
 ┌──────────▼─────────────┐                 ┌───────────▼──────────────────┐
 │   Backend REST API     │                 │   Real-time Gateway (WS)     │
 │   (auth, CRUD, files)  │                 │   (notifications, exams)     │
 └────────────────────────┘                 └──────────────────────────────┘
```

Interceptors in the HTTP pipeline apply in order:

1. `authInterceptor` — attaches `Authorization: Bearer <accessToken>`
2. `localeInterceptor` — attaches `Accept-Language` and `X-Locale`
3. `retryInterceptor` — transparent retry on 5xx / network errors (idempotent GETs only)
4. `errorInterceptor` — normalizes backend errors into a common `AppError` shape and triggers refresh-token flow on 401

Details are in [API Integration](./04-api-integration-data-flow.md).

---

## 7. Environment Configuration

Angular's classic `environments/` folder is used, with a file per environment mapped to a build configuration in `angular.json`.

```ts
// src/environments/environment.ts  (DEV)
export const environment = {
  name: 'dev',
  production: false,
  apiBaseUrl: 'https://api.dev.ios.example/v1',
  wsBaseUrl: 'wss://api.dev.ios.example/ws',
  authStorage: 'memory',        // never localStorage for tokens
  featureFlags: { proctoring: true, liveClasses: false },
  sentryDsn: '',
} as const;
```

Build configurations map to the SOW-mandated four environments:

| SOW env | `ng build` config | `environment.*.ts` | Deployment               |
| ------- | ----------------- | ------------------ | ------------------------ |
| DEV     | `development`     | `environment.ts`   | Dev CDN / preview        |
| TEST    | `test`            | `environment.test.ts` | Test CDN              |
| UAT     | `uat`             | `environment.uat.ts` | UAT CDN                |
| PROD    | `production`      | `environment.prod.ts` | Production CDN + WAF   |

**Rules**

- No secrets are ever placed in `environment.*.ts`. Only public URLs and non-sensitive flags. Secrets live in the backend or in CI/CD vaults.
- Feature flags are booleans in `environment.*.featureFlags` (simple config-based toggles). Flag evaluation is centralized in `core/config/feature-flag.service.ts`.

---

## 8. Build & Deployment

- **Builder**: `@angular/build:application` (esbuild).
- **Target**: ES2022, modern browsers only (see browser matrix in [Performance, Security & Accessibility](./06-performance-security-accessibility.md)).
- **Output**: `dist/institute-of-scrum/browser/` — static assets to be served by a CDN with `immutable` caching on hashed bundles.
- **Bundle budgets** (set in `angular.json`):
  - Initial bundle: warn `> 300 KB` gzip, error `> 500 KB` gzip
  - Per-route lazy chunk: warn `> 100 KB` gzip
- **Source maps**: hidden in PROD (uploaded to error tracking, not served).

---

## 9. Third-Party Dependency Policy

1. No dependency is added without architect approval. Every new dep requires a brief justification in the PR description covering: bundle cost, maintenance status, RTL support, a11y support, license.
2. Preferred defaults:
   - Date/time: **`date-fns`** (tree-shakeable). Not Moment.
   - Form validation schemas: **`zod`** for DTO validation.
   - Forms helpers: native Angular Reactive Forms only.
   - Icons: **Lucide** (tree-shakeable SVG components) — no icon fonts.
   - Internationalization: **Transloco**.
   - WebSocket: **`rxjs/webSocket`** (built-in).
3. Component libraries (Material, PrimeNG, Spartan/Shadcn, etc.) are **not** approved for this project. If a complex primitive is required, consume **Angular CDK** only.

---

## 10. Architecture Decision Records (ADRs)

Significant architectural decisions are captured as short ADRs in `docs/adr/NNN-title.md`. The first ADRs to write during kickoff:

1. `001-angular-19-standalone-signals.md`
2. `002-no-ssr.md`
3. `003-tailwind-only-no-component-library.md`
4. `004-signals-services-no-ngrx.md`
5. `005-single-app-feature-folders.md`
6. `006-bilingual-en-ar-rtl.md`
7. `007-jwt-refresh-rbac.md`
8. `008-rest-plus-websockets.md`

ADRs are append-only. Superseded ADRs are marked `Status: Superseded by NNN` rather than deleted.
