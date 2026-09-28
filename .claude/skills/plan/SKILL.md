---
name: plan
description: Structured planning mode for JobPilot - discovers the existing surface (API modules, contracts, web routes and hooks, plugin skills, terminal host) before proposing a change, classifies it (web-only / api+contracts / plugin-skill / terminal-host / cross-cutting), and produces a phased implementation plan with explicit migration, compatibility, release, and verify checkpoints. Use for "plan X", "how should we build X", or before any multi-file change.
argument-hint: "[what to build or change]"
---

# Planning Mode (JobPilot)

You are now in **Structured Planning Mode** for: $ARGUMENTS

**Audience:** the JobPilot monorepo - `apps/web` (Next.js 16 + MUI 9, HTTP-only to the API),
`apps/api` (Elysia + Prisma 7, owner of all state), `packages/contracts` (Zod) and
`packages/api-client` (Eden), `plugin/` (provider-neutral skills that curl the API from each
user's local agent), and `apps/terminal` (.NET 10 PTY host on each user's machine).

---

## Scope Rule (read first)

Do **not** unilaterally cut scope. Phasing is a delivery technique, not a scope hatch. Call a
phase boundary only at a real gate: a Prisma migration (backup first), a `release` that must
ship new plugin skills before an API shape can change, a terminal-host rebuild, or the `verify`
gate. "It's a lot of work" is not a gate. The right output for a large proposal is a complete
impact inventory + a delivery plan.

---

## Phase 0: Classify the change

| Lane | What it covers | Required checkpoints |
|---|---|---|
| **Web-only** | UI inside `apps/web` using existing endpoints | `.claude/rules/web.md`; `verify`; optional `grade-ux` on the touched area |
| **API + contracts** | New/changed route, service, schema, or Prisma model | `add-api-route`; `db-migrate` (backup first) if the schema changes; response schema exact; `verify` |
| **Plugin-skill** | A `plugin/skills/*`, `_shared/*.md`, `pilot/kinds/*`, or `agents/*` change | `.claude/rules/plugin.md`; ships to users only via `release` |
| **Terminal-host** | C# under `apps/terminal` | `dotnet test`; `restart-terminal`; cross-platform check; ships via `release` |
| **Cross-cutting** | Spans two or more lanes (an endpoint a skill calls, a host endpoint the web drives, auth/token flow) | All lanes' checkpoints + a compatibility and ship-order plan |

Output a one-line **Lane Verdict** before Phase 1. If unsure, default to Cross-cutting and name
the ambiguity. Never treat an endpoint change as API-only when a plugin skill calls it.

---

## Phase 1: Discovery

Explore before proposing. Use Glob, Grep, Read, and the `Explore` agent for breadth.

### 1.1 Existing surface
- `CLAUDE.md` and the matching `.claude/rules/*.md`.
- `docs/ARCHITECTURE-REVIEW.md` and `docs/roadmap/` - was this already decided or proposed?
- API: which `apps/api/src/modules/<name>/` owns the concept? Existing contracts in
  `packages/contracts`?
- Web: which route under `apps/web/src/app/` and which hooks in `apps/web/src/api/`?
- Plugin: which skills call the affected endpoints? `git grep -n "/api/<path>" plugin/`.
- Host: does the change touch `/sessions/*`, `/ws`, the pilot orchestrator, or token injection?

### 1.2 Files that will be affected
- **API:** controller, service, `<name>.schema.ts`, `app.ts` mount, `prisma/schema/*.prisma`,
  migration SQL, colocated `*.test.ts`.
- **Contracts:** `packages/contracts/src/...` + its tests.
- **Web:** route/page, `src/components/features/...`, query/mutation hooks, `proxy.ts` matcher if
  a public route is added.
- **Plugin:** `SKILL.md`, `_shared/*.md`, `pilot/kinds/<kind>.md`, `agents/*.md`.
- **Host:** C# files, `tests/JobPilot.Terminal.Tests`, `apps/terminal/README.md`.
- **Docs:** `docs/` (user-facing) only if user-visible behavior changes.

### 1.3 Dependencies & integration points
- **Per-user isolation:** every new query scoped by `userId`; by-id access via `findOwned`.
- **Auth:** behind `authGuard`; the agent authenticates with the terminal token
  (`JOBPILOT_API_TOKEN`), never a hard-coded or logged credential.
- **Deployed agents:** skills in users' installed terminal archives keep calling the cloud API.
  Removal/rename/retype of a field or endpoint is breaking; plan it additive, or sequence the
  removal after a `release`.
- **Migrations:** schema change -> `db-migrate`; `bun run db:backup` first; hand-edit renames;
  a data migration rather than read-compat code.
- **Pagination & SQL:** growing lists paginate; filter/sort/count in SQL.
- **Live updates:** does an SSE channel need a new event so open pages stay current?
- **Host cross-platform:** Windows, macOS, Linux (x64/arm64) under AOT.

### 1.4 Potential conflicts
- `git status -sb`, `git log --oneline -20` for in-flight work on the same surface.
- Upstream fork: if this should go upstream, branch off `origin/main` (see `sync-upstream`).

Present a **Discovery Summary** before Phase 2: Lane Verdict, affected-files table, the
compatibility decision (additive / breaking + ship order), and any conflicts.

---

## Phase 2: Implementation Plan

### Overview
[2-3 sentences: the lane, the owning module, the shape of the change.]

### Decision table
| Decision | Choice | Rationale (cite rules / prior review) |
|---|---|---|
| e.g., New module vs extend existing | extend `modules/campaign` | single owner for jobs |
| e.g., Enforcement | server-side cap, not skill prose | the agent is fallible |
| e.g., Endpoint change | additive field; drop old after next `release` | deployed agents |

### Implementation phases
Order: **schema/migration -> contracts -> API route/service -> web -> plugin skills -> host ->
docs -> verify -> release**. Drop phases the lane does not touch.

#### Phase A: Data
| Task | Files | Description |
|---|---|---|
| A.1 | `apps/api/prisma/schema/<domain>.prisma` | Via `db-migrate`; backup first; read the SQL |

#### Phase B: API + contracts
| Task | Files | Description |
|---|---|---|
| B.1 | `packages/contracts/...` | Request schema (+ tests) |
| B.2 | `modules/<name>/*` | Via `add-api-route`: controller, service, exact response schema, `userId` scoping, rate limit |

#### Phase C: Web
| Task | Files | Description |
|---|---|---|
| C.1 | `apps/web/src/api/...` | Query/mutation hooks off Eden types |
| C.2 | `apps/web/src/app/...`, `components/features/...` | RSC page + client feature component; loading/empty/error states; dark mode |

#### Phase D: Plugin
| Task | Files | Description |
|---|---|---|
| D.1 | `plugin/skills/...` | Update every skill that calls the changed endpoint; provider-neutral |

#### Phase E: Host
| Task | Files | Description |
|---|---|---|
| E.1 | `apps/terminal/...` + tests | Cross-platform; then `restart-terminal` |

#### Phase F: Ship
| Task | Files | Description |
|---|---|---|
| F.1 | - | `verify` green |
| F.2 | version files + `CHANGELOG.md` | `release` if plugin or host changed |

**Acceptance criteria per phase:**
- [ ] `verify` green (includes `bun run ci`, both typechecks, API + contracts tests, host tests when touched)
- [ ] Every new query scoped by `userId`; no per-route error schemas; dates `z.date()`
- [ ] Migration SQL read and matches intent; backup taken before apply
- [ ] Every skill calling a changed endpoint updated; breaking removals sequenced after a release

---

## Phase 3: Risk Assessment

### Classification
State the lane. Then confirm:
- Per-user isolation on every new query/route?
- Terminal token and credentials kept out of logs, responses, SSE, and the PTY?
- Deployed agents keep working until they upgrade?
- Migration safe (backup, no silent drop + add)?
- Host behavior identical on Windows, macOS, and Linux?

### Risks & mitigations
| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| e.g., response schema omits a field -> Elysia strips it -> skill `jq` reads null | High | Med | model the service return exactly; grep `plugin/` for the field |
| e.g., rename migration drops a column with data | High | Low | hand-edit to `ALTER ... RENAME`; backup first |

---

## Phase 4: Next Steps

| Action | Skill | Purpose |
|---|---|---|
| Architecture review | `architect` | Boundaries, isolation, integrity, compatibility |
| Add the endpoint | `add-api-route` | Contracts-first route |
| Schema change | `db-migrate` | Safe migration |
| Review the diff | `code-review` | Correctness bugs |
| Pre-merge | `nfr` then `verify` | Final checklist and gate |
| Start implementation | Say "proceed" | Begin Phase A |

---

## Workflow Commands

| Command | Action |
|---|---|
| `proceed` / `next` | Move to next phase |
| `back` | Previous phase |
| `revise: [feedback]` | Revise current phase |
| `expand phase N` | More detail on a phase |
| `show risks` | Display risk assessment |
| `lane` | Re-evaluate the lane verdict |
| `done` | Finalize plan |
