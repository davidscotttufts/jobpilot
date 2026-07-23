# Changelog

All notable changes to this project will be documented in this file.

## [2.1.20] - 2026-07-22

### Fixed

- Jobs the pilot finds now reach the public jobs board. Discovery was saving them
  without the tech-stack summary the index is built from, so almost nothing it
  found appeared on /jobs.
- Postings discovered before this fix stay missing until a later search finds
  them again - their tech stack was never recorded.

## [2.1.19] - 2026-07-22

### Removed

- Parked boards are gone. Setting a board aside was rarely worth the extra
  control, so the setting and its chips have been removed from Instructions -
  to stop working a board, drop it from your Boards list instead. Any boards
  you had parked are simply back in rotation.

### Changed

- When a board fails repeatedly the pilot still probes it once - usually that
  re-establishes an expired login on the spot - but it no longer interrupts you
  to ask whether to park it. It writes what it found to the journal and keeps
  going.

## [2.1.18] - 2026-07-22

### Added

- The pilot now owns its searches. Instead of a saved-search list you edit, it
  derives searches from your goals, tracks how many new jobs each one yields,
  and re-checks a productive search every couple of hours while backing a dry
  one off to 8, 24, then 48 hours. Discovery keeps paging a board until it hits
  the run's new-jobs target rather than stopping after the first page.
- The Instructions page lists those searches read-only - why the pilot created
  each one, its yield, when it is next due, and whether it is backing off.

### Changed

- Goals are now required before the pilot can run, and they are its only
  steering input: the resume-derived fallback and the goals question are gone.
  The editor is larger, auto-expanding, and resizable to match.
- Enable/disable is now start/stop end to end, and the local host checks with
  the server before each cycle - stopped means it stands down, and an
  unreachable API backs off instead of burning the cycle.

### Fixed

- A discovery campaign now tracks its search by id, so the pilot rewriting a
  search's query no longer orphans the campaign and opens a duplicate, and two
  searches sharing a query on different boards no longer collide.

## [2.1.17] - 2026-07-22

### Fixed

- On Linux and macOS, the terminal host no longer dies when an agent process
  exits: stopping an already-dead pty now counts as a clean stop, and a failing
  read falls back to the normal end-of-output path instead of taking the whole
  host down mid-pilot-run.

## [2.1.16] - 2026-07-22

### Changed

- Each pilot cycle now starts from a clean provider conversation, so a long
  run can no longer auto-compact mid-cycle and page content from one cycle
  cannot linger into the next. Check-ins and skips still keep the context of
  the cycle they are answering.

## [2.1.15] - 2026-07-22

### Added

- Cycle cards and the status hero show the cycle outcome and when the pilot
  wakes next, and the orchestration diagram now reads the same source so the
  two can no longer disagree.
- The landing page gains an animated diagram of the pilot's sense/act/record
  cycle, and the Pilot docs page is rebuilt around it with new FAQ entries on
  caps, agenda ordering, crash recovery, and questions.

### Changed

- Idle campaigns are finalized during the pilot's agenda refresh instead of
  waiting for an agent cycle that never came up in the queue.
- Discovery reuses an in-progress campaign for a saved search instead of
  spawning a duplicate one.
- The default job boards shrink to LinkedIn, Indeed, Hiring Cafe, and We Work
  Remotely - the only ones that ever produced jobs. The rest stay available in
  the picker, except Glassdoor, which is gone. Removing a default board now
  sticks, and board ordering follows the global list unless you override it.
- The `resume` skill is now `resume-campaign`, so it no longer collides with
  the resume-document skills in the picker.
- Journal kind filters run on the server, so paging under a filter stays on one
  stream.
- Temporary agent scratch files are aged out on a 6-hourly sweep alongside the
  Playwright ones.
- A pass over the app's UI puts headings, status chips, dialogs, timestamps,
  and page layout on shared primitives; every dashboard and admin page now has
  its own browser-tab title. The push-settings device list is restyled.
- Landing, README, and docs copy rewritten to read plainly, with the onboarding
  order corrected to install - setup - account.

### Fixed

- Paging a filtered journal no longer skipped entries or jumped page sizes.
- A stuck cycle now records what went wrong instead of an empty detail.
- Auto-apply campaigns launched from the apply skill used a leftover 0-10 score
  threshold instead of the configured minimum match score.
- A public job listing rendered a mangled "ago Â· first found" separator.
- Corner radii were tripled on several surfaces, long device and project titles
  slid under their action buttons, and twelve labels rendered off the type
  scale.

## [2.1.14] - 2026-07-21

### Added

- A daily cleanup job trims accumulated history - pilot journal entries, released
  claims, answered questions, expired tokens, and old application events - so the
  database stops growing without bound.
- The docs sidebar on phones becomes a collapsible section navigator that shows
  the page you are on, replacing the scrolling pill row.

### Changed

- Pilot vocabulary is consistent everywhere: leases are claims, and stall/nudge/
  watchdog are now stuck/check-in/orchestrator. Instruction cadence fields read
  "Check every (hours)" and "Post every (days)".
- The auto-apply stop pill is hidden on small screens.

### Fixed

- A cycle's completion is confirmed against the API, so garbled terminal output
  can no longer stall the pilot; a wake that arrives mid-cycle no longer aborts it.
- A crashed pilot cycle retries in two hours instead of pausing the campaign for
  a full day.
- The cleanup job no longer deletes rows the pilot still needs, and only runs
  against production.
- A burst of stuck signals can no longer burn an entire cycle's time budget at once.
- Push notifications show the app icon.
- Fixed pilot agenda snapshot and digest errors in production.
- The retention sweep and the pilot activity check are indexed, so neither scans
  whole tables.
- `VAPID_SUBJECT` must now be a valid URL, caught at startup instead of at send time.
- Corrected the tab strip shadow to use the theme palette.

## [2.1.13] - 2026-07-20

### Added

- Paused campaigns are surfaced in the pilot view, and campaign status changes
  now record who or what made them.

### Changed

- The portfolio moved out of settings into its own page.
- The campaign pipeline funnel was removed from the campaign view.
- Database timestamp and id handling was normalized, with the migration history
  squashed into a single baseline.

### Fixed

- Signed-in visitors are no longer redirected away from the landing page.
- Leasing enforces a single open lease per subject, so two pilot cycles can no
  longer claim the same work.
- The campaign config write is guarded directly instead of checked beforehand,
  closing a race between concurrent updates.

## [2.1.12] - 2026-07-20

### Added

- Live pilot orchestration diagram on the overview, per-cycle timeline cards for
  pilot activity, and a campaign pipeline funnel with a live stage pulse.
- Scored pending jobs are auto-promoted, so a campaign no longer stalls waiting
  for a manual approve after scoring.
- Campaign jobs are paged and filtered server-side, with a skip/fail reason
  breakdown that covers every job instead of the first page.
- Batch scoring, lease heartbeats, and bounded discover cycles in the agent
  skills, so long pilot runs stay within budget.
- Human-friendly timestamps with timezone in the pilot logs.
- Stopping the terminal from the dock now shuts the host app down cleanly.

### Changed

- Campaign summaries are now derived live from job rows instead of persisted
  snapshots, and campaign/job/pilot columns moved to native enums and JSON with
  a validated clean-break migration.
- Campaign staleness detection is pilot-aware, self-heals, and uses a 15-minute
  threshold.

### Fixed

- A job nothing could score (dead URL, login wall) re-won every pilot cycle and
  permanently starved discovery; scoring is now rate-limited per campaign.
- Bulk re-apply dropped selections made on other pages and reported partial
  success as total failure.
- Pilot sections no longer render a failed query as an empty state ("Nothing
  needs your attention" while the pilot sat blocked on a question).
- An overdue pilot wake time read as "wakes in 45m" instead of due now; dates
  follow the user's locale again.
- Watchdog escalation is gated on real API activity, with tighter stall
  heuristics.
- Disabling push notifications now removes the server-side subscription before
  tearing down the local one, so re-enabling no longer orphans the old endpoint.
- A failed host stop left the dock spinner up for the full 45-second timeout;
  it now reports the failure.
- Batched job promotion no longer exhausts the database connection pool.

## [2.1.11] - 2026-07-19

### Fixed

- Disabling the pilot now interrupts the agent's in-flight cycle instead of
  letting it keep working; the session stays alive and any leased job recovers
  automatically.

## [2.1.10] - 2026-07-19

### Fixed

- The terminal host stored its pilot pairing file in a doubly nested
  `.jobpilot/.jobpilot/` folder; it now lives directly in the install root.
  Re-pair (or move the old `pilot.json` up one folder) after updating.

## [2.1.9] - 2026-07-19

### Added

- A compact pilot status card on the workspace overview, showing at a glance
  whether the pilot is running, starting up, or waiting on the local agent.
- Pilot self-setup: if you haven't configured any saved searches, the pilot now
  derives its goals and searches from your profile on its next quiet cycle.
- Parked boards: set aside job boards you don't want the pilot to use and manage
  them from one place.

### Changed

- Pilot instructions no longer have an active-hours schedule; advanced settings
  are tucked into an accordion to keep the form focused.

## [2.1.8] - 2026-07-19

### Added

- Public portfolio and "hire me" pages with a username-based URL, plus a
  leaderboard, all wired into the dashboard.

### Fixed

- Toggle button selected state is now more visible.

## [2.1.7] - 2026-07-19

### Changed

- The "outreach" feature is now called "networking" throughout the app, so the
  labels, URLs, and agent workflows all use one consistent name.

## [2.1.6] - 2026-07-18

### Fixed

- The terminal no longer auto-types the provider name ("claude" / "codex") as a
  prompt when a session starts or restarts.

### Changed

- The Windows terminal executable now carries the J-bot app icon.

## [2.1.5] - 2026-07-18

### Added

- Pilot features - an autonomous campaign mode where the agent scores, applies,
  and reports on queued jobs with less hands-on steering.

### Changed

- New "J-bot" brand mark across the web app, with refreshed app icons and
  realigned SEO metadata.
- Documentation clarifies how JobPilot uses your Claude/Codex subscription and
  when an AI key is required.

## [2.1.4] - 2026-07-15

### Changed

- Cover letters are shorter (150-250 word body) and built around one lead angle
  with 1-2 proof points instead of a fixed five-block skeleton, so letters no
  longer come out structurally identical. The humanizer also catches three new
  templated patterns (paragraph-final JD tie-backs, spaced hyphens standing in
  for em-dashes, and contrast framing).
- Campaigns skip postings whose job description explicitly states no visa
  sponsorship (an exact quote is required) when the profile needs sponsorship;
  these skips are permanent and never re-promoted by rescans. A JD that is
  silent on sponsorship still proceeds, with a risk note in the match reason.
- Application forms answer sponsorship questions truthfully - never to pass a
  screen - and tailored resume summaries mirror 2-3 JD keywords without trait
  lists or contrast phrasing.

## [2.1.3] - 2026-07-14

### Added

- Salary preferences in the profile. Set up to five optional entries - each with
  a free-text "applies to" label (e.g. "Senior/Staff roles"), a min/max range,
  currency, and per-year or per-hour period - and the agent answers expected-salary
  questions on application forms with the best-matching entry instead of pausing.
  It still asks (once per campaign) when nothing matches or the list is empty.
- Public job pages: a deduplicated `/jobs` index with detail pages, a tech-stack
  filter with active-filter chips, and a landing page that funnels into it. Works
  on mobile.
- Admin section behind a SUPER_ADMIN > ADMIN > USER role ladder: platform stats,
  user management, the job-board catalog, and job-listing moderation.

### Changed

- Job boards are one global catalog with per-profile links instead of per-profile
  copies; `bun run db:seed` relinks existing profiles to the defaults.
- Buttons, inputs, and toggles share one control height across the web app.

### Fixed

- Mobile layouts: the app shell, docs sidebar, and landing-page nav now fit a
  phone.
- The landing page prerenders fully - the live jobs strip no longer blocks it -
  and the brand mark links home.
- Activity timeline days are bucketed as real dates, so day boundaries no longer
  shift with the viewer's timezone.

### Internal

- Feature modules each carry their own admin controller, shared Prisma error-code
  helpers, shared TabStrip/SearchField components, and simplified web components.

## [2.1.2] - 2026-07-12

### Fixed

- "Start agent" now launches the installed agent. On a machine that had also run
  the agent from a source checkout, the `jobpilot://` link launched that build
  instead, which then reported itself as a broken install and left the dashboard
  stuck on "Reinstall the JobPilot agent". Only an installed agent may claim the
  link now, and a source build releases a claim it made earlier.

### Security

- Inbox events are now scoped per user. Every connected client shared one stream,
  so one user's inbox sync progress and scanned-message events reached all other
  connected users, and a new subscriber could replay other users' history.
- The login and captcha endpoints are rate-limited. Login is limited per account
  and per network, so a single account under attack cannot lock out everyone
  behind a shared connection, and captcha solving is limited per user with a cap
  on how many solves may be in flight at once.
- Agents now treat job postings and email as data, never as instructions. A
  posting or message that tells the agent to run a command, follow a link, or
  reveal its credentials is reported as a finding instead of obeyed, and
  verification links from email must point at the job board they claim.

### Changed

- The Codex marketplace now ships the full skill tree, so a Codex agent launched
  from the dashboard has every skill its Claude counterpart does.
- Agents keep scratch files under the workspace's `.temp` directory.

### Internal

- Line endings are pinned to LF on all platforms (Windows checkouts reported
  phantom lint failures), Biome runs clean, and `bun test` is bootstrapped in
  `apps/api` with cross-user isolation coverage. Added the delivery roadmap under
  `.claude/roadmap/`.

## [2.1.1] - 2026-07-11

### Changed

- Maintenance release: no user-facing changes. Internally, the terminal host
  dropped redundant code and simplified the updater's staging and relaunch
  paths, dependencies were upgraded (including TypeScript 7), and linting and
  formatting moved from ESLint and Prettier to Biome.

## [2.1.0] - 2026-07-09

### Added

- One-click agent updates: the dashboard's agent dock now has an "Update now"
  button that updates the local agent in place, with live updating / restarting
  status, instead of copy-paste instructions. Manual steps remain as a fallback.
- Launch the agent from the browser: a `jobpilot://` link on the offline card
  starts a stopped agent without opening a shell (Windows).
- Bug report and feature request templates, plus feedback links in the app.

### Changed

- Onboarding is plugin-first, and the read-only dashboard now works on mobile.
- Email settings: better defaults in the Google OAuth client form and clearer
  setup instructions.

### Fixed

- The agent terminal restores its screen on reload instead of coming back blank,
  and a session that dies instantly no longer appears to still be running.
- Updating the agent no longer strands the old and new hosts on the same port,
  and a browser disconnect mid-update no longer silently cancels it. Files a new
  release drops are now pruned.
- The agent dock no longer flickers offline during an expected restart, leaks
  sockets on unmount, or remounts the terminal on a theme change. Failed
  starts, stops, and provider mismatches now surface accurate messages.
- Large pastes into the terminal are no longer silently dropped.
- Mobile navigation menu rendering.
- Browser autofill no longer overwrites the OAuth client form; fixed the inbox
  connect link.

### Security

- The terminal host now restricts which web origins may reach it. Previously any
  page visited while the agent ran could inject keystrokes or commands into the
  running agent session. Origins come from an allowlist covering the dev and
  hosted web apps, applied to both CORS and WebSocket upgrades. Callers can also
  no longer choose the agent's working directory.

### Internal

- Added a `tests/JobPilot.Terminal.Tests` suite (71 tests) and a `terminal` CI
  job that includes a real NativeAOT publish, so compile and trimming errors
  surface in CI rather than at a tagged release.
- Restructured the terminal host (acyclic namespaces, update path behind DI
  services) and removed the redundant `PluginUpdater` and its
  `jobpilot-plugin.tar.gz` release asset.
- Removed the unused resume-backups mechanism and `dek_key_id` column;
  single-sourced docker-compose healthchecks.

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
