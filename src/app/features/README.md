# Features

Each feature is self-contained and lazy-loaded. Cross-feature imports are forbidden — see CLAUDE.md §5.

```
features/<feature>/
  data-access/    # *.api.ts, *.store.ts, *.dto.ts, *.mappers.ts, *.model.ts, *.ws.ts
  pages/          # smart components (route entry points)
  components/     # feature-local presentational components
  guards/         # canActivate / canMatch
  resolvers/      # route resolvers (rare)
  utils/          # pure helpers scoped to this feature
  <feature>.routes.ts   # exported as default for loadChildren
```

**Communication between features goes through `core/` (DI singletons) or the `AppEventBus`.** If you find yourself reaching for `import { … } from '../<other-feature>'`, stop and route the data through `core/`.
