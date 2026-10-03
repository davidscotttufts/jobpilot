# Plan: Pilot v2, fewer tokens per application

## Status

| Milestone | State |
| --- | --- |
| 1. Rename | Done on `feat/pilot-v2` (commits "refactor(pilot)!: rename agenda to task list and claim to run" and "refactor(pilot)!: rename strategy tasks and the job digest to brief"). Migrations not applied; live run not done. |
| 0. Spike | Done (findings below). Subagent cost and Codex-in-TUI still unmeasured. |
| 3. Host checks first | Done on `feat/pilot-v2`. Checked live: an idle cycle wrote its own entry and woke no model. |
| 2. Token telemetry | Done on `feat/pilot-v2`. Migration `20261003000000` applied only to the local spike database. |
| 4. Host bookkeeping | Done on `feat/pilot-v2`. Checked live with a `search.setup` run; overnight run not done. |
| 5. Specialized agents | Done on `feat/pilot-v2`. `job-searcher` checked live; `job-scorer` and `job-applier` not run live (the spike account never applies). |
| 6. Saved answers | Done on `feat/pilot-v2`; site hints dropped (see Rejected). Migration `20261003120000` applied only to the local spike database. Web card checked in the browser at desktop and phone width. |
| 7. Weekly budget | Dropped 2026-10-03 (see Rejected). |
| 8. Pilot pages, graph, public page | Done on `feat/pilot-v2`. Checked live in the browser (desktop and phone; the app is dark-only). |

The rename ran before the spike so the spike and every later milestone use the final names.
Milestone 3 ran before 2 because it needs no telemetry: its exit check counts model runs, not
tokens.

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
   in place of tokens.

`/clear` itself is not a cost problem and stays. The prompt cache matches the prompt's opening
text, not the session. After `/clear`, the CLI system prompt and tools still hit a warm cache.
Keeping history would resend old cycles on every turn and eventually trigger auto-compaction.
Clearing also stops untrusted page content from carrying into the next cycle.

## Principles

- **The pilot runs in the interactive TUI.** Claude Code and Codex keep running as full TUI
  sessions in the PTY host, so the user watches every step live in the web terminal and can type
  into it. No headless mode (`claude -p`, `codex exec`) for the pilot.
- **Code does what is fixed; the model does what needs judgment.** Bookkeeping, ranking, policy,
  and caps live in the host and the API. The host drives the TUI by typing commands into
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
- **The server enforces every limit.** The model never polices its own caps.
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
- **A weekly token budget** (dropped as milestone 7 on 2026-10-03): the Claude or Codex
  subscription already caps weekly use, so a second, guessed budget in JobPilot is redundant.
  Savings come from spending fewer tokens per application, not from rationing them.
- **Site hints** (dropped from milestone 6 on 2026-10-03, along with worker `hints` and result
  `hints`): redundant, and a table shared across users would carry model-written text from
  untrusted pages into every other user's agent. The `hint` journal kind stays for old entries.
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
- Web changes: check them in the running app (`run` skill) in light and dark themes and at phone
  width before committing.
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

### Spike findings (live, 2026-10-03, local DB, Claude Code 2.1.283, `claude-sonnet-5`)

Telemetry route: OpenTelemetry for both CLIs, no session-log reader.

- **Claude Code.** OTLP/HTTP JSON works in the TUI (`OTEL_EXPORTER_OTLP_PROTOCOL=http/json`), set
  from the settings file's `env` block. Each `api_request` log record carries `input_tokens`,
  `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `model`, `cost_usd`,
  `prompt.id`, `query_source` and `skill.name`. One typed `/jobpilot:pilot` is one `prompt.id`;
  `/clear` keeps `session.id`. Records also carry the account email, so nothing stores them raw.
- **Codex** (`codex-cli 0.160.0`, checked with one `exec` call; the TUI uses the same exporter).
  `otel.exporter={otlp-http={endpoint=".../v1/logs",protocol="json"}}` works. `codex.sse_event`
  with `event.kind=response.completed` carries `input_token_count` (cached tokens included),
  `output_token_count`, `cached_token_count`, `cache_write_token_count` and `model`; some counts
  arrive as `stringValue`.
- **Prompt suggestions.** Claude Code makes an extra `prompt_suggestion` request after each turn.
  `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false` turns it off.
- **Driving the TUI.** The host's `/clear` then `/jobpilot:pilot` lands and runs on Claude.
  Arguments reach a skill as `$ARGUMENTS` (Claude) or as plain prompt text after `$pilot` (Codex);
  not yet tried live with an argument.
- **Not measured yet:** subagent tagging and start cost (no task in the spike delegated), Codex in
  the TUI, and apply cycles (the spike account must never submit a real application).

Baseline (dev host, so the session also loads the repo's CLAUDE.md and rules; an installed host
starts smaller). "usd" is `cost_usd`, the API-price equivalent, used here only to compare cycles.

| Cycle | Requests | Output | Cache read | Cache write | usd |
| --- | --- | --- | --- | --- | --- |
| Error exit (no resume), cold cache | 14 | 2.2K | 871K | 70K | 0.48 |
| Idle, after milestone 3 | 0 | 0 | 0 | 0 | 0 |
| `search.setup` | 14 | 2.7K | 948K | 31K | 0.34 |
| `search.discover`, 10 jobs saved, 7 min | 57 | 21K | 5.4M | 107K | 1.72 |
| `search.discover`, prompt suggestions off (milestone 2) | - | 19K | 3.2M | 118K | - |
| `search.setup`, milestone 4 (host bookkeeping) | - | 1.0K | 294K | 27K | - |
| `search.discover` via `job-searcher`, 10 jobs, 2.4 min (milestone 5) | - | 13K | 1.6M | 93K | - |

What it shows:

- The fixed context is about 62K tokens, re-read on every request. Cost tracks requests times
  context, so fewer turns (milestone 4) and smaller per-agent context (milestone 5) are the levers.
- Bookkeeping is most of a short cycle: setup's real work is two POSTs, yet it took 14 requests.
- Discover runs in the main session with no worker, as the context section says.

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
| `queue.drain`, `strategy.bootstrap`, `promo.compose`, `promo.post`, `board.health` | `queue.score`, `search.setup`, `promotion.draft`, `promotion.post`, `board.diagnose` | task types and skill files; `search.setup` subject id `bootstrap` → `setup`; payload `probeJob` → `testJob` |
| "marker", "stand-down" (prose) | "detail type", "stop" | `SKILL.md`, host comments, docs |
| `campaign.strategyReview`, detail type `strategyReview` | `campaign.tune`, `tune` | task type, skill file, `campaignTunes`, `tuneTask`. "Strategy" named two unrelated tasks and no model; "review" already meant four other things. |
| job digest (`Job.digest`, `digest-schema.md`, `score-fit {digest}`, worker input `digest`) | job brief (`Job.brief`, `job-brief.md`, `score-fit {brief}`, `brief`) | column `jobs.digest` → `jobs.brief`, contracts, scoring, job listings, every plugin skill. "Facts" was rejected: it collides with the resume facts in `tailoring/facts.ts`. |

Kept on purpose: `cycle`, `heartbeat`, `journal`, `digest` (now only the morning journal
summary), `check-in`, `stuck`,
`orchestrator`, `networking.warmIntro`, `job.rescanSkipped`. New names this plan introduces
follow the same rule: "task input" (not "packet"), and agent names that say what the agent does
(`job-scorer`, `job-applier`, `job-searcher`).

Migration `20261002000000_rename_pilot_task_list_and_runs`: renames the table, constraints,
indexes, columns and enums, rewrites stored task types, subject ids and payload keys, and nulls
the `task_list_*` columns so the server rebuilds the snapshot. It also rewrites the `strategy`
task types and the `strategyReview` detail type in journal entries; it was edited in place since
it has never been applied.

Migration `20261002120000_rename_job_digest_to_brief`: renames `jobs.digest` to `jobs.brief`
and the `digest` key in stored run payloads.

Remaining before merge:

- Apply both migrations (`migrate deploy`) once the user confirms; the database is shared.
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

As built, simpler than above:

- The host serves `POST /v1/logs` (OTLP/HTTP JSON) and `UsageMeter` sums `api_request` and
  Codex `response.completed` records. The shipped `plugin/settings/claude.json` (`env`) and
  `codex.json` (`otel.exporter`) point the CLIs at it; no launch code changed. The Claude settings
  also turn off prompt suggestions.
- The meter restarts when the cycle command is sent. After the cycle, the host posts the total to
  `POST /api/pilot/usage` with `cycleSeconds` (elapsed on the host's own clock, so clock skew
  can't miss the run), and the server sets it on the newest run started in that window. No run id
  is needed before milestone 4. A cycle that started no run (an error exit) is not stored.
- Columns: `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`.
  No `provider` column: the model name says which CLI ran.
- `costByTaskType` and the activity page's cost card use the sum of all four token counts. No
  per-day view.

## Milestone 3: the host checks for work before waking the model

- Before starting a run, the host calls `POST /api/pilot/tasks/refresh`, which also pulls mail
  on the server.
- No tasks: the host writes the empty-cycle journal entry itself (a `cycle` entry with
  `detail: {status: "empty", sleepSeconds}`) and sleeps `sleepSeconds`. Nothing is typed into
  the TUI, so the model never wakes.
- A `409` (pilot stopped) follows `PilotLoop`'s existing stop path.
- Delete the empty and stopped branches from `SKILL.md` step 1.

Exit: an idle overnight run creates no `pilot_runs` rows, only `cycle` journal entries.

As built: `CycleRunner` refreshes after the other-provider check (so a user's own session does not
poll the refresh) and before starting the CLI, so an idle pilot does not launch it at all. Any
refresh failure, including the stopped `409`, retries in a minute; the stop event parks the loop
first. The skill reads `GET /api/pilot/tasks` (the host's fresh snapshot) instead of refreshing
again, and keeps one empty branch for the race where the work goes away after the host checked.

## Milestone 4: the host runs the bookkeeping

The model receives one started run and returns one typed result. Everything around it is code.
The session stays in the TUI the whole time.

- Host flow per cycle: refresh, take the top task (the server's ranking is final; drop the
  goals-text tie-break), start a run, type `/clear` and `/jobpilot:pilot <runId>` into the TUI,
  wait for the result, post usage.
- Task input: built server-side as `GET /api/pilot/runs/:id/input`: the task payload plus
  what the task type needs, such as profile fields for applies, the resume id, relevant saved
  answers (milestone 6). The skill makes this one call in place of its own `GET`s
  for the same data.
- Typed result in `@jobpilot/contracts`: `pilotRunResultSchema` with `outcome`
  (`done | failed | needs_user`), `summary` (the journal action line), `subjectType`,
  `subjectId`, optional `detail` (the tune, rescanSkipped and retryFailed detail
  types). The agent posts it as its last step:
  `jobpilot-api POST /api/pilot/runs/:id/result`. The API validates it with the Zod schema
  (a `400` names the bad field, and the agent fixes it and posts again), writes the journal
  batch, finishes the run with its outcome, and publishes an event.
- The result endpoint also writes the run's `cycle` entry (`status`, the snapshot's
  `sleepSeconds`), since the activity probe's completion check reads it. A repeat post for a
  finished run returns that run instead of a `409`, so a retry after a lost response is safe.
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

As built, simpler than above:

- Measured: `search.setup` went from 948K to 294K cache-read tokens (about 69% less) and from
  2.7K to 1.0K output, in about 40 seconds. Rows from milestone 2 on come from `pilot_runs`,
  which has no request count or `cost_usd`.
- Usage posts to `POST /api/pilot/runs/:id/usage` now that the host holds the run id; the
  milestone 2 time-window match is gone.
- No task input endpoint yet: the skill reads `GET /api/pilot/runs/:id` (task type, subject,
  payload) and its task file loads the rest as before. Profile and saved answers in
  one call come with milestones 5 and 6, when the agents that use them exist.
- `pilotRunResultSchema` outcome is `done | failed`; a parked job is `done` with a question
  filed, so `needs_user` added nothing. `POST /runs/:id/result` journals the action
  under `cycleId = runId`, finishes the run, and publishes `run.finished`; a repeat post for a
  finished run returns it unchanged.
- The host writes every `cycle` entry (status, the refresh's `sleepSeconds`), fails a run that
  never posted a result, and reads the finish from `run.finished` or a poll of the run every
  2 minutes. `SentinelParser` and the activity probe's completion fallback are gone.
- Task files keep their "Journal: ..." wording; `SKILL.md` maps a journal line to the result's
  `summary` and a journal `detail` to its `detail`. `search.discover` keeps its own search
  run-result call for now.

## Milestone 5: specialized agents

Split by the kind of work, so each agent's body holds only what that work reads, and that body
sits before the varying input where the prompt cache reuses it. Every browser task runs in an
agent; the main session reads the task input, starts one agent, and posts the result.

| Agent | Work | Task types |
| --- | --- | --- |
| `job-scorer` | read a posting, build the brief, score, save the row (today's review and score modes) | `queue.score`, `campaign.scorePending`; review for the `apply` skill |
| `job-applier` | one application, blockers first (today's apply mode) | `job.apply`, `question.answered` (job), `board.diagnose` |
| `job-searcher` | one board search: paginate, dedupe, score rows in place, create `pending` rows | `search.discover` |
| `networking-worker` | unchanged, except `model: inherit` | `networking.*` |

Text-only task types (`interview.*`, `promotion.*`, `campaign.tune`, `search.setup`,
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
  `browser-tips.md`, `eligibility.md` and `job-brief.md` that agent uses on every run.
  `form-filling.md` goes only into `job-applier`. Leave rarely needed docs (`solve-captcha`,
  `upwork-mcp.md`, the `auth.md` registration flow) as reads.
- **Codex.** `.codex/agents/*.toml` today tell Codex to read the `.md` at runtime, so nothing is
  cached. Generate each TOML from its `.md` (body into `developer_instructions`, no model) with a
  script, and add a test that fails when a TOML is stale. Update `.claude/rules/plugin.md`, which
  says there is no generation step. Codex agent TOML has no `tools` key, so tool lists are
  Claude-only.
- **Snapshot limits.** Posting body, form step, and results list each get a stated ceiling in
  the agent that reads them (today's guidance in `browser-tips.md` becomes a rule), with "narrow
  further" as the required response to an overflow.

Exit: tokens per applied job, per skipped job and per discovered job all drop against the
milestone 4 numbers; skip reasons for blocked jobs show the form question that blocked them.

As built:

- Measured: a 10-job `search.discover` went from 5.4M cache-read tokens (baseline) and 3.2M
  (after milestone 2) to 1.6M, in 2.4 minutes instead of 7.
- Codex agents are not generated in a build: `CodexProvider.PrepareWorkspace` writes
  `.codex/agents/*.toml` from `plugin/agents/*.md` (body inlined as `developer_instructions`) at
  every Codex session start, as it already mirrors skills. Nothing can go stale, so no check is
  needed; the repo's hand-written TOMLs are gone and `.codex/agents/` is ignored.
- Sponsorship stays as the 2026-07-15 rule set it: only a JD-stated no-sponsorship policy skips.
  A form that reveals one is answered truthfully and the application finishes, with a `note`.
  `job-applier`'s form blockers are citizenship, clearance, location, an unmet hard requirement
  and an answer only the user can give (`needs_user` `category:"question"`, new).
- Snapshot ceilings: posting body ~12 KB, form step ~16 KB, results list ~4k tokens; over the
  ceiling means narrow further.

## Milestone 6: saved answers

- **Saved answers.** New table `profile_answers`: `userId`, `key` (normalized question, e.g.
  `relocation`, `sponsorship`, `start_date`, `travel_percent`), `value`, `source`
  (`user | profile`), `questionId` (nullable), timestamps. When the user answers a
  `PilotQuestion`, the answer is saved if the question is reusable, never per-job ones like
  pre-submit approval or 2FA. The agent sets `key` when it files the question; the server never
  guesses it from the text. Only user-given answers are stored; the model's guesses never
  become answers. The task input includes the answers whose keys match the form's questions; the
  worker uses them instead of asking. A web page lists and edits them.
Exit: a question answered once is not asked again.

As built, simpler than above:

- `profile_answers` has no `source` or `questionId`: only user-given answers are stored, and
  questions are swept after 30 days, so the id would dangle. `PilotQuestion.answerKey` (set by
  `job-applier` for a reusable fact) is what makes an answer saved; `two_factor` and `approval`
  answers never are.
- No task input endpoint: callers load `GET /api/pilot/answers` into the applier input
  (`campaign-flow.md`).
- The web card sits on the Instructions tab below the instructions form (outside it), with edit
  and delete; there is no create, since answers come from questions. The web app has one (dark)
  theme, so "light and dark" is one check.

## Milestone 8: pilot pages, agent graph and public page

Milestones 2 and 6 each ship their own small UI (token cost panel, saved answers card). This
milestone brings the rest of the web in line with the new shape (the host
checks first, the server picks one task, one specialized agent does it) and redesigns the
agent graph. It starts after milestone 5, when the shape is settled.

**Data the graph needs.** Today the overview guesses the active stage from the newest journal
entry's kind (`STAGE_BY_KIND` in `orchestration-panel.tsx`), and the state carries only an
`activeRuns` count.

- Add `currentRun` to `PilotState` in `@jobpilot/contracts`: `{id, taskType, startedAt}` or
  null. The run start/finish events already published by the API refresh it.
- Map task types to agents in one place, next to the labels in
  `components/features/pilot/task-types.ts`: `job-searcher`, `job-scorer`, `job-applier`,
  `networking-worker`, or `session` for text-only task types.
- Token figures (this run, this week per agent) come from milestone 2's stats grouped by agent,
  not a new endpoint.

**Agent graph on the pilot overview** (`overview/orchestration-panel.tsx`, `flow-nodes.tsx`).
Replace the four fixed stages (Orchestrator, Agent, Worker, Results) with the real path:

```text
Host ──► Server ──► Session ─┬─► Searcher ──┐
                             ├─► Scorer ────┤
                             ├─► Applier ───┼─► Journal
                             ├─► Networker ─┤
                             └─ text tasks ─┘
```

- **Host:** "checked 4 min ago, nothing to do" when idle, so the user sees the model stays
  asleep (milestone 3); next wake time as today.
- **Server:** the picked task's title, or why nothing is startable (cap reached, awaiting
  setup).
- **Session:** the current run's task type and how long it has run.
- **Agents:** one node each; the one running `currentRun` lights up with its edge animated, the
  others stay dim with their tokens this week as the caption. Text-only runs light the direct
  session-to-journal edge.
- **Journal:** the run's result summary once posted, else applied today against the daily cap.
- Off and offline states keep today's muted look and hints. Same ReactFlow setup, themed
  surfaces and palette tokens (no new hex values). At phone width the branch stacks vertically
  instead of shrinking the canvas.

**Other pilot pages.**

- Overview: the status hero and today panel show tokens this week.
- Activity: idle checks write `PilotState.nextWakeAt` through `POST /api/pilot/cycles/idle`
  instead of a journal entry. Each run row shows its agent and tokens, joined from `PilotRun`.
- Admin `pilots-table.tsx`: tokens this week per user, so heavy users are visible.

**Public main page** (`marketing/sections/pilot.tsx`, `pilot-cycle.tsx`).

- Redesign the ring as the same graph in visitor language, matching the overview's shape:
  "checks for work" → "picks the best next step" → one of "finds roles", "scores them",
  "applies", "reaches out" → "writes the journal". It stays a server component with a CSS-only
  animation that walks one branch per loop; no ReactFlow, no data, and reduced motion keeps it
  still.
- Copy: "Let it work" says it only wakes the model when there is work. No internal words (run, task type,
  agent names) on the public page.
- `app/docs/pilot/page.mdx`: describe the specialized agents and idle checks, with
  the same diagram.

Exit: on a live run the overview lights the agent that matches the current run's task type, and
idle hours show as collapsed quiet rows. Both graphs look right in light and dark themes and at
phone width (checked in the browser, not only typechecked).

As built:

- The host's cycle entry for a working cycle carries `taskType` and `tokens` in its detail, so the
  Activity page shows each run's agent and tokens with no join. `PilotState.currentRun` drives the
  graph, refreshed by `run.started` (new, from `RunService.start`) and `run.finished` (now also
  from a host-failed run).
- The task-type-to-agent map and agent labels live in `task-types.ts` next to the task labels.
- Checked live with a `job.rescanSkipped` run: Session lit with its task and elapsed time and the
  "text tasks" edge animated; the run's row read "Session · 525.1K tokens"; one empty cycle read
  "Quiet 20:10, 1 check". Admin "Tokens (7d)" column added. The public page's demo video still
  shows the old overview; re-record it with the `teaser-video` skill.

## Later, not in this plan

Each needs this plan's telemetry first:

- A second, text-only lane beside the browser lane (needs a `resourceKey` on runs).
- Ranking by expected value per token instead of fixed priorities.
- Strategist runs triggered by outcomes (every N new outcomes, or daily) with counts, not prose.
- Public JSON job feeds (Greenhouse, Lever, Ashby) as API sources, following
  `api-job-sources.md`.
- Pooled learning across users.

## Risks

- **TUI telemetry may be partial.** OpenTelemetry or session logs might miss cache fields or a
  CLI might not export them. Milestone 0 found both CLIs report what is needed.
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
- **Codex reports usage differently.** Its cached tokens sit inside its input count; the
  host splits them out so both CLIs fill the same columns.

## Verification

- Each milestone: /verify, plus its exit check on a live overnight run (milestone 8: a live
  cycle and a browser check of the overview, activity and public pages).
- Compare `pilot_runs` before and after for each milestone: tokens per application, tokens per
  discovered job, and model runs per idle day.
- Success for the plan as a whole: more applications per week for the same weekly spend, with
  no drop in the share that succeeds.
