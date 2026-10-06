# Fork customizations

What this fork deliberately does differently from upstream (suxrobGM/jobpilot), so an upstream
sync keeps it. One entry per behaviour, not per commit. Rule 1 of `SKILL.md` protects every entry;
drop an entry once upstream covers it, and note the PR.

Last reviewed: 2026-10-05 (pilot v2 sync: 138 upstream commits in, 68 fork commits carried).

## Deliberate overrides of upstream values

- **The instructions form round-trips `jobAlerts`**, which it has no control for, from the latest
  state (`apps/web/src/components/features/pilot/instructions/instructions-tab.tsx`, `toConfig`).
  Rebuilding the config from the form alone hands the schema's defaults back and silently resets it.

## Pilot and apply loop

- **Parallel applies, one browser each** - rebuilt on pilot v2 as a `job.applyBatch` task: one run
  holding up to `maxConcurrentApplies` (1-3, default 1) approved jobs, so the host's one-run loop is
  untouched. The task list emits it only when the budget has room for two
  (`pilot/tasks/build.ts` `applyTasks`); `startApplyBatch` (`pilot/tasks/apply-batch.ts`) rechecks
  the daily cap counting in-flight applies and drops entries the apply guards refuse;
  `applyJobRefs` makes expiry, cancel and the stale sweep treat every batch job like a `job.apply`.
  The session gives each `job-applier` its own `browserServer` (`playwright`, `playwright-2`,
  `playwright-3` in `plugin/.mcp.json`, separate profiles); `ScratchCleaner` sweeps all three.
- **Job alert email harvest** - `inbox.jobAlerts` task type (`pilot/tasks/gather-inbox.ts`,
  priority 505, not held by the apply cap), `EmailMessage.links`/`harvestedAt`,
  `PilotState.jobAlertsRequestedAt` ("run now", lapses after an hour or once a run starts after
  it), `/pilot/job-alerts` routes (`pilot/job-alerts.controller.ts`),
  `POST /email/job-alerts/harvested`, the Job alert emails card under the Pilot status bar, the Run
  job alert button on the workspace, `plugin/skills/pilot/tasks/inbox.jobAlerts.md`. Upstream PR
  #37, open (predates v2 - needs a port before it can merge).
- **Pilot searches repeat on chosen weekdays, with per-search overrides** - `cadence`/`cadenceDays`/
  `cadenceHour`/`cadenceTimeZone` (`nextWeeklyRun` in contracts `pilot/schedule.ts`), `minScore`/
  `maxApplications` overriding the pilot-wide values (and `search.discover`'s `maxApplications`),
  create-with-`campaignId` to repeat an existing campaign, the repeat controls on campaign rows.
- **Idle wake honours search cooldown** - `earliestSearchWake` / `cooldownEndsAt` in
  `pilot/tasks/run-history.ts`. Upstream's wake uses the earliest `nextRunAt`, so an overdue but
  damped search kept the pilot cycling every 30s.
- **Never auto-retry an application that may already be submitted** - the submit-attempt stamp
  (`POST /campaigns/:id/jobs/:key/submit-attempt`, called by `job-applier` before submit), the
  recovery hold in `patchJob` on every route back into an apply, `confirmNotSubmitted` as its only
  exit, and `recoverApplyingJobs` replacing upstream's silent re-approve in both run expiry/cancel
  and the stale-applying sweep (`pilot/tasks/maintenance.ts`, `run.service.ts`). Recovery and
  board-drift answers are routed in `plugin/skills/pilot/tasks/question.answered.md`.
- **Record what was submitted** - `phases` (`Job.phaseTimings`) and `answers` (`submittedAnswers`)
  on the job result; `job-applier` returns them as `phases`/`submitted`. `report:phases` script.
- **Surface stuck work** - the analytics needs-you list, the push when an unanswered question drops
  a job, skip a parked question or its application (`/pilot/questions/:id/skip`,
  `/skip-application`), and board-drift detection (`job-board/drift-sweep.ts`, run every 12th task
  list refresh).
- **Conversion and threshold cost** in analytics (`analytics/outcomes.ts`, `score-threshold.ts`),
  with the read-backwards caveat.
- **Gmail sync never loses mail silently** - catch-up syncs respect the quota, and every history
  page is read before the cursor moves (`email/gmail.provider.ts`, `sync/sync.service.ts`). PR #41,
  open.
- **Skill hygiene** - `printf '%s\n' "$X" | jq`, never `echo`; `get-code` finds reset mail and
  follows its tracking redirect; forms filled one page per `browser_fill_form`.
- **FlexJobs' `click.mg.flexjobs.com` folds onto `flexjobs.com`** (`application/job-url.ts`).

## Web

- **Extra load-error states** - `QuerySection` error states on boards and applications, where
  upstream's PR #31 data-table overlay does not reach.
- **Accessibility and theme fixes** from the grade-ux audit: inbox count announcement, contrast
  fixes (error/info `contrastText`), Portfolio single `h1`.
- **React StrictMode on in dev.**
- **Campaign actions on the rows**, with a repeat control on both; "Run this campaign again"
  (`/campaigns/new?from=`).
- **The Orchestration card collapses**, remembered per browser (`hooks/use-persisted-boolean.ts`,
  which upstream deleted as dead code). PR #40, open.
- **Web dev server gets a larger heap** - `NODE_OPTIONS=--max-old-space-size=2048` in the
  `apps/web/package.json` `dev` script.

## Terminal host

- **Kill the provider's process tree** when it ignores the stop hangup - 3s grace in
  `Sessions/PtyProcess.cs` `Dispose()`.
- **The dev stack supervises the host** (`Hosting/ServiceInstaller.cs`, `--install-service`, used by
  the setup skill) and one dev service no longer kills the others (`concurrently` without `-k`).

## Local environment and repo hygiene

- **Local database is the `jobpilot-db` Docker container** on `:5433`, reproducible and backed up
  (`db:backup`/`db:restore`, `docker-compose.dev.yml`), not an SSH tunnel.
- **Docker Desktop is capped at 2 GB memory / 512 MB swap** on this Mac (machine setting, not in
  the repo).
- **`.gitignore` additions** for local strays, credentials, `backups/`, and the pilot's cycle files.
- **Project skills** that exist only here: `grade-ux`, `grade-code`, `grade-data`,
  `grade-ai-exchange`, `sync-upstream`, and `docs/` review notes.

## Retired (kept for history - no longer protected)

- 2026-10 sync: the claim-era browser lease API and parallel job-workers (parallel applies came
  back as `job.applyBatch`, above), `reviewFirstApplies` (never wired; user declined to rebuild it),
  and the `MAX_OPEN_APPLY_CLAIMS = 100` override.
- Taken as upstream's in the 2026-10 sync: PR #29 claim lifetime cap (`MAX_RUN_LIFETIME_MS`), PR
  #30 in-flight reservation (`findApplyingSibling`), PR #31 data-table load errors, PR #32
  serialized terminal starts, PR #34 exact-url dedupe without a window, the hard-blocked board
  backoff (upstream's 24h `board.diagnose` cooldown), and the API error-body fix (`jobpilot-api`
  prints it).
- PR #25 pty winsize on Apple silicon, PR #26 block a second application to a job, PR #27 docs on
  `localhost:5433` - merged upstream, taken as theirs in the 2026-09 sync (`bcf90a66`).
