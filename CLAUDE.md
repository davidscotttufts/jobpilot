# JobPilot - Claude Code Plugin

## What This Is

JobPilot 2.0 is a Claude Code plugin for AI-driven job applications, paired
with a local Next.js + SQLite web app at `http://localhost:8000` that owns all
persistent state. The reusable Claude Code plugin lives at
`src/jobpilot-claude-plugin/`; the web app is real TypeScript code under
`src/web/`. A companion .NET process, **JobPilot.Terminal** at
`src/JobPilot.Terminal/` (port 8001), hosts the Claude Code PTY so the web UI
can embed an interactive terminal and inject slash commands.

## Architecture

- **Claude Code plugin** in `src/jobpilot-claude-plugin/` owns
  `.claude-plugin/plugin.json`, `.mcp.json`, and `skills/<name>/SKILL.md`.
  Its namespace is `jobpilot`, so skills run as `/jobpilot:<skill>`.
- **Shared instructions** in `src/jobpilot-claude-plugin/skills/_shared/`
  (setup, auth, form-filling, browser-tips) are referenced by skills to avoid
  duplication.
- **Web app** in `src/web/` is the data + UI layer: Bun + Next.js 16 + MUI 9
  + Prisma 7 + TanStack Query/Form + Zod v4. SQLite database at
  `src/web/prisma/dev.db`; uploaded resumes at `src/web/storage/resumes/`.
- **JobPilot.Terminal** in `src/JobPilot.Terminal/` is a .NET 10 ASP.NET Core
  minimal API. It owns the `claude` PTY, starts Claude Code with
  `--plugin-dir src/jobpilot-claude-plugin`, and exposes `/ws`,
  `/sessions/start`, `/sessions/inject`, `/sessions/current`, and `/healthz`.
- **Skills talk to the web app over HTTP.** They do not own persistence.
  Every skill calls `GET /api/health` first; if the app is down it stops with
  a clear message.
- **Humanizer** is vendored at
  `src/jobpilot-claude-plugin/skills/humanizer/`, invoked by `cover-letter`
  and `upwork-proposal`.

## Key Patterns

- Skills reference shared files with: `Read and follow the instructions in ${CLAUDE_PLUGIN_ROOT}/skills/_shared/<file>.md`.
- `_shared/setup.md` is the single source of truth for loading profile,
  resume, and credentials.
- Skills set `JOBPILOT_API=http://localhost:8000` and issue
  `curl -fsS "$JOBPILOT_API/api/..."` calls. Mutations go through `POST`,
  `PATCH`, or `DELETE` against the same API.
- Credential lookup order: board-specific (`JobBoard.email`/`.password`
  override), then scope-matched (`Credential.scope === <domain>`), then
  `Credential.scope === "default"`.
- Job boards are rows in the `JobBoard` table with `type: "search"` or
  `type: "ats"`. Users add boards through `/boards`; skills iterate over
  whatever `/api/job-boards` returns.
- Skills proactively log in before searching/applying.
- Previously applied jobs are matched by exact URL and fuzzy normalized
  title+company over a 30-day window via `GET /api/applied/check`.
- After every successful application, skills `POST /api/applied`. After every
  state change in an autopilot/apply-batch run, they
  `PATCH /api/runs/[id]/jobs/[jobKey]` and `PATCH /api/runs/[id]` so the live
  viewer reflects reality.

## Conventions

- Skill files use imperative instructions directed at Claude.
- Browser automation uses `browser_snapshot` (accessibility tree), not
  screenshots.
- For token overflow from large pages, use targeted `browser_snapshot` with
  the `ref` parameter.
- Cover letters chain through `/jobpilot:cover-letter`, which invokes the
  humanizer.
- Plugin manifest is in `src/jobpilot-claude-plugin/.claude-plugin/plugin.json`
  (currently `2.0.0`).
- MCP config is in `src/jobpilot-claude-plugin/.mcp.json`.
- Project permissions are in root `.claude/settings.json`.

## File Inventory

| Path                                                                        | Purpose                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/jobpilot-claude-plugin/.claude-plugin/plugin.json`                     | Plugin manifest (name, version, author).                                |
| `src/jobpilot-claude-plugin/.mcp.json`                                      | Playwright MCP server config.                                           |
| `src/jobpilot-claude-plugin/skills/_shared/*.md`                            | Shared instructions (setup, auth, form-filling, browser-tips).          |
| `src/jobpilot-claude-plugin/skills/*/SKILL.md`                              | Individual skill prompts.                                               |
| `.claude/settings.json`                                                     | Claude Code project permissions.                                        |
| `CLAUDE.md`                                                                 | This file: architecture summary + frontend conventions.                 |
| `AGENTS.md`                                                                 | Thin pointer back to `CLAUDE.md` for agent sessions.                    |
| `README.md`                                                                 | User-facing intro + quick start.                                        |
| `docs/architecture.md`                                                      | Deeper architecture walk-through.                                       |
| `docs/self-hosting.md`                                                      | Operations + configuration runbook.                                     |
| `JobPilot.slnx`                                                             | Solution file referencing the C# terminal project.                      |
| `package.json`                                                              | Root scripts (`bun run dev` runs terminal + web together).              |
| `src/JobPilot.Terminal/`                                                    | .NET terminal: Program.cs, SessionManager, TerminalHub, PTY code.       |
| `src/web/prisma/schema/*.prisma`                                            | Multi-file Prisma schema (one file per domain).                         |
| `src/web/prisma/dev.db`                                                     | SQLite database (gitignored).                                           |
| `src/web/storage/resumes/*.pdf`                                             | Uploaded resumes (gitignored).                                          |
| `src/web/src/app/api/**/route.ts`                                           | API endpoints.                                                          |
| `src/web/src/app/**/page.tsx`                                               | Pages (RSC).                                                            |
| `src/web/src/components/features/<domain>/`                                 | Domain-specific React components.                                       |
| `src/web/src/components/features/terminal/`                                 | xterm.js terminal panel + WS client.                                    |
| `src/web/src/components/features/batch/batch-run-button.tsx`                | Injects `/jobpilot:apply-batch` into the embedded terminal.             |
| `src/web/src/components/features/runs/autopilot-run-button.tsx`             | Injects `/jobpilot:autopilot <query>` into the embedded terminal.       |
| `src/web/src/providers/terminal-provider.tsx`                               | Open/toggle state + `inject(command)` helper used by the buttons above. |
| `src/web/src/components/ui/{data,display,feedback,form,layout}/`            | UI primitives.                                                          |
| `src/web/src/lib/db.ts`                                                     | Prisma client singleton (libSQL adapter).                               |
| `src/web/src/lib/terminal.ts`                                               | Terminal HTTP client (`startSession`, `injectCommand`, `killSession`).  |
| `src/web/src/lib/sse.ts`                                                    | In-process SSE broker.                                                  |
| `src/web/src/lib/matching.ts`                                               | Jaro-Winkler fuzzy duplicate detection.                                 |
| `src/web/src/lib/schemas/*.ts`                                              | Zod schemas (shared by API + form validators).                          |
| `src/web/src/lib/api/query-keys.ts`                                         | Structured TanStack Query keys.                                         |
| `src/web/src/types/api/*.ts`                                                | DTOs returned by API endpoints.                                         |

## Frontend Conventions

Apply to all code under `src/web/src/`.

### File Naming

- **Kebab-case** for all files: `app-shell.tsx`, `use-auth.ts`, `auth-card.tsx`
- No PascalCase filenames

### Exports

- **Named exports** for all components, hooks, providers: `export function Sidebar()`
- **Default exports** only for Next.js pages and layouts (`page.tsx`, `layout.tsx`)

### Server Components by Default

- **Never** add `"use client"` to `page.tsx` or `layout.tsx` files. Pages and layouts must be React Server Components.
- Extract interactive logic (hooks, state, event handlers) into `"use client"` feature components under `src/components/features/`.

### Component Props

Use `interface` (not `type`) for prop shapes. `type` is fine for unions, utilities, and domain values; `interface` is required for `<Name>Props`:

```typescript
// CORRECT
interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

// WRONG
type SidebarProps = { open: boolean; onToggle: () => void };
```

Destructure props inside the function body, not in parameters:

```typescript
// CORRECT
function Sidebar(props: SidebarProps): ReactElement {
  const { open, onToggle } = props;
}

// WRONG
function Sidebar({ open, onToggle }: SidebarProps): ReactElement {}
```

### Conditional Rendering

Prefer `&&` over a ternary when the false branch is `null`:

```tsx
// CORRECT
{
  description && <Typography variant="body2Muted">{description}</Typography>;
}

// WRONG
{
  description ? <Typography variant="body2Muted">{description}</Typography> : null;
}
```

### MUI Imports

Use consolidated barrel imports, never deep imports:

```typescript
// CORRECT
import { Alert, Button, TextField } from "@mui/material";
// WRONG
import Alert from "@mui/material/Alert";
```

### Path Aliases

`tsconfig.json` uses `"@/*": ["./src/*"]`. Imports use `@/` without `src/`:

```typescript
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api/client";
```

### Zod v4

Import from `zod/v4`:

```typescript
import { z } from "zod/v4";
```

### Forms

Use TanStack Form with Zod validators:

```typescript
const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onSubmit: loginSchema },
  onSubmit: async ({ value }) => { ... },
});
```

### React 19

- Use `use()` hook for async data in client components instead of `useEffect` + `useState`. Avoids React compiler `set-state-in-effect` warnings.
- **Never** use `useCallback`, `useMemo`, or `memo`; the React 19 compiler handles memoization automatically.
