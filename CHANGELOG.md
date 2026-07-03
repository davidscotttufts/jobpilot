# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- Email settings: better defaults in the Google OAuth client form and clearer
  setup instructions.

## [2.0.5] - 2026-07-03

### Added

- Agent dock: the Claude update flow now runs `/reload-plugins`, so plugin
  updates load without restarting the session.

## [2.0.4] - 2026-07-02

### Added

- Published the plugin to a dedicated Codex marketplace
  ([suxrobGM/codex-plugins](https://github.com/suxrobGM/codex-plugins)).

### Fixed

- Cleaned up the setup skill's update instructions and the agent update
  banner formatting.

## [2.0.3] - 2026-07-02

### Added

- Agent update banner in the dashboard that walks you through updating the
  local agent when a new version ships.

### Fixed

- Terminal host session management (missing API client import).

## [2.0.2] - 2026-07-02

### Fixed

- The terminal host now passes the web app's API origin to the agent as
  `JOBPILOT_API`, so skills always call the right backend.

## [2.0.1] - 2026-07-02

### Fixed

- The terminal host now binds `:4102` from any working directory (content
  root pinned to the executable's directory).

## [2.0.0] - 2026-06-30

JobPilot 2.0 turns the single-user local tool into a hosted, multi-user
platform. The web dashboard and API are hosted and shared; the agent still
runs on your machine, on your own Claude or Codex subscription, driving a
real browser. Sign up, install the local agent, and run campaigns from the
dashboard.

### Added

- **Accounts** - email + password sign-up with verification and password
  reset. Secrets (board logins, captcha keys, Gmail tokens) are encrypted
  at rest with a per-user key.
- **API server** ([apps/api/](apps/api/)) - Bun + Elysia + Prisma on
  PostgreSQL owns all state. Skills call it over HTTP with a per-user token
  the terminal injects - no local files, no direct DB access.
- **Dashboard** ([apps/web/](apps/web/)) - a 9-stage application pipeline,
  campaign pages with live progress, analytics, inbox, outreach contacts,
  resume studio (base resumes + tailored variants with live PDF render),
  cover letters, Upwork pages, settings, and an onboarding wizard.
- **Agent dock** - the dashboard embeds a terminal that installs, launches,
  and monitors the local agent ([apps/terminal/](apps/terminal/), a .NET
  host on `:4102`) and switches between Claude Code and Codex.
- **Email integration** - connect Gmail through your own Google OAuth
  client. The `scan-inbox` skill classifies recruiter replies and proposes
  stage moves you approve in the inbox; the read scope also feeds
  verification codes to `get-code` during applies.
- **Live updates** - SSE channels (`campaign`, `inbox`, `pipeline`,
  `resume`, `upwork`) keep every open page current while the agent works.
- **New skills** - `setup`, `resume`, `rescan-skipped`, `outreach`,
  `scan-inbox`, `get-code`, `solve-captcha`, `extract-resume`,
  `tailor-resume`, `upwork-search`, and `upwork-profile` join the existing
  pack.
- **Worker subagents** - `job-worker` and `outreach-worker` run the heavy
  per-job browser work in an isolated context, so long campaigns don't
  fill the main conversation.
- **12 seeded job boards** - LinkedIn, Indeed, Glassdoor, Hiring Cafe,
  Wellfound, Y Combinator, Welcome to the Jungle, HN Who's Hiring,
  We Work Remotely, Remote OK, 4 Day Week, and Upwork.

### Changed

- **`Run` is now `Campaign`** everywhere - database, `/api/campaigns/*`
  routes, SSE channels, the `/campaigns` UI, and skill arguments.
  `maxApplicationsPerRun` is now `maxApplicationsPerCampaign`.
- **`autopilot` is now `auto-apply`** - the same autonomous search-and-apply
  loop, rebuilt around campaigns with per-job results reported to the API.
- Skills reference shared docs by relative path (`../shared/<doc>.md`).

### Removed

- The single-user Next.js + SQLite app on `:8000` and its file-based state
  (`profile.json`, `applied-jobs.json`, `runs/*.json`, the URL queue
  files).

## [1.3.0] - 2026-03-24

### Added

- `apply-batch` skill for applying to multiple jobs from a file of URLs with scoring and batch approval
- `jobs-to-apply.example.txt` template file for batch apply

## [1.2.0] - 2026-03-22

### Added

- Persistent applied-jobs database (`applied-jobs.json`) to prevent duplicate applications across runs and skills
- `scripts/check-applied.sh` to check if a job URL was already applied to
- `scripts/log-applied.sh` to log successful applications to the database
- Relocation preferences (`willingToRelocate`, `preferredLocations`) in work authorization config
- Strengthened `browser_snapshot` guidance to always use `ref` parameter for targeted snapshots

### Changed

- All shell scripts now use `jq` only (removed `node` and `python3` fallbacks) for simpler permissions
- Improved context window efficiency with targeted browser snapshots

## [1.1.0] - 2026-03-22

### Added

- `dashboard` skill for application tracking stats and CSV export
- Multi-resume support (`personal.resumes` in profile.json)
- Salary range filter (`minSalary`/`maxSalary` in autopilot config)
- Smart retry with `retryNotes` on failed applications for better retry strategies
- `scripts/run-stats.sh` for aggregating stats across runs
- `scripts/export-csv.sh` for exporting applications to CSV

## [1.0.0] - 2026-03-21

### Added

- Initial release of JobPilot plugin
- `apply` skill for automated job application form filling via Playwright
- `cover-letter` skill for generating tailored cover letters
- `upwork-proposal` skill for generating Upwork proposals
- `search` skill for searching and ranking job board results
- `interview` skill for generating interview prep Q&A
- `humanizer` submodule integration for natural tone rewriting
- Profile system with `profile.json` for storing personal info and credentials
- Job board configuration support (LinkedIn, Indeed)

- `autopilot` skill for autonomous batch job applications
- Progress tracking in `runs/` directory with resumable JSON files
- Autopilot configuration section in `profile.json` (minMatchScore, maxApplicationsPerRun, skipCompanies, skipTitleKeywords, defaultStartDate)
- Resume and retry-failed support for interrupted or failed autopilot runs
