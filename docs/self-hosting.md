# Self-hosting

JobPilot is local-first: SQLite on disk, Next.js bound to `127.0.0.1`,
no auth, no external services beyond the job boards your skills visit.

## Prerequisites

- **Bun 1.3+** (`bun --version`). The Next.js dev server, Prisma CLI, and
  seed scripts all run under Bun.
- **Node 22+** is also installed by default with Bun and is needed for
  one-off Prisma migration commands. (`bunx prisma ...` shells out to
  Node internally.)
- **.NET 10 SDK** for `JobPilot.Terminal`. Skip this if you don't want
  the embedded terminal panel — the web app runs fine on its own.
- **Claude Code** on `PATH` (`claude --version`). Required for both the
  embedded terminal panel and for invoking skills directly from a
  separate Claude Code window.

## One-time setup

```bash
git clone https://github.com/suxrobgm/jobpilot.git
cd jobpilot
bun install                                 # root concurrently launcher
bun --cwd src/web install                   # web deps
bun --cwd src/web run db:migrate:apply      # creates src/web/prisma/dev.db
bun --cwd src/web run db:seed               # seeds default job boards
```

## Running

```bash
bun run dev                                 # web :8000 + JobPilot.Terminal :8001
```

Or run them separately if you want them in their own windows:

```bash
bun --cwd src/web run dev                   # http://127.0.0.1:8000
dotnet run --project src/JobPilot.Terminal  # http://127.0.0.1:8001
```

Keep these running while skills are active. Skills check `/api/health`
at the start of each invocation and stop with a clear error if the web
app is down. The JobPilot.Terminal process is only needed if you want
to drive Claude Code from inside the web UI — skipping it just means
the sidebar's Terminal button shows a connection error.

## Production launch

```bash
bun run build:terminal                      # publishes to dist/terminal/
bun run build:web                           # next build (standalone output)
dist/terminal/JobPilot.Terminal.exe         # in one window
bun --cwd src/web run start                 # in another, http://127.0.0.1:8000
```

First-time visit to `http://127.0.0.1:8000/` redirects to
`/onboarding`, a 5-step wizard that creates the singleton Profile and
AutopilotSettings rows. After that, the dashboard is the home page.

## Profile, boards, credentials, resumes

All four are managed in the web UI. There is no `profile.json` to edit.

- **Profile** at `/profile` — 5 form tabs (Personal, Address, Work auth,
  EEO, Autopilot) plus 2 view tabs (Credentials, Resumes). Save updates
  the `Profile` and `AutopilotSettings` rows in one PUT.
- **Job boards** at `/boards` — search-type vs ATS-type, enabled toggle,
  per-board email/password override.
- **Credentials** under the Profile → Credentials tab — keyed by `scope`
  which is either `default` or a board domain (`linkedin.com`,
  `indeed.com`, …). Skills look up credentials in the order: per-board
  override on the JobBoard row → scope-matched credential → default.
- **Resumes** under Profile → Resumes — multipart PDF upload to
  `src/web/storage/resumes/`. Pick any one as the default; the path
  `data.defaultResumeAbsolutePath` is what skills hand to
  `browser_file_upload`.

## Batch queue

The apply-batch skill no longer reads a text file. URLs go in via
`/batch` (paste a list, or `POST /api/batch` with
`{"urls": ["...", "..."]}`). The skill calls `/api/batch/pending` to
pull the next chunk and PATCHes each entry to `consumed` when applied.

## Backups

The whole database is one file: `src/web/prisma/dev.db`. Copy it for a
backup. Resume PDFs live alongside in `src/web/storage/resumes/`. Together
those two paths are the entire local state.

## Resetting

- **Drop the database**: `bunx prisma migrate reset --schema ./prisma/schema --skip-seed` (then re-run `bun db:seed`).
- **Drop just resumes**: `rm -rf src/web/storage/resumes/*` and clear `Resume`
  rows in the UI.
- **Drop the singleton profile to re-onboard**: delete the row in Prisma
  Studio (`bun db:studio`).

## Permissions

`.claude/settings.json` allows `Bash(curl:*)`, `Bash(jq:*)`, `Bash(date:*)`
explicitly, plus `Bash(*)` as a catch-all and the Playwright MCP
namespaces. Skills issue curl, jq, and date commands; everything else is
Playwright MCP. There are no permissions for outbound HTTP except to
`127.0.0.1:8000` (skills only call localhost endpoints).

## What lives where

| Path | Owner |
|---|---|
| `src/web/prisma/dev.db` | All persistent state. |
| `src/web/storage/resumes/*.pdf` | Uploaded resumes. |
| `src/web/prisma/schema/*.prisma` | Database schema (split per domain). |
| `src/web/src/app/api/**/route.ts` | API endpoints. |
| `src/web/src/app/**/page.tsx` | Pages (RSC). |
| `src/web/src/components/features/<domain>/` | Domain-specific React components. |
| `src/web/src/components/ui/{data,display,feedback,form,layout}/` | UI primitives. |
| `skills/<name>/SKILL.md` | Claude Code skill prompts. |
| `skills/_shared/*.md` | Shared instructions referenced by skills. |
| `skills/humanizer/` | Cover-letter humanizer (git submodule). |

## Troubleshooting

**`curl: (7) Failed to connect to 127.0.0.1 port 8000`** — the web app
isn't running. `cd src/web && bun dev`.

**`ERR_DLOPEN_FAILED` from Prisma** — better-sqlite3 doesn't load under
Bun on Windows. JobPilot uses `@prisma/adapter-libsql` instead — re-run
`bun install` if your `node_modules` is stale.

**Profile redirect loop** — if `/profile` keeps bouncing to
`/onboarding`, the singleton Profile row is missing. Open
`bun db:studio`, confirm the `Profile` table has at least one row with
`id = 1`. Otherwise complete the onboarding wizard.

**Live viewer not updating** — the SSE broker is in-process. If you
have multiple Bun servers running on different ports, only the one
processing `POST /api/runs/[id]/jobs` will publish events. Run a single
dev server.
