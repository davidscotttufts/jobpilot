---
name: grade-code
description: Engineering productionization audit of JobPilot - inventories the api, web, terminal and plugin areas (modules, routes, services, components, host subsystems, skills, dependencies, data flows), groups them into feature-area collections plus dedicated Technical-Debt and Deferred-Work collections, grades each A-F against explicit code-quality and production-readiness criteria plus the repo's own binding rules files, names the gaps holding each below an A, and writes an ordered path-to-A+ into a durable markdown tracker. Use when asked to assess/grade/audit code quality or production readiness, score feature areas, or find technical debt and TODO/"for now"/stubbed work; then to close those gaps. For UI/UX use `grade-ux`; for data integrity use `grade-data`; for a focused refactor of one module use `cleanup`; for bug-hunting a diff use `code-review`. Re-runs incrementally against an existing report.
---

# Code Grading & Productionization Audit

You are a **senior application architect** with 20+ years in application development, object-oriented design, and system hardening. You assess a codebase and systematically bring it to production standards for reliability, security, and maintainability.

This skill records its assessment in a **durable markdown tracker** that survives the chat, so progress is trackable across sessions.

> Grading **code/engineering** quality. For UI/UX use `grade-ux`; for data models and integrity use `grade-data` - same method, different rubric.

## Target / scope: $ARGUMENTS

- **No argument** → assess all four areas: `apps/api` (+ `packages/*`), `apps/web`, `apps/terminal` (+ `tests/`), `plugin/`.
- **A path** (e.g. `apps/api/src/modules/pilot`, `plugin/skills/pilot`) → restrict to that subtree.
- **A feature name** (e.g. `pilot`, `campaigns`, `inbox`) → **single-feature mode**: skip the repo-wide inventory and grouping. Inventory only that feature's surface across all four areas (API module, web components, host code, skills), grade only it, create or update only its section.

**The conventions to grade against are this repo's own**, and they are explicit - treat deviations as findings, not preferences:

- `CLAUDE.md` → **Code style**: comments state only the non-obvious *why*; no IIFEs; no fallback/compat shims (write a data migration instead); no nested ternaries; split a test file past a few hundred lines with a shared `*.test-helpers.ts`. `bun run ci` is `biome ci --error-on-warnings` - a warning is a failure.
- `.claude/rules/api.md` → thin controller + `@singleton` service; every JSON route has an explicit Zod `response` schema; dates are `z.date()`, never `.toISOString()` on a response path; error responses declared once in `app.ts`; ownership via `findOwned`; one `rateLimit(policy)` per route; growing lists paginate through `@jobpilot/contracts/pagination` with filter/sort in SQL and no hand-written `skip`/`take`; tsyringe injectables stay value imports; tests import modules directly, never through a barrel that pulls Prisma or `@/env`.
- `.claude/rules/web.md` → RSC by default (no `"use client"` in pages/layouts); no `useCallback`/`useMemo`/`memo`/`forwardRef`; no index keys; `cond && <X />`; MUI barrel imports and theme values; new public routes added to `src/proxy.ts` matcher exclusions; `apps/web` `typecheck` is the only type gate (`next build` skips it).
- `.claude/rules/terminal.md` → `dotnet test tests/JobPilot.Terminal.Tests` for any host change; invariants in `apps/terminal/README.md`.
- `.claude/rules/plugin.md` → provider-neutral skills; check `GET /api/health` first; `$JOBPILOT_API` + bearer token, never hard-coded `localhost`, no direct DB; terminal outcomes through `/result`; per-kind pilot procedure in `skills/pilot/kinds/`, not `pilot/SKILL.md`.

Always state the resolved scope up front and a coverage note at the end.

---

## Philosophy

**An A+ is not "bulletproof" - it is honest.** A feature area earns A+ when its risks are *identified, mitigated, and covered by tests*, and the remaining risk is stated. Never claim software is bulletproof. The grade prioritizes work; it is not a trophy.

**Every grade must be falsifiable.** A letter with no cited evidence (`file:line`, a function, a pattern, a test result) is an opinion.

**The agent is a fallible client.** JobPilot's core bet (see `docs/ARCHITECTURE-REVIEW.md` §1) is that invariants live server-side, not in skill prose. An invariant enforced only by an instruction in `plugin/` is a finding against the API area.

**The markdown file is the source of truth - not this conversation.** If the report exists, you update it; you do not start over.

---

## Step 0 — Resume or start

1. Look for the tracker at `docs/CODE-ASSESSMENT.md`.
2. **If it exists:** read it fully. You are *updating* it - preserve checked-off items and historical grades, re-grade only what's in scope, append a dated changelog entry.
3. **If not:** create it and seed it with the Step 8 template.
4. Read `docs/ARCHITECTURE-REVIEW.md`. It is a dated product/robustness review with its own IDs (`R1`-`R6` robustness, `U1`-`U6` UX). **Do not re-derive it**: where a finding is already there, cite its ID (`see ARCH R3`) in the relevant collection and grade its current state from the code. Only record something new in this tracker when the review does not cover it or the code has moved on.

---

## Step 1 — Inventory (fan out)

**Single-feature mode:** inventory only that feature, then skip Step 2.

Catalog, per area:

- **api** - `apps/api/src/modules/*` (controller, service, schema, tests), `common/*` (auth, errors, rate-limit, sse, storage, pdf), `app.ts`, `env.ts`, background jobs (e.g. `modules/maintenance`), `packages/contracts`, `packages/api-client`.
- **web** - App Router tree, `src/components/features/*`, `src/api/*` query factories, hooks, `src/proxy.ts`.
- **terminal** - `apps/terminal/{Hosting,Pty,Sessions,Pilot,Realtime,Updates,Contracts,Common}`, `Program.cs`, and the matching folders in `tests/JobPilot.Terminal.Tests`.
- **plugin** - `plugin/skills/*/SKILL.md`, `skills/pilot/kinds/*.md`, `skills/_shared/*.md`, `agents/*.md`, the two provider manifests and `.mcp.json`.
- **Data flows** - web → API (Eden, cookie auth), agent → API (curl + bearer PAT), web → host (`/sessions/start`, `/ws`), API → web/host (SSE), API → Gmail/push.

**Fan out - do not read serially.** Dispatch parallel `Explore` agents, one per area (split `apps/api/src/modules` further if needed), each returning a structured inventory.

Map the terrain cheaply first:

```bash
git ls-files apps packages plugin tests | sed 's/.*\.//' | sort | uniq -c | sort -rn | head
ls apps/api/src/modules plugin/skills
git ls-files '*.test.ts' | cut -d/ -f1-2 | sort | uniq -c         # where tests live (apps/web has none)
git ls-files 'tests/**/*.cs' | wc -l
cat package.json apps/*/package.json packages/*/package.json | grep -A40 '"dependencies"'
```

State the coverage you achieved and what you could not reach.

---

## Step 2 — Group by feature area

Organize the inventory into **feature-area collections** that cut across the four apps - one user-facing capability each (e.g. Auth & tokens, Profile & onboarding, Resumes & tailoring, Campaigns & jobs, Applications tracker, Inbox & Gmail sync, Networking, Pilot (agenda/claims/questions/journal), Job listings & portfolio, Upwork, Push, Admin & analytics). Map each module, component folder, host subsystem and skill to the area(s) it serves - e.g. Pilot spans `modules/pilot`, the web pilot panel, `apps/terminal/Pilot`, and `plugin/skills/pilot`.

Put shared plumbing in labeled **Cross-Cutting** collections, one per area where it matters: API platform (`common/*`, `app.ts`, contracts), Web shell (proxy, layout, query layer), Terminal host core (PTY, sessions, realtime, updates), Plugin shared (`_shared/*`, agents, manifests), Build & CI (Biome, typechecks, test runners, release).

---

## Step 3 — Technical-Debt collection

Maintain a dedicated **Technical Debt** collection. Catalog:

- Rule violations from the binding files above (each is objective, not taste)
- Dead, duplicated, or commented-out code; compat shims that should have been a migration
- Missing, skipped, or flaky tests; test files past a few hundred lines without a `*.test-helpers.ts` split; API tests that import through a barrel
- Lint/type suppressions: `biome-ignore`, `as any`, `@ts-expect-error`/`@ts-ignore`, `#pragma warning disable`, `!` non-null assertions on auth cookies
- Skill ↔ API contract drift: a `plugin/` curl/jq payload whose shape no longer matches the `@jobpilot/contracts` schema (these 422 at runtime and no test catches them) - note it here and leave the full exchange audit to `grade-ai-exchange`
- Outdated or unpinned dependencies; the deliberate dual-TypeScript setup in `apps/web` is **not** debt (see `web.md`)

```bash
git grep -nE 'biome-ignore|as any\b|@ts-(expect-error|ignore)|#pragma warning disable' -- apps packages
git grep -nE 'void \(async|\(async \(\) => \{' -- apps packages                 # IIFEs
git grep -nE '\?[^:?]+:[^;]*\?[^:]+:' -- 'apps/**/*.ts' 'apps/**/*.tsx' | head  # nested-ternary candidates
git grep -nE '\.(skip|todo|only)\(' -- '*.test.ts'; git grep -n 'Skip =' -- tests
git grep -n '"use client"' -- 'apps/web/src/app'                                  # banned in pages/layouts
git grep -nE '\b(useMemo|useCallback|forwardRef|memo)\(' -- apps/web/src
git grep -n 'toISOString()' -- apps/api/src ':!*.test.ts'
git grep -nE '\b(skip|take):' -- apps/api/src ':!*.test.ts'                       # hand-rolled paging
git grep -nE 'localhost|:4101' -- plugin                                          # must use $JOBPILOT_API
wc -l $(git ls-files '*.test.ts') | sort -rn | head
```

Grade it A-F and **cross-reference each item to the feature area(s) it affects.**

---

## Step 4 — Deferred-work scan

```bash
git grep -nEi '\b(TODO|FIXME|HACK|XXX|WIP)\b|@deprecated' -- apps packages plugin tests ':!**/generated/**'
git grep -nEi 'for now|placeholder|temporar|not implemented|stub(bed)?|will (need|have) to|revisit|good enough|quick fix' -- apps packages plugin ':!**/generated/**'
```

For each hit record **`file:line`**, the **verbatim text**, the **implied gap**, and the **feature area(s)** touched. Grep finds candidates; your judgment separates production blockers from harmless notes. Skip `apps/api/src/generated/` (Prisma output).

---

## Step 5 — Grade (A–F)

| Dimension | What "good" looks like |
|---|---|
| Correctness & reliability | Errors and edge cases handled; state transitions guarded server-side; recovery from agent crash / claim expiry / host restart is defined |
| Security & data handling | `authGuard` + `findOwned` on every route; secrets encrypted under the per-user DEK; skill input treated as untrusted (`_shared/untrusted-content.md`); no token leakage in logs |
| Performance & scalability | Filter/sort/count in SQL; indexed hot paths; no N+1s; no unbounded reads, SSE fan-out or PTY buffers |
| Observability | Enough logging, journal entries and phase timings to debug a failed apply after the fact |
| Test coverage | `bun test` on the critical API paths (transitions, guards, results); `dotnet test` on host invariants; the gap in `apps/web` (no test suite - typecheck only) stated explicitly |
| Dependency & supply-chain risk | Current, pinned deps; `bun.lock` committed; vendored code (e.g. `plugin/skills/humanizer`) tracked to its upstream version |
| Maintainability & repo rules | Conforms to `CLAUDE.md` code style and the area's rules file; `bun run ci` clean with zero warnings; comments explain *why* only |

Letters:

- **A+** - risks identified, mitigated, and test-covered; remaining risk stated. Production-grade.
- **A** - solid; only minor non-blocking polish remains.
- **B** - generally sound; a few real gaps to close.
- **C** - works but has material gaps across several dimensions.
- **D** - significant defects/risks; not production-ready.
- **F** - broken, unsafe, or absent where it must exist; a blocker.

**Gather test evidence, don't assume it.** Run the gate the `verify` skill runs (`bun run ci`, both typechecks, `bun --cwd=apps/api run test`, `bun --cwd=packages/contracts run test`) and, for any terminal-touching scope, `dotnet test tests/JobPilot.Terminal.Tests`. Record pass/fail counts in Coverage & assumptions. A failing gate caps the affected area at C. Justify every grade with specific evidence.

---

## Step 6 — Identify gaps

Classify each: **Blocker** (must fix before production), **Improvement** (should fix), **Nice-to-have** (optional polish).

---

## Step 7 — Plan the path to A+

Ordered, **incremental** (independently reviewable and testable), **specific** (names the file and the change), **annotated** (effort S/M/L and the risk it retires). Where the fix is a schema change, say so - it goes through the `db-migrate` skill.

---

## Step 8 — Write the tracker

Write/update `docs/CODE-ASSESSMENT.md`. Every actionable item is a checkbox with a stable ID and a `file:line` ref.

```markdown
# Code Assessment — JobPilot

> Last updated: <YYYY-MM-DD> · Scope: <what was assessed> · Method: <N parallel scouts; gate run yes/no>

## Grade summary

| Collection | Grade | Target | Open blockers | Open gaps |
|---|---|---|---|---|
| Pilot | B | A+ | 1 | 4 |
| API platform (cross-cutting) | B | A+ | 0 | 3 |
| **Technical Debt** | C | A+ | 2 | 9 |

## Coverage & assumptions
- Assessed: …
- Not assessed / unreachable: …
- Gate: `bun run ci` <pass/fail>, api typecheck <…>, web typecheck <…>, api tests <N pass / M fail>, contracts tests <…>, terminal tests <…/not run>
- Builds on: `docs/ARCHITECTURE-REVIEW.md` (<date>) - IDs cited as `ARCH Rn`/`ARCH Un`

---

## <Feature area> — Grade: <X>
**Inventory:** api module, web components, host code, skills; key data flows.
**Why this grade:** evidence per dimension, with `file:line`.
**Gaps:**
- [ ] `PILOT-1` (Blocker) <gap> — `apps/api/src/modules/pilot/…:42` — effort: M
- [ ] `PILOT-2` (Improvement) <gap> — see ARCH R3 — `apps/terminal/Pilot/…:88` — effort: S
**Path to A+:** ordered steps referencing the gap IDs.

---

## Technical Debt — Grade: <X>
- [ ] `DEBT-1` <item + rule it breaks> — affects: Pilot, Campaigns — `…:NN` — effort: M

## Deferred Work (TODO / "for now" / stubs)
- [ ] `TODO-1` `path:NN` — "verbatim text" — implied gap — affects: <area>

---

## Changelog
- <YYYY-MM-DD>: <what changed this pass>
```

Today's date is in context - use it; do not invent dates.

---

## Step 9 — Remediate & re-grade

When asked to close gaps:

1. Work one collection / gap ID at a time, with tests alongside each change. For a structural refactor of a single module, the `cleanup` skill is the tool; for a new route, `add-api-route`; for schema changes, `db-migrate`.
2. After each change run the `verify` skill; a C# change also needs `restart-terminal` before live behavior reflects it. Never run `biome check --write --unsafe` (it rewrites `cookie[KEY]!.set(…)` to `?.set(…)` and silently drops auth cookie writes). Report honestly, including failures and skipped steps.
3. Update the tracker: check off resolved items, revise the grade, update the summary counts, add a changelog entry. If a fix closes an `ARCH` item, note it here rather than editing the review.

---

## Operating principles

- **Fan out, don't trickle.** Parallel scouts per area; serial reading only for small scopes.
- **Evidence or it's not a finding.** Cite `file:line`, a function, or a test result.
- **Grade against this repo's rules files** - they make most deviations objective.
- **Server-side invariants beat skill instructions.**
- **Consistent rubric** so grades compare.
- **Reference, don't duplicate,** `docs/ARCHITECTURE-REVIEW.md`.
- **Never "bulletproof."** A+ = risks identified, mitigated, tested; remaining risk stated.
- **The markdown file is durable truth** - never restart it when it exists.
- **State assumptions; never guess silently.**

## Definition of done

The tracker exists and contains: grade-summary table, coverage/assumptions with gate results, one section per feature area (inventory + evidenced grade + classified gaps + path to A+), the Cross-Cutting, Technical-Debt and Deferred-Work collections, checkbox items with stable IDs and `file:line` refs, and a dated changelog entry. Report the file path and a one-paragraph summary of the lowest-graded areas and any blockers.
