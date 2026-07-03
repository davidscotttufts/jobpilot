# Development reference

## Local setup

```bash
git clone https://github.com/suxrobgm/jobpilot.git
cd jobpilot
bun install
bun run db:up    # starts the local PostgreSQL container (Docker)
bun run db:setup # generates the Prisma client, runs migrations, seeds default data
bun run dev      # web :4100 + api :4101 + terminal :4102
```

Open `http://localhost:4100` and toggle the Terminal panel.

### Remote database (SSH tunnel)

To point the API at a remote PostgreSQL, open an SSH tunnel and target it
locally. Set the `SSH_TUNNEL_*` / `REMOTE_DB_*` / `LOCAL_DB_PORT` vars in
[apps/api/.env](../apps/api/.env) (see
[apps/api/.env.example](../apps/api/.env.example)), then:

```bash
bun run db:tunnel   # binds localhost:5433 -> remote db through the SSH host; Ctrl+C to close
```

With the tunnel up, set `DATABASE_URL=postgresql://<user>:<pass>@localhost:5433/<db>`
in [apps/api/.env](../apps/api/.env). `db:setup`, `db:studio`, and the API all
then run against the remote DB. Set `REMOTE_DB_HOST` to `127.0.0.1` when the
database runs on the SSH server itself, or to its private host when tunneling
via a bastion.

## Repository layout

- [apps/web/](../apps/web/) - hosted Next.js dashboard (dev `:4100`).
- [apps/api/](../apps/api/) - hosted Bun + Elysia + Prisma API; owns all state
  (dev `:4101`, Swagger at `/swagger`).
- [apps/terminal/](../apps/terminal/) - .NET host that runs on each user's
  machine and bridges one Claude Code / Codex PTY to the dashboard
  (dev `:4102`).
- [plugin/](../plugin/) - one provider-neutral plugin for both Claude Code and
  Codex: skills, worker subagents, and the Playwright MCP config. No build
  step.
- [packages/](../packages/) - shared Zod contracts and the typed Eden Treaty
  API client.

## Tech stack

| Layer              | Choice                                         |
| ------------------ | ---------------------------------------------- |
| Runtime            | Bun 1.3                                        |
| Web                | Next.js 16 (App Router, RSC, typed routes)     |
| UI                 | MUI 9 + MUI X DataGrid                         |
| Forms              | TanStack Form 1 + Zod v4                       |
| Server state       | TanStack Query 5                               |
| API                | Elysia + Eden Treaty (end-to-end types)        |
| Database           | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| Realtime           | In-process SSE channels                        |
| Terminal host      | .NET 10 ASP.NET Core, ConPTY via Quick.PtyNet  |
| Browser automation | Playwright via the Playwright MCP server       |
