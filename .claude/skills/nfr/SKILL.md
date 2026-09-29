---
name: nfr
description: Non-functional-requirements checklist for a JobPilot change before merge - the verify gate, per-user data isolation, terminal-token and secret handling, deployed-agent compatibility, migration safety, performance, terminal-host cross-platform behavior, and UX/a11y. Use before merging or when asked for an "NFR check" or "pre-merge checklist".
---

# Non-functional requirements (JobPilot)

A final pre-merge checklist. Confirm each item or mark it N/A with a reason.

## Gates
- [ ] `verify` green: `bun run ci` (warnings fail), API + web typechecks, API + contracts tests,
      and `dotnet test tests/JobPilot.Terminal.Tests` when `apps/terminal/` or `tests/` changed
- [ ] No `biome check --write --unsafe`; no `as any` / `@ts-ignore` added

## Data isolation & auth
- [ ] Every new query and mutation scoped by `userId`; by-id access via `findOwned` (404, no
      existence leak); list filters in SQL
- [ ] Every new route behind `authGuard`, with the same role/verified checks as its siblings;
      no user id trusted from body or query
- [ ] Terminal token and credentials absent from logs, responses, SSE frames, the pilot journal,
      and PTY output; skills send the token only as `Authorization: Bearer` to `$JOBPILOT_API`
- [ ] Invariants the agent could break (caps, dedupe, claims, resume truthfulness) enforced
      server-side

## API contracts & deployed agents
- [ ] Request shapes in `@jobpilot/contracts`; routes follow `add-api-route`
- [ ] `response` schema models the service return exactly (Elysia strips the rest); dates `z.date()`
- [ ] No removed/renamed/retyped field or endpoint that a released plugin skill still calls - or
      the removal is sequenced after a `release`
- [ ] Every plugin skill that calls a changed endpoint is updated (`git grep` the path in `plugin/`)
- [ ] Web talks to the API over HTTP only; public routes excluded in `proxy.ts`

## Data & migrations
- [ ] Schema change made via `db-migrate`; `bun run db:backup` taken before apply
- [ ] Migration SQL read; renames hand-edited to `ALTER` so data survives; data migration instead
      of read-compat code
- [ ] Retries and crashed pilot cycles are idempotent - no duplicate rows, no job stuck `applying`

## Performance & resilience
- [ ] Growing lists paginate via `@jobpilot/contracts/pagination`; no N+1 Prisma queries
- [ ] Endpoints the agent calls in loops carry a `rateLimit(policy)`
- [ ] Nothing heavy added to `pilot/SKILL.md` (re-read every cycle); per-kind procedure lives in
      `pilot/kinds/`

## Terminal host
- [ ] Behavior holds on Windows, macOS, and Linux (paths, shells, PTY, process-tree kill, locks)
      and survives AOT trimming
- [ ] Rebuilt and restarted via `restart-terminal`; `/healthz` responds

## UX & a11y (web changes)
- [ ] MUI theme values only; loading/empty/error states designed; dark-mode parity
- [ ] Keyboard reachable, labeled controls, visible focus (see `grade-ux` for the full rubric)

## Process
- [ ] Plugin or host changed -> ship note for `release` (host + plugin versions move together)
- [ ] Tests added for new behavior; API tests import the module directly (no DB, no env)
- [ ] Comments explain only the non-obvious why; no IIFEs, compat shims, or nested ternaries

**If any unchecked item isn't a justified N/A, the change is not ready for merge.**
Next: `code-review` for the deep pass.
