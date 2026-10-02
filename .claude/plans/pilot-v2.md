# Plan: Pilot v2, fewer tokens per application

## Context

The pilot works: the server ranks the agenda, claims gate the work, the journal records it, and
cycles keep no state. Its cost is the problem. A user who leaves it running can spend a large
share of a weekly Claude or Codex limit, and most of that spend does not move an application
forward.

Where the tokens go today (reviewed 2026-10-01):

1. **The model does the bookkeeping.** Each cycle runs `/clear`, loads
   `plugin/skills/pilot/SKILL.md` and `_shared/setup.md`, then spends model turns on fixed steps:
   health check, cycle id, `GET /api/pilot`, agenda refresh, claim, journal, release, sentinel.
   Every turn resends the context.
2. **Idle wakes find nothing.** `PilotLoop.RunOnceAsync` checks only the run state, not the
   agenda. An idle pilot wakes the model every `checkIntervalMinutes` (default 30). That is longer
   than the default 5-minute prompt cache, so each wake probably rewrites the prompt into the
   cache, then spends about five turns learning the agenda is empty. That is up to 48 wakes a day.
3. **Worker docs miss the cache.** A `job-worker` gets its varying input JSON first, then reads
   about 20 KB of shared docs. Content placed after a varying prefix is not reused across workers.
4. **The worker writes before it checks.** Apply mode tailors the resume and writes the letter
   before it looks at the form, where sponsorship and clearance blockers often show up.
5. **One model for everything.** The session model (`sonnet`, `plugin/settings/claude.json`) runs
   discovery, bookkeeping and form filling alike.
6. **No token numbers.** `costByKind` (`apps/api/src/modules/pilot/pilot.stats.ts`) uses run time
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
  and `PilotClaim` already has versions, heartbeats and a lifetime cap. A second copy drifts.
- **Several LLM agents in parallel, each with a browser:** multiplies spend, invites bot
  detection, and the Playwright profile allows one browser per folder anyway.
- **Per-user experiments and learning:** one user produces too few replies to separate signal
  from noise. Learning, if any, pools results across all users later.
- **LLM scoring per job, embeddings:** scoring is already code (`modules/scoring/fit.ts`).
- **Automatic prompt rewriting:** needs a saved-page eval lab first. Out of scope.

## Execution process

- Branch `feat/pilot-v2` from `main` before any change.
- One milestone at a time, in order. After each: run /verify, then commit (subject only, no
  co-author trailers).
- Migrations: hand-author the SQL folder and apply with `migrate deploy` (see the migration-drift
  memory). Hold `db:migrate:apply` until the user confirms, since the database is shared.
- C# changes: rebuild and restart the host (`restart-terminal` skill) before any live check.
- Milestone 0 is a spike. Its findings go into this file before milestone 1 starts.

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
  Confirm the host can switch models mid-session (`/model haiku`, Codex `/model`) by typing, and
  measure what a switch does to the prompt cache.
- **Cache after `/clear`.** Read cache read versus cache write for a few back-to-back cycles.
  A one-off script in the scratchpad, not committed.
- **Baseline.** Tokens per cycle by kind, for idle, apply and discover cycles.

Exit: a short "Spike findings" section added to this file, with the telemetry route per CLI, the
TUI commands that work, and the baseline numbers.

## Milestone 1: rename jargon and ambiguous names

Done first so every later milestone writes new code with the final names. One commit covers the
API, contracts, api-client, web, host, plugin skills and a data migration. No aliases or old
routes kept; CHANGELOG history and dated logs keep the old words.

### The core words

Today the pilot uses agenda, agenda item, claim, cycle, and (before 2026-07-21) lease. After this
pass:

- **task**: one piece of work the server ranked (was agenda item). The ranked list is the **task list**
  (was agenda). "Task" is already the word users see.
- **run**: one attempt at one task by the agent (was claim). A claim already has a start, a
  heartbeat, an expiry, a finish and an outcome, which is what a run is; milestone 2 adds its
  token usage to the same row instead of a second `pilot_runs` table keyed by `claimId`.
  Starting a run reserves the task, as claiming does today.
- **cycle** stays: one pass of the host loop that asks the server for tasks. A cycle starts at
  most one run; after milestone 3 most cycles start none. ("Check" was tried and rejected: it
  collides with check-in, `checkIntervalMinutes` and health checks, and sounds read-only.)

`lease` is already gone from code. It survives only in applied migrations, which stay as they
are, and in `.claude/plans/api-job-sources.md`, which gets fixed in this pass.

### Table

| Now | New | Where |
| --- | --- | --- |
| agenda | task list | `/api/pilot/agenda*` → `/api/pilot/tasks*` (response `{taskList}`, its `items` → `tasks`), `modules/pilot/agenda/` → `tasks/`, `AgendaService` → `TaskListService`, `agendaResponseSchema` → `taskListSchema` |
| agenda item | task | `agendaItem` → `task`, `AgendaItem` → `PilotTask`, `agendaItemSchema` → `taskSchema`, claim body `itemId` → `taskId` |
| `agendaVersion`, `agendaSnapshot`, `agendaGeneratedAt`, `agendaExpiresAt` | `taskListVersion`, `taskListSnapshot`, `taskListBuiltAt`, `taskListExpiresAt` | `PilotState` columns, start-run body |
| kind (of a task or claim) | `taskType` | `PilotClaim.kind`, task items, `costByKind` → `costByTaskType`, `skills/pilot/kinds/` → `skills/pilot/tasks/`. The journal and question enums keep `kind`. |
| claim | run | `PilotClaim` / `pilot_claims` → `PilotRun` / `pilot_runs`, `ClaimService` → `RunService`, `/api/pilot/claims*` → `/api/pilot/runs*`, `claimId` → `runId`, `activeClaims` → `activeRuns`, `agendaClaimFieldsSchema` → `taskFieldsSchema`, release route → `/runs/:id/finish` |
| claim / release (verbs) | start / finish | `claims.claim()` → `runs.start()`, `grantedAt` → `startedAt`, `releasedAt` → `finishedAt`, "claimable" → "startable" |
| `PilotClaimOutcome` | `PilotRunOutcome` | Values unchanged: `done`, `failed`, `abandoned`, `expired`. |
| `claimDamped` | `ranRecently` | "Damped" is jargon for "run recently, so ranked lower". |
| `claimJobForApply` | `startApplying` | `campaign/jobs/apply-guard.ts`. It moves a job to `applying` and was never a pilot claim. |
| journal kind `observation` | `hint` | `PilotJournalKind`. Milestone 6 turns these into `site_hints`. |
| `queue.drain` | `queue.score` | It scores pasted links; "drain" says nothing about what happens to them. |
| `strategy.bootstrap` | `strategy.setup` | It creates the first searches. |
| `promo.compose`, `promo.post` | `promotion.draft`, `promotion.post` | Match the `Promotion` model and its `draft` status. |
| `board.health` | `board.diagnose` | It diagnoses a failing board; "health" reads like a status. Payload `probeJob` → `testJob`. |
| "marker", "stand-down" (prose) | "detail type", "stop" | `SKILL.md`, host comments, docs |

Kept on purpose: `heartbeat`, `journal`, `digest`, `check-in`, `stuck`, `orchestrator`,
`networking.warmIntro` (a standard recruiting term), `job.rescanSkipped` (matches the
`rescan-skipped` skill).

New names this plan introduces follow the same rule: the data the host hands the agent is the
"task input" (not "packet"), and the model level is a "tier".

- Migration: rename the table, columns and enum values (`ALTER TYPE ... RENAME VALUE`), rewrite
  stored task-type strings in `pilot_runs`, and null the `task_list_*` columns so the server rebuilds it.
- Confirm the table with the user before starting; drop any row they reject.
- Afterwards, update the pilot-vocabulary memory.

Exit: `rg` finds none of the old names outside CHANGELOG, applied migrations and dated logs;
/verify passes; one live run completes with the new routes.

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

Exit: tokens per `job.apply` and per `search.discover` drop against the milestone 2 numbers, and
no task type regresses in success rate over one overnight run.

## Milestone 5: the worker checks for blockers first, and costs less to start

- `plugin/agents/job-worker.md` apply mode, new order: open the posting, click Apply, handle
  login, take a narrowed snapshot of the form's questions, and check them against the profile and
  eligibility rules. A blocker returns `skipped` with the reason before any tailoring or letter.
  Then tailor, fill and submit as today. Multi-page forms check each page before moving on.
- Move what every run needs into the agent's body so it sits before the varying input and gets
  cached: the parts of `setup.md`, `untrusted-content.md`, `browser-tips.md` and
  `eligibility.md` that every mode uses. Leave rarely needed docs (`solve-captcha`,
  `upwork-mcp.md`, `auth.md` registration flow) as reads. Same for `networking-worker.md`.
- Snapshot limits per mode written into the worker: posting body, form step, and results list
  each get a stated ceiling (today's guidance in `browser-tips.md` becomes a rule), with "narrow
  further" as the required response to an overflow.

Exit: tokens per applied job and per skipped job both drop; skip reasons for blocked jobs show
the form question that blocked them.

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

## Milestone 7: model per task

- Each task type gets a model tier in one server-side table: `fast` (Haiku-class), `standard`
  (Sonnet-class), `strong` (Opus-class). The task input carries it.
- How the tier is applied in the TUI, per milestone 0's findings:
  - Workers: the skill passes the tier as the subagent's model when it starts a `job-worker` or
    `networking-worker`. The main session's model and cache stay untouched. This covers most of
    the spend, since browser work happens in workers.
  - Main session: the host types `/model <name>` before the run only when the tier differs from
    the current one. If milestone 0 shows a switch throws away the cache, the host orders
    same-tier tasks together where the ranking allows.
- Starting assignments, to be checked against milestone 2 numbers: `search.discover`,
  `queue.score`, `inbox.review`, `upwork.syncInbox`, `campaign.scorePending` on `fast`;
  `job.apply`, `networking.*`, `interview.reply` on `standard`; `campaign.strategyReview`,
  `interview.prep`, `promotion.draft` on `strong` (they run rarely).
- Escalation: a run may post `outcome: "escalate"` with a reason (an unfamiliar form, a
  CAPTCHA). The API finishes the run, and the next run of that task uses one tier up.
  Escalations are counted per task type and domain, so a task type that always escalates gets
  moved up.

Exit: the `fast` task types keep their success rate over an overnight run at lower tokens per
run.

## Milestone 8: weekly budget

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
- **Typing into the TUI is less exact than a process API.** A slash command or `/model` typed at
  the wrong moment can land mid-turn. The host only types when the session is idle, as
  `PilotLoop` does today.
- **The agent may skip posting its result.** The stuck ladder covers it, but a high rate means
  the skill's last step needs work. Track runs that end without a result in `pilot_runs`.
- **The rename touches everything at once.** A missed reference breaks the pilot. Keep it in one
  commit, grep for every old name, and run one live run before merging.
- **The browser profile is one folder.** The pilot and a user's interactive session cannot both
  drive the browser. Keep `PilotLoop`'s rule: when the user runs a session, the pilot waits.
- **Cheaper models may fail more** in ways that cost more than they save. Milestone 7 is judged
  by tokens per success, not per run.
- **The budget's 50/80/100 steps are guesses.** Tune them after a few weeks of real spend.
- **Codex reports usage differently.** Its columns may be partial; the budget uses what is there.

## Verification

- Each milestone: /verify, plus its exit check on a live overnight run.
- Compare `pilot_runs` before and after for each milestone: tokens per application, tokens per
  discovered job, and model runs per idle day.
- Success for the plan as a whole: more applications per week for the same weekly spend, with
  no drop in the share that succeeds.
