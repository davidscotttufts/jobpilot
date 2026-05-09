# JobPilot

A Claude Code plugin for AI-driven job applications, paired with a local
Next.js + SQLite web app that owns all of the state and a small .NET
companion process that hosts an interactive Claude Code session inside
the web UI.

- **Skills** (Claude Code) do the work: scrape job boards, score postings
  against your resume, fill in applications via Playwright, write cover
  letters and interview prep, etc.
- **Web app** (`src/web/`) at `http://127.0.0.1:8000` owns all data: profile,
  credentials, resumes, job boards, applications with stage funnel, runs
  with SSE-driven live progress, batch URL queue. It also embeds a Claude
  Code terminal panel and exposes "Run autopilot" / "Run apply-batch"
  buttons that inject slash commands directly into that session.
- **JobPilot.Terminal** (`src/JobPilot.Terminal/`) at `http://127.0.0.1:8001`
  is a .NET 10 ASP.NET Core process that owns the `claude` PTY (winpty)
  and bridges it to the web UI's xterm.js panel over WebSocket.
- **Skills talk to the web app over HTTP** (`curl`), not the filesystem.
  No more `profile.json`, `applied-jobs.json`, `runs/*.json`, or shell
  scripts.

## Quick start

```bash
# 1. Install (one-time)
git clone https://github.com/suxrobgm/jobpilot.git
cd jobpilot
bun install    # install all dependencies

# Initialize the SQLite database and seed default job boards
cd src/web
bun run db:migrate:apply      # creates the SQLite database
bun run db:seed               # seeds default job boards

cd ../..  # back to root

# 2. Start everything (web + JobPilot.Terminal in one command)
bun run dev  # web on :8000, terminal on :8001
```

If you prefer to run skills from a separate Claude Code window, you
can: the web app continues to function as before. The embedded terminal
panel is optional (the Terminal toggle in the sidebar shows it).

## Skills

| Slash command | Purpose | Inject button |
|---|---|---|
| `/jobpilot:apply <url>` | Auto-fill a single application after a fit review and dedupe check. | — |
| `/jobpilot:apply-batch` | Pull URLs from `/api/batch/pending`, score against your resume, get one-click batch approval, apply to all. | `/batch` page |
| `/jobpilot:autopilot <query>` | Search every enabled board, score, batch-approve, apply autonomously. Live viewer at `/runs/<id>`. | `/runs` page |
| `/jobpilot:search <query>` | Search boards and rank results without applying. | — |
| `/jobpilot:cover-letter <description>` | Tailored cover letter, run through the humanizer. | — |
| `/jobpilot:upwork-proposal <job>` | Tailored Upwork proposal. | — |
| `/jobpilot:interview <description>` | Behavioral / technical / company-research interview prep. | — |

## Web app

A local Next.js dashboard at `http://127.0.0.1:8000` that owns every
persistent fact: profile, resumes, credentials, job boards, applied jobs
with stage funnel, autopilot/batch runs, and the URL queue. It's where
you configure JobPilot, watch runs progress live over SSE, and review
your application history. Skills read and write everything through its
HTTP API.

## Documentation

See [docs/architecture.md](docs/architecture.md) for the architecture
walk-through and [docs/self-hosting.md](docs/self-hosting.md) for the
operations + configuration runbook. Convention rules live in
[CLAUDE.md](CLAUDE.md).

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Bun 1.3 |
| Framework | Next.js 16 (App Router, RSC, typed routes) |
| UI | MUI 9, themed (`src/web/src/theme/`); MUI X DataGrid for tables; emotion via `AppRouterCacheProvider` |
| Forms | TanStack Form 1 + Zod v4 (shared between API validators and form validators) |
| Server state | TanStack Query 5 with structured `queryKeys` |
| Database | SQLite via Prisma 7 modern client + `@prisma/adapter-libsql` (Bun-compatible on Windows) |
| Browser automation | Playwright via the Claude Code Playwright MCP |

## License

MIT. The Humanizer submodule has its own license — see `skills/humanizer/`.
