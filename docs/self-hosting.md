# Self-hosting

JobPilot is local-first: SQLite on disk, Next.js bound to `127.0.0.1`,
no auth, no external services beyond the job boards your skills visit.
JobPilot.Terminal launches `claude` against its own bundled
[.claude/skills/](../src/JobPilot.Terminal/.claude/skills/) and
[.mcp.json](../src/JobPilot.Terminal/.mcp.json), so the skills are
scoped to the JobPilot session.

## Prerequisites

- **Bun 1.3+** — runs the Next.js dev server, Prisma CLI, seed scripts.
- **Node 22+** — needed for `bunx prisma ...` (shells out to Node).
- **.NET 10 SDK** — required for JobPilot.Terminal.
- **Claude Code** on `PATH` (`claude --version`) — spawned by
  JobPilot.Terminal as the PTY child.

## One-time setup

```bash
git clone https://github.com/suxrobgm/jobpilot.git
cd jobpilot
bun install
bun --cwd src/web install
bun --cwd src/web run db:migrate:apply   # creates src/web/prisma/dev.db
bun --cwd src/web run db:seed            # seeds default job boards
```

## Running

```bash
bun run dev                                 # web :8000 + terminal :8001
```

Or run them separately:

```bash
bun --cwd src/web run dev                   # http://127.0.0.1:8000
dotnet run --project src/JobPilot.Terminal  # http://127.0.0.1:8001
```

JobPilot.Terminal must run from `src/JobPilot.Terminal/` (which is
what `dotnet run --project` does) so the spawned `claude` inherits the
bundled `.claude/skills/` and `.mcp.json`. Skills check `/api/health`
and stop with a clear error if the web app is down.

First visit to `http://127.0.0.1:8000/` redirects to `/onboarding`, a
5-step wizard that creates the singleton Profile and AutopilotSettings
rows.

## Production launch

```bash
bun run build:terminal                      # publishes to dist/terminal/
bun run build:web                           # next build (standalone)
dist/terminal/JobPilot.Terminal.exe         # window 1
bun --cwd src/web run start                 # window 2, http://127.0.0.1:8000
```

When publishing the terminal, copy `.claude/` and `.mcp.json` next to
the executable so its working directory still contains the skills and
MCP config.

## Profile, boards, credentials, resumes

All managed in the web UI:

- **Profile** at `/profile` — 5 form tabs (Personal, Address, Work auth,
  EEO, Autopilot) plus 2 view tabs (Credentials, Resumes).
- **Job boards** at `/boards` — search vs ATS, enabled toggle, per-board
  email/password override.
- **Credentials** under Profile → Credentials — keyed by `scope`
  (`default` or a board domain). Lookup order: per-board override →
  scope-matched → default.
- **Resumes** under Profile → Resumes — multipart PDF upload to
  `src/web/storage/resumes/`. The chosen default's path is what skills
  hand to `browser_file_upload`.

## Batch queue

URLs go in via `/batch` (paste a list, or `POST /api/batch` with
`{"urls": [...]}`). The apply-batch skill calls `/api/batch/pending`
to pull the next chunk and PATCHes each entry to `consumed` when
applied.

## Backups

Two paths hold all local state:

- `src/web/prisma/dev.db` — the entire database.
- `src/web/storage/resumes/` — uploaded PDFs.

## Resetting

- **Drop the database**: `bunx prisma migrate reset --schema ./prisma/schema --skip-seed` then re-run `bun db:seed`.
- **Drop just resumes**: `rm -rf src/web/storage/resumes/*` and clear
  `Resume` rows in the UI.
- **Drop the singleton profile to re-onboard**: delete the row in
  Prisma Studio (`bun db:studio`).

## Permissions

`src/JobPilot.Terminal/.claude/settings.json` allows `Bash(curl:*)`,
`Bash(jq:*)`, `Bash(date:*)`, `Bash(*)`, the Playwright MCP namespaces
(`mcp__playwright-jobpilot__*`), and the `Skill(...)` invocations the
apply / autopilot / cover-letter / upwork-proposal / humanizer skills
use to chain into each other. Skills only call `127.0.0.1:8000`.

## File map

| Path                                                                        | Owner                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/web/prisma/dev.db`                                                     | All persistent state.                             |
| `src/web/storage/resumes/*.pdf`                                             | Uploaded resumes.                                 |
| `src/web/prisma/schema/*.prisma`                                            | Database schema (split per domain).               |
| `src/web/src/app/api/**/route.ts`                                           | API endpoints.                                    |
| `src/web/src/app/**/page.tsx`                                               | Pages (RSC).                                      |
| `src/web/src/components/features/<domain>/`                                 | Domain-specific React components.                 |
| `src/JobPilot.Terminal/Program.cs` + `SessionManager.cs` + `TerminalHub.cs` | .NET PTY host (HTTP + WebSocket).                 |
| `src/JobPilot.Terminal/Pty/`                                                | Vendored winpty wrapper (Quick.PtyNet).           |
| `src/JobPilot.Terminal/.claude/settings.json`                               | Claude Code permissions for the embedded session. |
| `src/JobPilot.Terminal/.claude/skills/<name>/SKILL.md`                      | Skill prompts.                                    |
| `src/JobPilot.Terminal/.claude/skills/_shared/*.md`                         | Shared instructions referenced by skills.         |
| `src/JobPilot.Terminal/.mcp.json`                                           | Playwright MCP server config.                     |

## Troubleshooting

**`curl: (7) Failed to connect to 127.0.0.1 port 8000`** — the web app
isn't running. `bun --cwd src/web run dev`.

**`ERR_DLOPEN_FAILED` from Prisma** — better-sqlite3 doesn't load
under Bun on Windows. JobPilot uses `@prisma/adapter-libsql` instead —
re-run `bun install` if `node_modules` is stale.

**Claude doesn't see the JobPilot skills** — JobPilot.Terminal must be
launched from `src/JobPilot.Terminal/` (or have `.claude/` and
`.mcp.json` next to the published executable).

**Profile redirect loop** — `/profile` keeps bouncing to `/onboarding`
when the singleton Profile row is missing. Open `bun db:studio`,
confirm the `Profile` table has a row with `id = 1`, otherwise
complete the onboarding wizard.

**Live viewer not updating** — the SSE broker is in-process. If
multiple Bun servers are running on different ports, only the one
processing `POST /api/runs/[id]/jobs` will publish events. Run a
single dev server.
