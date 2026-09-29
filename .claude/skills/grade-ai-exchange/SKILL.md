---
name: grade-ai-exchange
description: Agent-app information-exchange audit of JobPilot - inventories every point where the local agent (Claude Code or Codex in the PTY host) exchanges information with the app - plugin skill curl+jq calls to the Elysia API, agenda payloads, job results, journal entries, pilot questions, claim heartbeats, job-worker handoffs, the host's cycle injection and `[[JOBPILOT_CYCLE ...]]` sentinel - and grades each A-F on exchange quality - can the agent discover what it needs, do documented payloads match the Zod contracts, are errors actionable, are jq templates correct, is context stale or missing, are writes verified, is cycle completion robust. Seeds the audit with known failure classes, then writes an ordered path-to-A+ into a durable markdown tracker. Use when asked to grade/audit/assess skill-API exchanges, agent grounding, contract drift between skills and the API, error actionability, or pilot cycle robustness. For engineering quality use `grade-code`; for UI/UX use `grade-ux`; for bug-hunting a diff use `code-review`. Re-runs incrementally against an existing report.
---

# Agent-App Information-Exchange Audit

You are a **senior AI-platform architect** responsible for every conversation between JobPilot and a language model. In JobPilot the model is the user's own Claude Code or Codex agent, running in the .NET PTY host (`apps/terminal`) and driven by the plugin (`plugin/`). It never touches the database: everything it knows arrives through a curl response, a skill doc, an injected command, or a worker's return JSON. Everything it does leaves through a curl request, a journal entry, or a sentinel line. The quality of those exchanges *is* the quality of the product.

An exchange where the skill doc hand-copies a payload that has drifted from the contract, the 422 body is discarded, and `jq '.applied'` reads the error as `null` - "not applied" - is a **blind exchange**: the agent guesses, fails silently, and acts on the wrong belief. This skill finds every such exchange, grades it, and records it in a **durable markdown tracker**.

> Grading **information exchange between the agent and the app**. For engineering quality use `grade-code`; for the web UI use `grade-ux`.

Read `CLAUDE.md`, `.claude/rules/plugin.md`, `.claude/rules/api.md`, `.claude/rules/terminal.md`, `docs/architecture.md` ("The Pilot") and `apps/terminal/README.md` first. They are the **binding conventions** - a deviation from them is a finding, not a preference.

### Environment reality - static audit, optional read-only probes

You read the skill docs, the contracts, the controllers and the host. If the API is up at `:4101`, you may confirm a suspicion with a **read-only** probe - Swagger at `:4101/swagger`, a `GET`, a deliberately malformed request to see the real error body. Never write to real campaign, application or journal rows to prove a point (the journal has no PATCH route, so a bad entry is permanent), and check which database `:5433` actually is before any probe. Every run ends with a **Live-verification checklist** of exchanges only a real pilot cycle can confirm.

## Target / scope: $ARGUMENTS

- **No argument** → full sweep of every exchange class below, plus the known-failure-class scan and the dead-wiring scan.
- **A skill name** (e.g. `scan-inbox`, `auto-apply`) → grade that skill end to end: every call it makes, every payload it sends, every response field it reads, and every error branch.
- **A pilot kind** (e.g. `job.apply`, `inbox.review`) → grade `plugin/skills/pilot/kinds/<kind>.md` plus the agenda payload the server builds for it and any worker it delegates to.
- **A class** (`skills` | `agenda` | `outbound` | `host` | `workers` | `server-llm`) → grade only that class.

State the resolved scope up front and a coverage note at the end.

---

## Philosophy

**The agent must be able to ask, and must be told the truth.** An exchange is good when the agent can discover the data and shapes it needs at runtime, sends a payload the contract accepts, reads back everything the next step needs, and - when something is wrong - gets an error that names what is wrong and what to do. It is poor when the agent works from a stale hand-copy, sends a shape the server rejects or silently strips, and cannot see why.

**Four grounding patterns - classify every exchange before grading it:**

| Pattern | Mechanism | Grade ceiling |
|---|---|---|
| **A - Contract-bound** | the skill's payload and field reads are pinned to `packages/contracts` by a test or generated from it; the response carries everything the next step reads; errors reach the agent as `{code, message, details}` with a documented branch | A+ |
| **B - Documented and accurate** | a hand-written curl/jq template that currently matches the contract and documents its error branches, with nothing pinning it | B (drift risk) |
| **C - Drifted or partial** | the template disagrees with the contract (type, field name, required-ness), or omits an error branch the server really returns | C |
| **D - Blind** | the agent must guess the shape; failures are swallowed (`-f` drops the body, `jq` reads `null`); the outcome is never verified | D/F |

Skills are hand-authored markdown with no generation step (`plugin.md`), so almost every skill call starts at pattern B. **An accurate hand-copy is still a drift risk** - the defect is the unbound copy, not its current content. A tripwire test (a contracts test that parses each skill's example payload, or a snapshot of a route's accepted keys) is what lifts B to A.

**Silence is the disease.** The worst failures in this app's history were not rejections but things that *looked like success*: a 422 read as "not applied", a missing `resumeId` returning a plausible floor score, a worker reporting `applied` with no result write. Grade what the agent *believes* after the exchange, not only whether the request succeeded.

**Evidence on both sides.** Every grade cites the app side (contract, controller, service - `file:line`) and the agent side (the skill line that builds the request or reads the response), or the demonstrated absence. A grade citing one side is an opinion.

**The markdown file is the source of truth - not this conversation.** If the tracker exists, update it; never start over. Never claim an exchange is flawless.

---

## Step 0 - Resume or start

1. Look for the tracker at `docs/AI-EXCHANGE-ASSESSMENT.md`.
2. **If it exists:** read it fully. Preserve checked-off items, historical grades and the live-verification checklist; re-grade only what is in scope; append a dated changelog entry.
3. **If not:** create it, seeded with the Step 8 template.

---

## Step 1 - Inventory the exchange points (fan out)

Dispatch parallel `Explore` agents, one per class (or per skill cluster for `skills`), each returning for every exchange: `{ location (file:line), direction, route/channel, payload template, fields read back, error branches documented, contract file }`.

**Class 1 - Skill → API calls** (`plugin/skills/*/SKILL.md`, `plugin/skills/_shared/*.md`, `plugin/skills/pilot/kinds/*.md`, `plugin/agents/*.md`). Every `curl` to `$JOBPILOT_API`: method, route, body template, the jq that builds it, the jq that reads the response. The app side is the controller's request schema (`@jobpilot/contracts`) and its `response` schema (`apps/api/src/modules/<name>/<name>.schema.ts`) - Elysia silently strips response fields the schema omits, so a field the skill reads may never arrive.

**Class 2 - Context handed to the agent** - what the agent is given to act on: the agenda (`POST /api/pilot/agenda/refresh`, built in `apps/api/src/modules/pilot/agenda/`, shaped by `packages/contracts/src/pilot/agenda.ts`), including each item's `payload` and the `budget`; the profile/resume/credentials load in `_shared/setup.md`; digests (`_shared/digest-schema.md`); env the host injects (`JOBPILOT_API`, `JOBPILOT_API_TOKEN`, `JOBPILOT_WEB`, `JOBPILOT_SKILLS_ROOT`).

**Class 3 - Agent → app outbound records** - job results and PATCHes (`/api/campaigns/:id/jobs/:key` and `/result`), journal batches (`contracts/src/pilot/journal.ts`), pilot questions (`contracts/src/pilot/question.ts`, `pilot-questions.controller.ts`), claims, heartbeats, releases and browser leases (`pilot-claims.controller.ts`, `agenda/claim.service.ts`, `agenda/browser-lease.ts`), `score-fit` and `applied/check` (`modules/scoring`).

**Class 4 - Host ↔ agent protocol** (`apps/terminal/Pilot/`): cycle injection (`PilotRuntime.InjectCycleAsync` - `/clear` then the skill command), the sentinel (`SentinelParser.cs` vs `pilot/SKILL.md` step 7), API-confirmed completion (`CompletionTracker.cs`, `CycleWaiter.cs` reading the journal `cycle` entry's `detail`), liveness and the intervention ladder (`StuckDetector.cs`, `InterventionLadder.cs` - check-in / skip / restart directives), wake signals (`PilotEventListener.cs`, `SseParser.cs`).

**Class 5 - Orchestrator ↔ worker** (`plugin/agents/job-worker.md`, `networking-worker.md`): the input JSON each caller builds vs the worker's declared input; the return JSON vs what the caller reads; whether the caller verifies the worker's claimed outcome against the API.

**Class 6 - Server-side LLM calls.** As of 2026-09-28 there are none: `modules/scoring/fit.ts` and `modules/upwork/upwork-quality.ts` are deterministic heuristics ("no LLM"). Re-check every run:

```bash
git grep -nliE 'anthropic|openai|@ai-sdk|generateText|chat/completions|messages\.create' -- apps/api/src apps/api/package.json
```

If one appears, grade it on prompt grounding, a declared output schema validated before use, a bounded repair loop, and gated persistence.

Map the terrain cheaply first:

```bash
git ls-files 'plugin/skills/**/*.md' 'plugin/agents/*.md'
git grep -c 'JOBPILOT_API/api/' -- plugin | sort -t: -k2 -nr      # calls per skill doc
git grep -nE 'z\.(strictObject|object\([^)]*\)\.strict)' -- packages/contracts/src   # strict vs strip
git ls-files 'apps/api/src/modules/**/*.controller.ts'
```

State the coverage achieved and anything you could not reach.

---

## Step 2 - Classify every exchange

For each exchange record its pattern (A-D) and answer:

- **Where does the agent learn the shape?** Skill prose, a `_shared` doc, Swagger, or nowhere. Trace every field name in a template to the contract line that defines it.
- **Does the request match?** Types (string vs object vs array), required vs optional, nullable vs absent, enum values, unknown keys (strict schemas 422; plain `z.object` strips silently).
- **Does the response carry what is read?** Every `jq '.x'` on a response must name a field in that route's `response` schema.
- **What happens on failure?** Which non-2xx statuses the route really returns, whether the skill branches on them, and whether the body (`code`, `message`, `details`) ever reaches the agent.
- **Is the outcome verified?** After a write that matters (terminal result, release, question), does anything confirm the state the agent believes?

---

## Step 3 - Grade (A-F) against the exchange rubric

| Dimension | What an A looks like |
|---|---|
| **Discoverability** | The agent can fetch every piece of data and shape it needs at runtime (a GET, the agenda payload, a `_shared` doc that is current); it never has to infer a field from a past error |
| **Contract fidelity** | Every template matches the Zod contract in type, name, required-ness and nullability; a test pins the match (else drift risk, capped at B) |
| **Response sufficiency** | The response schema includes every field the skill reads next; nothing is stripped by an under-specified `response`; ids needed for follow-up calls come back |
| **Error actionability** | Every non-2xx the agent can hit carries `{code, message, details}` that names the bad field and the fix; the skill's curl flags let the body reach the agent; each expected status (409 duplicate, 409 cap, 422) has a documented branch |
| **Template correctness** | jq and shell templates produce the intended types for every input, including `""`, `null`, commas, quotes and zsh-special text |
| **Context freshness** | The agent acts on current state: agenda version checked at claim, server-computed flags actually read, no reliance on anything that `/clear` erased |
| **Outcome verification** | Load-bearing writes are confirmed from the API, not from a worker's self-report; an unconfirmed write has a recovery path |
| **Completion robustness** | The cycle always ends with both the journal `cycle` entry and the sentinel, on every path including errors; the host parses the exact format the skill prints; the server-confirmed path backs the sentinel up |
| **Enforcement locus** | Safety limits (caps, duplicate guard, review gates, recovery holds) are enforced server-side, and the skill doc describes the server's real behavior |

Letters:

- **A+** - pattern A: contract-pinned, sufficient responses, actionable errors with documented branches, verified outcomes; residual drift risk stated.
- **A** - pattern A with a minor gap (one undocumented rare status, one unpinned field).
- **B** - pattern B: accurate today but unpinned; or pinned but one error branch undocumented.
- **C** - pattern C: a drifted field, a missing branch for a status the route really returns, or an error body the agent never sees.
- **D** - mostly blind: failures swallowed into plausible values, but the damage stays contained (a dropped digest update, a wasted cycle).
- **F** - blind on a surface that **submits an application, sends a message, or writes permanent state**: a duplicate apply, a lost apply, a corrupted journal entry, or a safety gate the skill never wires.

Justify every grade with evidence on both sides.

---

## Step 4 - Known failure classes (check every one)

These classes have each broken a real pilot cycle. Audit the whole tree for each class, not just the incident that surfaced it, and record every hit under the exchange it belongs to.

1. **Error body discarded.** `curl -fsS` makes a non-2xx exit with no body, so `{code, message, details}` never reaches the agent, and a skill branching on body text ("a `409` opening `Already applied`") cannot see that text. The validation handler (`common/middleware/error.middleware.ts`) returns `message: "Invalid request"` with Zod issues only in `details` - check that the agent can see `details` at all.
2. **Error read as data.** A failed call piped into `jq '.field'` yields `null`, which reads as a real answer ("not applied", "no items"). Any response read without a status check is suspect.
3. **Query-param coercion.** A comma in a free-text query value (`title`, `company`) arrives server-side as an array and 422s, even as `%2C`. Check every GET with free-text query params (`applied/check` and any `csvArray` neighbor).
4. **String-vs-object mismatch across routes.** One field with different wire types on different routes (`digest` is a JSON string on campaign-job PATCH and list responses, an object on `score-fit`). Check every field that crosses more than one route.
5. **Silent key handling.** Unknown keys are stripped silently by plain `z.object` and rejected by strict ones - check which applies, and that the skill doc says so; a stripped key is a lost write the agent never hears about.
6. **jq fallbacks that never fire.** `($x // null)` does not catch `""`, because `""` is truthy in jq - the server gets `""` and 422s. The same trap applies to `--argjson x null` piped through `//`. Grep every `//` in a template whose input is built with `--arg`.
7. **jq binding collisions and parse misuse.** `--arg x` and `--argjson x` with one name silently yield a string; `echo "$s" | jq 'fromjson'` fails because stdin is already parsed (use `jq -n --arg raw "$s" '$raw | fromjson'`).
8. **Shell expansion corrupting ids.** zsh treats unbraced `"$CID:key"` as history modifiers and eats letters (`:l`, `:w`, `:a`...) - any `subjectId` built as `$VAR:text` without braces is corrupt. `< <(...)` loops hang once auto-backgrounded.
9. **Silent fallback defaults.** An optional input with a server-side default that yields a plausible but meaningless result (`score-fit` without `resumeId` and no primary resume returns a flat ~10). Any "falls back to X" in a skill doc needs an error or a flagged result when X is absent.
10. **Documented but never wired.** The server computes a field, or a worker accepts an input, but no skill reads or forwards it (`budget.reviewNextApply` → `preSubmitReview` in `kinds/job.apply.md`). Run the dead-wiring scan in Step 5.
11. **Unverified worker outcomes.** A worker reports `applied` while the job stays `applying` with no result write, or invents an `applicationId`. The caller must confirm terminal status from the API before releasing the claim.
12. **Self-inflicted conflicts.** A server transition performed at claim time (the claim sets `applying`) that a later instruction repeats and then misreads its own 409 as a rival's lock. Check every PATCH in a kind file against what the claim already did.
13. **Undocumented state guards.** Transitions the server refuses that the skill never mentions (`pending → needs_user` 409s; a recovery hold 409s until `{status:"approved", confirmNotSubmitted:true}`). Diff every `409` thrown in `job-commands.ts` and `claim.service.ts` against the branches the kind files document.
14. **Claim lifecycle drift.** Claim TTL shorter than a real worker run; what a heartbeat `409` means (expired and auto-recovered - stop the worker, do not re-release); items resolved outside claim/release that never get consumed (an answered question pinning the agenda).
15. **Agenda livelock.** An item re-emitted every refresh with no suppression, cooldown or "permanent" outcome the agent can write (`board.health` on a paywalled board, `job.rescanSkipped` on low-fit skips). Grade whether the agent can *tell the server* "this cannot progress" - if it cannot, that is an exchange gap.
16. **Dedupe coverage narrower than the agent assumes.** `applied/check` and the claim's duplicate guard miss cross-campaign matches, host aliases (`HOST_ALIASES` in `modules/application/job-url.ts`) and re-ingested keys; the skill must say what the check does not cover.
17. **Literal values mangled in transit.** Payload strings whose punctuation carries meaning (quoted exact-phrase `query`) that a skill might normalize away.

---

## Step 5 - Host protocol and dead wiring

**Host ↔ agent protocol - grade once, as infrastructure:**

- **Format parity:** the sentinel `pilot/SKILL.md` prints on every path (ok / empty / error) matches `SentinelParser.SentinelPattern` exactly; statuses and the `sleep` range agree; `tests/JobPilot.Terminal.Tests/Pilot/SentinelParserTests.cs` covers wrapped, repainted and echoed lines.
- **Dual signal:** the journal `cycle` entry's `detail:{status, sleepSeconds}` is written on every path before the sentinel, including when the error-path journal POST itself fails; the host's confirmed-completion path reads the same vocabulary.
- **Context reset:** what `/clear` erases (everything) versus what each kind file assumes is still in scope (`$AGENDA`, `$CLAIM_ID`, `$CYCLE_ID` across steps); ladder directives (check-in, skip) keep context - check their wording tells the agent which exit path to take.
- **Liveness:** heartbeat cadence in the skill vs the host's stuck threshold and the claim TTL - three clocks that must agree.
- **Tool availability:** what the agent is told to do when a Playwright MCP server fails to connect or a browser profile is locked (error-path exit, never an indiscriminate process kill).

**Dead-wiring scan** - for every field in the agenda `budget`, every agenda item `payload` key, and every worker input/output key, find a producer and a consumer:

```bash
# Keys the server hands the agent; each should appear in some plugin doc.
git grep -nE '^\s+[a-zA-Z]+: z\.' -- packages/contracts/src/pilot/agenda.ts
git grep -n '<key>' -- plugin
```

Report one row per orphan: `{ field | produced at | consumed at | verdict }`. The verdict is `Blocker` when the orphan is a safety gate, `Exchange gap` when it is useful context the agent never reads, and `justified` when it is web-only (state the reason).

---

## Step 6 - Identify gaps

Classify each:

- **Blocker** - can submit a duplicate or lose an apply, corrupt permanent state, bypass a safety gate, or leave a cycle unable to signal completion.
- **Drift risk** - an accurate but unpinned template; a contract change with no skill-side tripwire.
- **Exchange gap** - missing discoverability, a non-actionable error, an unverified outcome, or no way to tell the server "this cannot progress".
- **Nice-to-have** - polish (terser templates, a clearer journal line).

---

## Step 7 - Plan the path to A+

Ordered, **incremental**, **specific**, **annotated** (effort S/M/L and the gap ID it retires). For example: "switch `plugin/skills/scan-inbox/SKILL.md` Phase 4 to a literal `appliedStatus:null` - retires `XCH-INBOX-2`".

Converge on a few shared fixes rather than per-skill patches:

- One error-surfacing curl pattern in `_shared/setup.md` (for example `--fail-with-body`, or `-w '%{http_code}'` plus a status check) that every skill references.
- Server-side fixes where the trap is the server's: coerce free-text query arrays, reject rather than silently default on missing required context, put the failing field in the 422 `message`, auto-consume questions whose subject has gone terminal.
- Tripwire tests: a contracts-side test that validates each skill's example payload against its schema, so the next contract change fails CI instead of misleading the agent.

A contract change goes through the `add-api-route` conventions; a host change needs `dotnet test` and the `restart-terminal` skill.

---

## Step 8 - Write the tracker

Write or update `docs/AI-EXCHANGE-ASSESSMENT.md`. Every actionable item is a checkbox with a stable ID and `file:line` refs on **both** sides.

```markdown
# Agent-App Information-Exchange Assessment - JobPilot

> Last updated: <YYYY-MM-DD> · Scope: <classes/skills assessed> · Method: <static; N parallel scouts; read-only probes y/n>

## Grade summary

| Exchange | Class | Pattern | Grade | Target | Contract fidelity | Errors actionable | Outcome verified |
|---|---|---|---|---|---|---|---|
| pilot `job.apply` | agenda + worker | C | D | A+ | ok | no (`-f`) | no |
| `scan-inbox` Phase 4 PATCH | skill → API | C | C | A+ | drifted (`""`) | no | n/a |
| Host protocol | host | A | B | A+ | - | - | server-confirmed |

## Coverage & assumptions
- Assessed: …
- Not assessed: …
- Server-side LLM calls: <none found / list>

## Live-verification checklist (a real pilot cycle)
- [ ] `LV-1` <exchange and what to watch for>

---

## <Exchange or skill> - Grade: <X> (pattern <P>)
**Agent side:** `plugin/skills/…:NN` · **App side:** `packages/contracts/src/…:NN`, `apps/api/src/modules/…:NN`
**Exchange trace:** what is sent, what comes back, what is read, what happens on failure.
**Why this grade:** evidence per rubric dimension.
**Gaps:**
- [ ] `XCH-<AREA>-1` (Blocker) <gap> - `<agent file:line>` / `<app file:line>` - effort: S
**Path to A+:** ordered steps referencing the gap IDs.

---

## Host protocol - Grade: <X>
## Known failure classes
| # | Class | Hits (IDs) | Status |
## Dead wiring
| field | produced at | consumed at | verdict |

---

## Changelog
- <YYYY-MM-DD>: <sections re-graded, items closed, drift found>
```

Today's date is in context - use it; do not invent dates.

---

## Step 9 - Remediate & re-grade (only when asked)

1. One gap ID at a time. Edit skills directly under `plugin/` (no generation step); keep them provider-neutral and terse per `plugin.md`.
2. Add the tripwire with the fix wherever a template mirrors a contract.
3. Verify with the `verify` skill (Biome, typechecks, `bun run test`; `dotnet test tests/JobPilot.Terminal.Tests` for host changes). Exercise the exchange where it is safe - a malformed request against a local API to confirm the error body now reaches the agent. Report failures and skips honestly.
4. Update the tracker: check off items, revise grades and patterns, and add a changelog entry.

---

## Operating principles

- **Fan out, don't trickle** - parallel scouts per class; serial reading only for one skill or kind.
- **Classify before grading** - the pattern is the skeleton; the rubric refines it.
- **Trace every field to its contract line** - a template field with no contract line is a finding.
- **Grade what the agent believes afterwards**, not whether the HTTP call returned 2xx.
- **Accurate hand-copies are still drift risk.**
- **Evidence on both sides**, or the demonstrated absence.
- **Never write to real data to prove a finding.**
- **The markdown file is durable truth** - never restart it when it exists.
- **State assumptions; never guess silently.**

## Definition of done

The tracker exists and contains: the grade-summary table, coverage and assumptions (including the server-side-LLM check), the live-verification checklist, one section per graded exchange (trace + evidenced grade + classified gaps + path to A+), the host-protocol section, the known-failure-class table with every class checked, the dead-wiring table, checkbox items with stable IDs and refs on both sides, and a dated changelog entry. Report the file path and a one-paragraph summary of the blind exchanges, the worst error-actionability gaps, and any dead-wired safety gate.
