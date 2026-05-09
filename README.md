# JobPilot

A local-first AI job-application app. A Next.js + SQLite web UI owns
all state and embeds an interactive Claude Code session that runs the
JobPilot skills (apply, autopilot, search, cover letter, …) against
real job boards via Playwright.

## Components

- **Web app** ([src/web/](src/web/)) — `http://127.0.0.1:8000`. Owns
  profile, credentials, resumes, job boards, applications, runs, batch
  queue. Embeds an xterm.js terminal panel and exposes "Run autopilot" /
  "Run apply-batch" buttons that inject slash commands into the session.
- **JobPilot.Terminal** ([src/JobPilot.Terminal/](src/JobPilot.Terminal/))
  — `http://127.0.0.1:8001`. .NET 10 ASP.NET Core process that owns the
  `claude` PTY (winpty) and bridges it to the web UI over WebSocket. Its
  working directory holds [.claude/skills/](src/JobPilot.Terminal/.claude/skills/)
  and [.mcp.json](src/JobPilot.Terminal/.mcp.json), so the spawned
  `claude` auto-loads the JobPilot skills and the Playwright MCP server.
- **Skills** — markdown prompts under
  [src/JobPilot.Terminal/.claude/skills/](src/JobPilot.Terminal/.claude/skills/).
  They drive Playwright, score postings against your resume, fill
  forms, and call the web app over HTTP (`curl`).

## Quick start

```bash
git clone https://github.com/suxrobgm/jobpilot.git
cd jobpilot
bun install
bun --cwd src/web run db:migrate:apply
bun --cwd src/web run db:seed

bun run dev   # web :8000 + terminal :8001
```

Open `http://127.0.0.1:8000` and toggle the Terminal panel.

## Skills

| Skill             | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `apply`           | Auto-fill a single application after fit review and dedupe check.         |
| `apply-batch`     | Score the queued URLs from `/batch`, batch-approve, apply to all.         |
| `autopilot`       | Search every enabled board, score, batch-approve, apply autonomously.     |
| `search`          | Search boards and rank results without applying.                          |
| `cover-letter`    | Tailored cover letter, run through the humanizer.                         |
| `upwork-proposal` | Tailored Upwork proposal.                                                 |
| `interview`       | Behavioral / technical / company-research interview prep.                 |

## Documentation

- [docs/architecture.md](docs/architecture.md) — architecture walk-through.
- [docs/self-hosting.md](docs/self-hosting.md) — operations + configuration.
- [CLAUDE.md](CLAUDE.md) — coding conventions.

## Tech stack

| Layer              | Choice                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| Runtime            | Bun 1.3                                                                   |
| Framework          | Next.js 16 (App Router, RSC, typed routes)                                |
| UI                 | MUI 9 + MUI X DataGrid                                                    |
| Forms              | TanStack Form 1 + Zod v4                                                  |
| Server state       | TanStack Query 5                                                          |
| Database           | SQLite via Prisma 7 + `@prisma/adapter-libsql`                            |
| Terminal host      | .NET 10 ASP.NET Core, winpty via Quick.PtyNet                             |
| Browser automation | Playwright via the Playwright MCP server                                  |

## License

MIT. The bundled humanizer skill at
[src/JobPilot.Terminal/.claude/skills/humanizer/](src/JobPilot.Terminal/.claude/skills/humanizer/)
ships with its own LICENSE file.
