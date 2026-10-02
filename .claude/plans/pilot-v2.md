# Plan: Pilot v2, fewer tokens per application

## Status

| Milestone | State |
| --- | --- |
| 1. Rename | Done on `feat/pilot-v2` (commit "refactor(pilot)!: rename agenda to task list and claim to run"). Migration not applied; live run not done. |
| 0. Spike | Next. |
| 2-7 | Not started. |

The rename ran before the spike so the spike and every later milestone use the final names.

## Context

Names below are the post-rename ones (milestone 1).

The pilot works: the server ranks the task list, runs gate the work, the journal records it, and
cycles keep no state. Its cost is the problem. A user who leaves it running can spend a large
share of a weekly Claude or Codex limit, and most of that spend does not move an application
forward.

Where the tokens go today (reviewed 2026-10-01):

1. **The model does the bookkeeping.** Each cycle runs `/clear`, loads
   `plugin/skills/pilot/SKILL.md` and `_shared/setup.md`, then spends model turns on fixed steps:
   health check, cycle id, `GET /api/pilot`, task list refresh, start run, journal, finish run,
   sentinel.
   Every turn resends the context.
2. **Idle wakes find nothing.** `PilotLoop.RunOnceAsync` checks only whether the pilot is
   running, not the task list. An idle pilot wakes the model every `checkIntervalMinutes` (default 30). That is longer
   than the default 5-minute prompt cache, so each wake probably rewrites the prompt into the
   cache, then spends about five turns learning the task list is empty. That is up to 48 wakes a day.
3. **Worker docs miss the cache.** A `job-worker` gets its varying input JSON first, then reads
   about 20 KB of shared docs. Content placed after a varying prefix is not reused across workers.
4. **The worker writes before it checks.** Apply mode tailors the resume and writes the letter
   before it looks at the form, where sponsorship and clearance blockers often show up.
5. **One agent for every kind of work.** `job-worker` carries review, score and apply in one
   body, so a score call loads apply-only text. `search.discover`, the largest browser task,
   runs in the main session with no worker at all.
6. **No token numbers.** `costByTaskType` (`apps/api/src/modules/pilot/pilot.stats.ts`) uses run time
   in place of tokens. Nothing can enforce a budget.

`/clear` itself is not a cost problem and stays. The prompt cache matches the prompt's opening
text, not the session. After `/clear`, the CLI system prompt and tools still hit a warm cache.
Keeping history would resend old cycles on every turn and eventually trigger auto-compaction.
Clearing also stops untrusted page content from carrying into the next cycle.

## Principles

- **The pilot runs in the interactive TUI.** Claude Code and Codex keep running as full TUI
  sessions in the PTY host, so the user watches every step live in the web terminal and can type
  into it. No headless mode (`claude -p`, `codex exec`) for the pilot.
- **Code does what is fixed; the model does what needs judgment.** Bookkeeping, ranking, policy,
  caps and budget live in the host and the API. The host drives the TUI by typing commands into
  the PTY, as `PilotLoop` does today. "Code" here never means scripted browser automation.
- **Browser work stays agent-driven.** No replay scripts, recorded selectors, or Playwright
  scripts that read forms. Sites change too often; adapting to them is the agent's job. The
  savings come from what the agent is given and in what order it works, not from replacing it.
- **Measure first.** Each change after milestone 2 is judged by tokens per application, before
  and after.
- **One model: the one the user selected.** The main session and every agent run it; agents
  inherit it. Savings come from specialized agents with less to read, not from choosing models.
- **Agents never talk to each other.** Each run returns a small typed result to the API. The API
  decides what runs next.
- **The server enforces every limit.** The model never polices its own budget.
- **Names say what the thing is.** One word per concept, everyday words over jargon, and no word
  reused for two different things.

## Rejected, and why

- **Headless runs** (`claude -p --output-format stream-json`, `codex exec --json`): they would
  give clean usage events and a typed final message, but the user loses the live TUI. The user
  must be able to see what the agent is doing and step in. Usage and results come through
  telemetry and the API instead (milestones 2 and 4).
- **Scripted browser automation** (replay scripts, form inspection scripts): fragile; the user
  rejected it.
- **A new `WorkItem` queue table:** job, message and question statuses already form the queue,
  and `PilotRun` already has versions, heartbeats and a lifetime cap. A second copy drifts.
- **Several LLM agents in parallel, each with a browser:** multiplies spend, invites bot
  detection, and the Playwright profile allows one browser per folder anyway.
- **Per-user experiments and learning:** one user produces too few replies to separate signal
  from noise. Learning, if any, pools results across all users later.
- **LLM scoring per job, embeddings:** scoring is already code (`modules/scoring/fit.ts`).
- **Automatic prompt rewriting:** needs a saved-page eval lab first. Out of scope.
- **Choosing models per task or per agent** (tiers, the host typing `/model`, escalation, a
  fixed cheaper model per agent): more moving parts for an unmeasured saving, and typing
  `/model` can land mid-turn or throw away the prompt cache. Everything uses the selected model.
- **One agent per task type:** about 20 agents, each copying the shared docs, and rare ones would
  miss the prompt cache on every run. Agents are split by the kind of work, which decides
  what docs and tools they need.

## Execution process

- Branch `feat/pilot-v2` from `main` before any change.
- One milestone at a time, in the order of the Status table. After each: run /verify, then
  commit (subject only, no co-author trailers).
- Migrations: hand-author the SQL folder and apply with `migrate deploy` (see the migration-drift
  memory). Hold `db:migrate:apply` until the user confirms, since the database is shared.
- C# changes: rebuild and restart the host (`restart-terminal` skill) before any live check.
- Milestone 0 is a spike. Its findings go into this file before milestone 2 starts.

## Milestone 0: spike TUI telemetry and control (no merge)

Prove that the host can measure and steer a TUI pilot session without headless mode.

- **Token usage from a TUI session.** Try, in order:
  1. OpenTelemetry. Claude Code: start the PTY process with `CLAUDE_CODE_ENABLE_TELEMETRY=1`,
     `OTEL_METRICS_EXPORTER=otlp`, `OTEL_LOGS_EXPORTER=otlp`, `OTEL_EXPORTER_OTLP_PROTOCOL=http/json`
     and an endpoint on the host. Confirm the per-request events carry input, output, cache read
     and cache write tokens plus the model. Codex: check its `[otel]` config for the same data.
  2. The local session logs (Claude's transcript JSONL, Codex's rollout JSONL). Internal formats,
     so only a fallback.
  Record which one works per CLI and how a usage event maps to a run (by time window between the
  run's start and its result; the pilot session runs one thing at a time).
- **Driving the TUI.** Confirm the host can type `/clear`, then a skill call with an argument
  (`/jobpilot:pilot <runId>`, and the Codex equivalent), and that the skill receives it.
- **Subagents.** Confirm the usage events tag subagent requests (and their model) apart from the
  main session, so per-agent cost is measurable. Measure what starting one subagent costs in
  tokens. Confirm agents inherit the session's model on both CLIs. Check whether Claude Code
  defers plugin MCP tools, or whether every agent with Playwright access pays for its tool
  schemas on every turn. For Codex, check that `.codex/agents/*.toml` accepts an inlined body.
- **Cache after `/clear`.** Read cache read versus cache write for a few back-to-back cycles.
  A one-off script in the scratchpad, not committed.
- **Baseline.** Tokens per cycle by task type, for idle, apply and discover cycles.

Exit: a short "Spike findings" section added to this file, with the telemetry route per CLI, the
TUI commands that work, and the baseline numbers.

## Milestone 1: rename jargon and ambiguous names (done)

One commit on `feat/pilot-v2` covers the API, contracts, web, host, plugin skills, docs and a data
migration. No aliases or old routes kept; CHANGELOG, applied migrations and `.claude/ideas.md`
keep the old words.

### The core words

- **task**: one piece of work the server ranked (was agenda item). The ranked list is the
  **task list** (was agenda). "Task" is already the word users see.
- **run**: one attempt at one task by the agent (was claim). A claim already had a start, a
  heartbeat, an expiry, a finish and an outcome, which is what a run is; milestone 2 adds token
  usage to the same `pilot_runs` row. Starting a run reserves the task, as claiming did.
- **cycle** stays: one pass of the host loop that asks the server for tasks. A cycle starts at
  most one run; after milestone 3 most cycles start none. ("Check" was tried and rejected: it
  collides with check-in, `checkIntervalMinutes` and health checks, and sounds read-only.)
- `lease` was already gone from code; the last mention, in `api-job-sources.md`, became "hold".

### What changed

| Old | New | Where |
| --- | --- | --- |
| agenda | task list | `/api/pilot/agenda*` → `/api/pilot/tasks*` (response `{taskList}`, `items` → `tasks`, `generatedAt` → `builtAt`), `modules/pilot/agenda/` → `tasks/`, `AgendaService` → `TaskListService`, `agendaResponseSchema` → `taskListSchema` |
| agenda item | task | `AgendaItem` → `PilotTask`, `agendaItemSchema` → `taskSchema`, start body `itemId` → `taskId` |
| `agendaVersion`, `agendaSnapshot`, `agendaGeneratedAt`, `agendaExpiresAt` | `taskListVersion`, `taskListSnapshot`, `taskListBuiltAt`, `taskListExpiresAt` | `PilotState` columns, start body |
| kind (of a task or run) | `taskType` | `PilotRun.taskType`, tasks, `/stats/cost` items, `costByTaskType`, `skills/pilot/kinds/` → `skills/pilot/tasks/`. Journal and question enums keep `kind`. |
| claim | run | `PilotRun` / `pilot_runs`, `RunService`, `/api/pilot/runs`, `/runs/:id/heartbeat`, `/runs/:id/finish`, `activeRuns`, `taskFieldsSchema`, `RUN_ID`, worker input `runId` |
| claim / release (verbs) | start / finish | `runs.start()` / `runs.finish()`, `startedAt` / `finishedAt`, "startable", payload `releaseNote` → `finishNote` |
| `PilotClaimOutcome` | `PilotRunOutcome` | values unchanged |
| `claimDamped`, `claimJobForApply` | `ranRecently`, `startApplying` | |
| journal kind `observation` | `hint` | worker return field `observations` → `hints` |
| `queue.drain`, `strategy.bootstrap`, `promo.compose`, `promo.post`, `board.health` | `queue.score`, `strategy.setup`, `promotion.draft`, `promotion.post`, `board.diagnose` | task types and skill files; `strategy.setup` subject id `bootstrap` → `setup`; payload `probeJob` → `testJob` |
| "marker", "stand-down" (prose) | "detail type", "stop" | `SKILL.md`, host comments, docs |

Kept on purpose: `cycle`, `heartbeat`, `journal`, `digest`, `check-in`, `stuck`,
`orchestrator`, `networking.warmIntro`, `job.rescanSkipped`. New names this plan introduces
follow the same rule: "task input" (not "packet"), and agent names that say what the agent does
(`job-scorer`, `job-applier`, `job-searcher`).

Migration `20261002000000_rename_pilot_task_list_and_runs`: renames the table, constraints,
indexes, columns and enums, rewrites stored task types, subject ids and payload keys, and nulls
the `task_list_*` columns so the server rebuilds the snapshot.

Remaining before merge:

- Apply the migration (`migrate deploy`) once the user confirms; the database is shared.
- One live cycle end to end with the new routes. API, web, host and plugin ship together.
- Possible follow-up: the host's `/healthz` field `Conducting` still carries the old
  "conductor" word.

## Milestone 2: token telemetry

- `apps/terminal/Pilot/`: a usage collector using the route milestone 0 chose (an OTLP endpoint
  on the host, or the session-log reader). It tags each usage event with the current run.
- Add to `pilot_runs`: `provider`, `model`, `inputTokens`, `outputTokens`, `cacheReadTokens`,
  `cacheWriteTokens`. The host posts them via `POST /api/pilot/runs/:id/usage` when the run
  finishes. Codex fills only the fields it reports.
- `costByTaskType` reads tokens from `pilot_runs` instead of run time. The web cost panel shows
  tokens per task type and per day.

Exit: an overnight run fills usage on `pilot_runs` for every task type, and the totals match the
baseline within reason.

## Milestone 3: the host checks for work before waking the model

- Before starting a run, the host calls `POST /api/pilot/tasks/refresh`, which also pulls mail
  on the server.
- No tasks: the host writes the empty-cycle journal entry itself (a `cycle` entry with
  `detail: {status: "empty", sleepSeconds}`) and sleeps `sleepSeconds`. Nothing is typed into
  the TUI, so the model never wakes.
- A `409` (pilot stopped) follows `PilotLoop`'s existing stop path.
- Delete the empty and stopped branches from `SKILL.md` step 1.

Exit: an idle overnight run creates no `pilot_runs` rows, only `cycle` journal entries.

## Milestone 4: the host runs the bookkeeping

The model receives one started run and returns one typed result. Everything around it is code.
The session stays in the TUI the whole time.

- Host flow per cycle: refresh, take the top task (the server's ranking is final; drop the
  goals-text tie-break), start a run, type `/clear` and `/jobpilot:pilot <runId>` into the TUI,
  wait for the result, post usage.
- Task input: built server-side as `GET /api/pilot/runs/:id/input`: the task payload plus
  what the task type needs, such as profile fields for applies, the resume id, relevant saved
  answers and site hints (milestone 6). The skill makes this one call in place of its own `GET`s
  for the same data.
- Typed result in `@jobpilot/contracts`: `pilotRunResultSchema` with `outcome`
  (`done | failed | needs_user`), `summary` (the journal action line), `subjectType`,
  `subjectId`, optional `detail` (the strategyReview, rescanSkipped and retryFailed detail
  types), and `hints` (0-3). The agent posts it as its last step:
  `jobpilot-api POST /api/pilot/runs/:id/result`. The API validates it with the Zod schema
  (a `400` names the bad field, and the agent fixes it and posts again), writes the journal
  batch, finishes the run with its outcome, and publishes an event.
- The host learns the run ended from that event (`PilotEventListener`), replacing the sentinel.
  Remove `SentinelParser` and the sentinel line from the skill.
- Stuck handling stays as it is: the session is still a TUI, so check-ins and skip directives
  still work. A run that never posts a result goes through the existing ladder, ending with the
  host finishing the run as `failed`.
- `plugin/skills/pilot/SKILL.md` shrinks to: read the task input, follow `tasks/<taskType>.md`,
  post the result. Setup, sense, decide, start, journal and finish move out of the skill.
  Run heartbeats stay with the agent, inside long branches.
- `tasks/*.md` that write their own journal lines or finish runs stop doing so.
  `search.discover.md` also loses its campaign-creation and run-result calls to the task input
  and the result endpoint.

Exit: tokens per `job.apply` and per `search.discover` drop against the milestone 2 numbers, and
no task type regresses in success rate over one overnight run.

## Milestone 5: specialized agents

Split by the kind of work, so each agent's body holds only what that work reads, and that body
sits before the varying input where the prompt cache reuses it. Every browser task runs in an
agent; the main session reads the task input, starts one agent, and posts the result.

| Agent | Work | Task types |
| --- | --- | --- |
| `job-scorer` | read a posting, build the digest, score, save the row (today's review and score modes) | `queue.score`, `campaign.scorePending`; review for the `apply` skill |
| `job-applier` | one application, blockers first (today's apply mode) | `job.apply`, `question.answered` (job), `board.diagnose` |
| `job-searcher` | one board search: paginate, dedupe, score rows in place, create `pending` rows | `search.discover` |
| `networking-worker` | unchanged, except `model: inherit` | `networking.*` |

Text-only task types (`interview.*`, `promotion.*`, `campaign.strategyReview`,
`inbox.review`) stay in the main session: short, and no browser.

- Replace `plugin/agents/job-worker.md` with `job-scorer.md` and `job-applier.md`, and add
  `job-searcher.md`. Each sets `model: inherit` (today's workers pin `sonnet`) and lists only
  the tools it uses.
  Point the `apply`, `auto-apply`, `search` and `resume-campaign` skills and the inline fallback
  in `_shared/setup.md` at the new names.
- **Blockers first.** `job-applier` order: open the posting, click Apply, handle login, take a
  narrowed snapshot of the form's questions, and check them against the profile and eligibility
  rules. A blocker returns `skipped` with the reason before any tailoring or letter. Then tailor,
  fill and submit as today. Multi-page forms check each page before moving on.
- **Docs in the body.** Copy into each agent the parts of `setup.md`, `untrusted-content.md`,
  `browser-tips.md`, `eligibility.md` and `digest-schema.md` that agent uses on every run.
  `form-filling.md` goes only into `job-applier`. Leave rarely needed docs (`solve-captcha`,
  `upwork-mcp.md`, the `auth.md` registration flow) as reads.
- **Codex.** `.codex/agents/*.toml` today tell Codex to read the `.md` at runtime, so nothing is
  cached. Generate each TOML from its `.md` (body into `developer_instructions`, no model) in the
  plugin build, not by hand.
- **Snapshot limits.** Posting body, form step, and results list each get a stated ceiling in
  the agent that reads them (today's guidance in `browser-tips.md` becomes a rule), with "narrow
  further" as the required response to an overflow.

Exit: tokens per applied job, per skipped job and per discovered job all drop against the
milestone 4 numbers; skip reasons for blocked jobs show the form question that blocked them.

## Milestone 6: saved answers and site hints

- **Saved answers.** New table `profile_answers`: `userId`, `key` (normalized question, e.g.
  `relocation`, `sponsorship`, `start_date`, `travel_percent`), `value`, `source`
  (`user | profile`), `questionId` (nullable), timestamps. When the user answers a
  `PilotQuestion`, the answer is saved if the question is reusable, never per-job ones like
  pre-submit approval or 2FA. Only user-given answers are stored; the model's guesses never
  become answers. The task input includes the answers whose keys match the form's questions; the
  worker uses them instead of asking. A web page lists and edits them.
- **Site hints.** Today `hint` journal entries (formerly `observation`) carry board facts.
  Promote them to a table `site_hints`: `domain`, `hint` (short text), `seenCount`,
  `lastSeenAt`, shared across users. A new hint that matches an existing one increments it. The
  task input includes the top few hints for the job's domain, as text advice the agent can ignore
  when the site has changed. Hints unseen for 60 days drop out.

Exit: a second application on the same site uses its hints, and a question answered once is not
asked again.

## Milestone 7: weekly budget

- Subscription limits are not published in tokens, so the budget is relative. After a week of
  `pilot_runs`, the settings page shows the pilot's real weekly use. The user sets a weekly token
  budget, defaulting to that measured week.
- The server enforces it in `RunService`. As the week's spend rises, lower-value task types
  stop being startable:
  - under 50%: everything;
  - 50-80%: no `job.rescanSkipped`, `job.retryFailed`, `promotion.draft`,
    `campaign.strategyReview`;
  - 80-100%: only `question.answered`, `interview.*`, and `job.apply` above the campaign's
    minimum score plus 10;
  - 100%: nothing until the weekly reset. The tasks response's `sleepSeconds` runs until then,
    and the journal says why.
- Starting a run reserves the task type's median cost (`pilot_runs`, last 7 days) and the run's real
  usage replaces the estimate when it lands.
- The web pilot page shows spend this week against the budget, by task type.

Exit: a deliberately low budget stops the pilot cleanly at its limit, and the journal explains it.

## Later, not in this plan

Each needs this plan's telemetry first:

- A second, text-only lane beside the browser lane (needs a `resourceKey` on runs).
- Ranking by expected value per token instead of fixed priorities.
- Strategist runs triggered by outcomes (every N new outcomes, or daily) with counts, not prose.
- A critic run after repeated identical failures on one domain, writing site hints.
- Public JSON job feeds (Greenhouse, Lever, Ashby) as API sources, following
  `api-job-sources.md`.
- Pooled learning across users.

## Risks

- **TUI telemetry may be partial.** OpenTelemetry or session logs might miss cache fields or a
  CLI might not export them. Milestone 0 finds out; the budget uses whatever is reported.
- **Typing into the TUI is less exact than a process API.** A slash command typed at
  the wrong moment can land mid-turn. The host only types when the session is idle, as
  `PilotLoop` does today.
- **The agent may skip posting its result.** The stuck ladder covers it, but a high rate means
  the skill's last step needs work. Track runs that end without a result in `pilot_runs`.
- **The rename shipped without aliases.** The API, web, host and plugin must deploy together with
  the migration; an old host or plugin against the new API fails on every route.
- **The browser profile is one folder.** The pilot and a user's interactive session cannot both
  drive the browser. Keep `PilotLoop`'s rule: when the user runs a session, the pilot waits.
- **Two contexts per run.** Each browser task now starts the main session and an agent. If
  milestone 0 shows starting an agent costs more than the docs it keeps out of the main session,
  revisit which tasks delegate.
- **Without a subagent** (or when delegation fails), the main session runs the agent's procedure
  inline, without the cached body. Track how often it happens.
- **The budget's 50/80/100 steps are guesses.** Tune them after a few weeks of real spend.
- **Codex reports usage differently.** Its columns may be partial; the budget uses what is there.

## Verification

- Each milestone: /verify, plus its exit check on a live overnight run.
- Compare `pilot_runs` before and after for each milestone: tokens per application, tokens per
  discovered job, and model runs per idle day.
- Success for the plan as a whole: more applications per week for the same weekly spend, with
  no drop in the share that succeeds.
