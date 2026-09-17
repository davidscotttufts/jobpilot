# Fork customizations

What this fork deliberately does differently from upstream (suxrobGM/jobpilot), so an upstream
sync keeps it. One entry per behaviour, not per commit. Rule 1 of `SKILL.md` protects every entry;
drop an entry once upstream covers it, and note the PR.

Last reviewed: 2026-09-17 (fork `main` ca597c80, 51 commits ahead of upstream, 43 behind).

## Deliberate overrides of upstream values

- **`MAX_OPEN_APPLY_CLAIMS` stays 100, not 20** (`apps/api/src/modules/pilot/agenda/constants.ts`).
  It bounds the stale sweep's exclusion list; a claim past it can have its live job reset
  mid-apply.
- **The instructions form round-trips every config field it has no control for**
  (`maxConcurrentApplies`, `reviewFirstApplies`) and passes `jobAlerts` through from the latest
  state (`apps/web/src/components/features/pilot/instructions/form-schema.ts`). Rebuilding the
  config from the form alone hands the schema's defaults back and silently resets them.
- **The exact-URL duplicate arm has no 30-day window** (`applied-guard`); only the fuzzy
  title+company arm expires. Upstream PR #34, open.

## Pilot and apply loop

- **Job alert email harvest** - `inbox.jobAlerts` agenda kind, `EmailMessage.links`/`harvestedAt`,
  `PilotState.jobAlertsRequestedAt`, `/pilot/job-alerts` routes, the Job alert emails card at the
  top of the Pilot overview, `plugin/skills/pilot/kinds/inbox.jobAlerts.md`. Upstream PR #37,
  open (ported onto upstream: schedule helpers there are self-contained in
  `packages/contracts/src/pilot/schedule.ts`).
- **Pilot searches can repeat on chosen weekdays** - `cadence`/`cadenceDays`/`cadenceHour`/
  `cadenceTimeZone`, `nextWeeklyRun`, the repeat controls on campaign rows.
- **Apply concurrency** - `maxConcurrentApplies` enforced server-side, the in-flight reservation
  scan (an `applying` row is a reservation; PR #30 open), browser leasing per claim, and a second
  Playwright MCP server (`playwright-2`) that `job-worker` may use.
- **Claim lifetime cap** - `MAX_CLAIM_LIFETIME_MS` for every claim kind, heartbeats included.
  PR #29, open.
- **Never auto-retry an application that may already be submitted** - the submit-attempt stamp,
  the recovery hold on every route back into an apply, and `confirmNotSubmitted` as its exit.
- **Review the first applications** - `reviewFirstApplies` holds the first N for approval.
- **Record what was submitted** - `answers` and `phases` on the job result.
- **Surface stuck work** - jobs only a person can finish, unanswered questions that drop a job,
  and board-drift detection (a board serving a second host).
- **Conversion and threshold cost** in the pilot stats, with the read-backwards caveat.

## Web

- **Load failures are shown, not rendered as empty** - data-table load-error overlay and
  `QuerySection` error states. PR #31, open.
- **Accessibility and theme fixes** from the grade-ux audit: inbox count announcement, contrast
  fixes, type-scale step, Portfolio single `h1`.
- **React StrictMode on in dev.**
- **Campaign actions on the rows**, with a repeat control on both.
- **Web dev server gets a larger heap** - `NODE_OPTIONS=--max-old-space-size=2048` in the
  `apps/web/package.json` `dev` script.

## Terminal host

- **Serialize terminal session starts** so a remount cannot open two. PR #32, open.
- **The dev stack supervises the host** and one dev service no longer kills the others.

## Local environment and repo hygiene

- **Local database is the `jobpilot-db` Docker container** on `:5433`, reproducible and backed up
  (`db:backup`/`db:restore`), not an SSH tunnel.
- **Docker Desktop is capped at 2 GB memory / 512 MB swap** on this Mac (machine setting, not in
  the repo).
- **`.gitignore` additions** for local strays and the pilot's cycle files by family.
- **Project skills** that exist only here: `grade-ux`, `sync-upstream`, and `docs/` review notes.

## Already upstream (kept for history - no longer needs protecting)

- PR #25 pty winsize on Apple silicon, PR #26 block a second application to a job, PR #27 docs on
  `localhost:5433` - merged upstream, taken as theirs in the 2026-09 sync (`bcf90a66`).
