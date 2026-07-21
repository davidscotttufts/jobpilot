---
paths:
  - "apps/web/**"
---

# Web conventions (`apps/web`)

Commands (`bun --cwd=apps/web run …`): `typecheck` (the only type gate - `next build` never
type-checks via `typescript.ignoreBuildErrors`), `typegen` (Next route/type generation).

## Files & components

- Kebab-case filenames (`auth-card.tsx`); named exports (default only for `page.tsx`/`layout.tsx`).
- RSC by default: never `"use client"` in pages or layouts - extract interactivity into
  `src/components/features/`.
- Props: `interface <Name>Props` (not `type`); destructure in the body, not in parameters.
- Conditional render: `cond && <X />`, not `cond ? <X /> : null`. A component that can render
  nothing returns `ReactNode` and early-returns `null` (never `ReactElement` + `return <></>`);
  one that always renders keeps `ReactElement`.
- React 19: `use()` for async data in client components. Never `useCallback`/`useMemo`/`memo` -
  the compiler handles it. Pass `ref` as a regular prop; no `forwardRef`.
- Never key lists by array index. Key by the model's `id` (resume rows all carry one -
  `backfillResumeIds` assigns it server-side); for a controlled list whose model has no id, use
  `useKeyedList` (`@/hooks/use-keyed-list`).
- `@/` maps to `src/`. Zod from `zod/v4`. Forms are TanStack Form + Zod validators.

## Routing / auth

`src/proxy.ts` (Next 16 middleware) gates routes by auth and role. **A new public route must be
added to its `config.matcher` exclusions (and `app/public-routes.ts`) or it 307-redirects to
`/login`** - the build still succeeds, so the bug only shows at runtime. Dot-paths
(`robots.txt`) are already excluded by `.*\..*`.

Cross-origin auth works because web and API are same-site: the httpOnly cookie rides
`credentials: "include"` + CORS (`CORS_ORIGINS`). SSE/`EventSource` also connects straight to
the API (base URL from `src/api/base-url.ts`).

## MUI

- Barrel imports only (`import { Button } from "@mui/material"`), never deep imports.
- Theme values only: semantic colors (`"primary.main"`, `"background.paper"`,
  `"text.secondary"`, `"divider"` - they carry dark mode), numeric spacing (`p: 2` = 16px),
  typography variants (`variant="h4"`) - never hex values, pixel strings, or manual
  `fontSize`/`fontWeight`.
- `sx` for one-off styling; extract a component when repeated. No inline `style={{ }}`, no
  `styled-components`/`styled()`, no raw `<div>`/`<span>` for layout - use `Box`, `Stack`,
  `Typography`.
- `Stack` rejects layout props like `flexWrap`/`alignItems` - put them in `sx`.

## The two TypeScript compilers (do not "clean this up")

TypeScript 7 is the Go-native compiler and ships **no JS compiler API** (returns in 7.1). Next
needs that API in `build/load-jsconfig.js` to read tsconfig `paths` - without it Next silently
drops every `@/…` alias and `next build` dies with module-not-found. So `apps/web` declares both:

- `typescript` (6.x) - the JS API for Next, and `tsserver` for the editor. Never imported by our
  code.
- `@typescript/native` (alias of `typescript@7`) - the real compiler.

Both packages declare a `tsc` bin and bun links the 6.x one, so `typecheck` calls the v7 binary
**by explicit path**.
