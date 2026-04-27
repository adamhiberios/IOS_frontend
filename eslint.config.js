// @ts-check
/**
 * IOS LMS — ESLint flat config (ESLint 9+).
 *
 * Goal: enforce as many CLAUDE.md §4 banned-patterns and §5 conventions as
 * lint can express. The rules below break into three groups:
 *
 *   1. Project-wide TypeScript hygiene
 *   2. Angular component & template hygiene (selectors, OnPush, control flow)
 *   3. Hard bans on libraries / APIs the project has decided against
 *
 * Anything lint cannot express (perf budgets, CSP, IndexedDB scope, RBAC) lives
 * in CI and code review per /docs/05 and /docs/06.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  // ---------------------------------------------------------------------------
  // 1. TypeScript files
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      prettier,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // CLAUDE.md §3, §5 — every component selector is `ios-*`.
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ios', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ios', style: 'camelCase' },
      ],

      // CLAUDE.md §3 — OnPush everywhere.
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',

      // CLAUDE.md §3 — standalone-only.
      '@angular-eslint/prefer-standalone': 'error',

      // Angular 21 best practices that reinforce CLAUDE.md.
      '@angular-eslint/prefer-signals': 'warn',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-async-lifecycle-method': 'error',

      // CLAUDE.md §4 — no `any` without explicit `// FIXME(any):` justification.
      // We escalate the warning to error; the FIXME exception is a code-review
      // concern, not a lint exception.
      '@typescript-eslint/no-explicit-any': 'error',

      // Forbid imports of UI libraries that CLAUDE.md §3, §4 ban.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/material', '@angular/material/*'],
              message:
                'CLAUDE.md §4: Angular Material is banned — build the primitive in src/app/ui/.',
            },
            {
              group: ['primeng', 'primeng/*'],
              message:
                'CLAUDE.md §4: PrimeNG is banned — build the primitive in src/app/ui/.',
            },
            {
              group: ['ng-zorro-antd', 'ng-zorro-antd/*'],
              message:
                'CLAUDE.md §4: NG-Zorro is banned — build the primitive in src/app/ui/.',
            },
            {
              group: ['@ngrx/*', '@datorama/akita', '@ngxs/*'],
              message:
                'CLAUDE.md §3: state management is Signals + injectable services — NgRx/Akita/NGXS are banned.',
            },
            {
              group: ['../../features/*', '../features/*', '@features/*'],
              importNames: ['*'],
              message:
                'CLAUDE.md §5: cross-feature imports are forbidden. Route the data through core/ or the AppEventBus.',
              // The `@features/*` alias still resolves so app.routes.ts can
              // call `loadChildren` — those imports use dynamic `import()`,
              // which this rule does not match.
            },
          ],
        },
      ],

      // CLAUDE.md §4 — no localStorage / sessionStorage for tokens / PII /
      // exam answers. We can't detect *intent* in lint, so we ban the APIs
      // outright and require an architect-reviewed exception (see /docs/06 §2.7).
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'CLAUDE.md §4: localStorage is banned. Tokens live in memory, refresh in httpOnly cookie, exam drafts in IndexedDB. Architect ADR required for any exception.',
        },
        {
          name: 'sessionStorage',
          message:
            'CLAUDE.md §4: sessionStorage is banned for the same reasons as localStorage.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: 'CLAUDE.md §4: localStorage is banned (see styles guide).',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: 'CLAUDE.md §4: sessionStorage is banned (see styles guide).',
        },
      ],

      // CLAUDE.md §4 — bypassSecurityTrust* requires architect ADR; flag every
      // call site so reviewers can't miss it.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^bypassSecurityTrust(Html|Style|Script|Url|ResourceUrl)$/]",
          message:
            'CLAUDE.md §4: bypassSecurityTrust* requires an architect-reviewed ADR. Sanitise content via DomSanitizer allow-lists instead.',
        },
        {
          // Catches `setInterval(...)` for the exam timer specifically;
          // the rule blanket-bans setInterval and we whitelist via override
          // in core/ if a legitimate need arises.
          selector: "CallExpression[callee.name='setInterval']",
          message:
            'CLAUDE.md §4: setInterval is forbidden for the exam timer — read serverTick() from the exam WebSocket. If you have a legitimate non-timer use, add an inline override comment with reviewer signoff.',
        },
      ],

      // Style hygiene — keep diffs small and intent obvious.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ---------------------------------------------------------------------------
  // 2. Angular component templates (.html with the angular template parser)
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // CLAUDE.md §4 — banned: *ngIf, *ngFor, *ngSwitch, ngClass, ngStyle.
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'warn',
      '@angular-eslint/template/use-track-by-function': 'off',
      // The track-by-function rule doesn't apply to @for which already requires
      // `track`. We rely on prefer-control-flow above to push everyone off *ngFor.

      // Accessibility — CLAUDE.md §9, target axe ≥ 95 with zero serious issues.
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/elements-content': 'error',

      // Catch hardcoded `outline: none` without a focus-visible replacement —
      // requires inline-style scanning, lint can't fully cover this; CSS lint
      // would. Leave as documentation here; flag in code review.
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Ignored paths
  // ---------------------------------------------------------------------------
  {
    ignores: [
      'dist/**',
      '.angular/**',
      'node_modules/**',
      'coverage/**',
      'public/**',
      '*.config.js',
      'eslint.config.js',
    ],
  },
);
