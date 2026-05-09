# JobPilot

A local-first AI job-application app. A Next.js + SQLite web UI owns all
state and embeds an interactive Claude Code session that runs the JobPilot
plugin skills against real job boards via Playwright.

## Components

- **Web app** ([src/web/](src/web/)) - `http://localhost:8000`. Owns
  profile, credentials, resumes, job boards, applications, runs, and the
  batch queue. It embeds an xterm.js terminal panel and exposes "Run
  autopilot" / "Run apply-batch" buttons that inject slash commands.
- **JobPilot.Terminal** ([src/JobPilot.Terminal/](src/JobPilot.Terminal/)) -
  `http://localhost:8001`. .NET 10 ASP.NET Core process that owns the
  `claude` PTY (winpty) and bridges it to the web UI over WebSocket. It
  launches Claude Code with `--plugin-dir src/jobpilot-claude-plugin`.
- **Claude Code plugin**
  ([src/jobpilot-claude-plugin/](src/jobpilot-claude-plugin/)) - reusable
  JobPilot plugin containing the skills and Playwright MCP config. It can be
  run through the web terminal or directly with
  `claude --plugin-dir src/jobpilot-claude-plugin`.

## Quick Start

```bash
git clone https://github.com/suxrobgm/jobpilot.git
cd jobpilot
bun install
bun --cwd src/web run db:migrate:apply
bun --cwd src/web run db:seed

bun run dev   # web :8000 + terminal :8001
```

Open `http://localhost:8000` and toggle the Terminal panel.

## Skills

Skills are markdown prompts under
[src/jobpilot-claude-plugin/skills/](src/jobpilot-claude-plugin/skills/).
Run them as `/jobpilot:<skill>`, for example:

```text
/jobpilot:autopilot senior typescript remote
```

| Skill             | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `apply`           | Auto-fill a single application after fit review and dedupe check.    |
| `apply-batch`     | Score queued URLs from `/batch`, batch-approve, and apply to all.    |
| `autopilot`       | Search enabled boards, score, batch-approve, and apply autonomously. |
| `search`          | Search boards and rank results without applying.                     |
| `cover-letter`    | Draft a tailored cover letter and run it through the humanizer.      |
| `upwork-proposal` | Draft a tailored Upwork proposal.                                    |
| `interview`       | Prepare behavioral, technical, and company-research interview notes. |

## Documentation

- [docs/architecture.md](docs/architecture.md) - architecture walk-through.
- [docs/self-hosting.md](docs/self-hosting.md) - operations and configuration.
- [CLAUDE.md](CLAUDE.md) - contributor and agent context.

## Tech Stack

| Layer              | Choice                                         |
| ------------------ | ---------------------------------------------- |
| Runtime            | Bun 1.3                                        |
| Framework          | Next.js 16 (App Router, RSC, typed routes)     |
| UI                 | MUI 9 + MUI X DataGrid                         |
| Forms              | TanStack Form 1 + Zod v4                       |
| Server state       | TanStack Query 5                               |
| Database           | SQLite via Prisma 7 + `@prisma/adapter-libsql` |
| Terminal host      | .NET 10 ASP.NET Core, winpty via Quick.PtyNet  |
| Browser automation | Playwright via the Playwright MCP server       |

## License

MIT. The bundled humanizer skill at
[src/jobpilot-claude-plugin/skills/humanizer/](src/jobpilot-claude-plugin/skills/humanizer/)
ships with its own LICENSE file.
