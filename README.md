<div align="center">

<img src="apps/web/public/icon.svg" width="96" alt="JobPilot logo" />

# JobPilot

**Your job search on autopilot - your machine, your subscription.**

[![Release](https://img.shields.io/github/v/release/suxrobGM/jobpilot?style=flat&color=FF6A3D)](https://github.com/suxrobGM/jobpilot/releases)
[![CI](https://github.com/suxrobGM/jobpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/suxrobGM/jobpilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)](https://dotnet.microsoft.com)

[**Open JobPilot →**](https://jobpilot.suxrobgm.net) &nbsp;·&nbsp; [Docs](https://jobpilot.suxrobgm.net/docs) &nbsp;·&nbsp; [How it works](docs/architecture.md) &nbsp;·&nbsp; [Changelog](CHANGELOG.md)

</div>

---

Write your instructions once and JobPilot takes the job search from there. The
**Pilot** runs perpetual **sense → decide → act** cycles that discover roles,
tailor your resume, fill out applications, and message recruiters on their own -
overnight, while you sleep. Prefer to stay hands-on? Four manual campaign modes
cover the same ground, step by step.

Either way, the agent - **Claude Code or Codex, running on your own
subscription** - drives a real browser on your own machine, so you can watch
every move. The dashboard keeps every application, reply, and interview in one
pipeline.

> **No API keys. No new bill.** The work runs on the Claude or Codex plan you
> already pay for, on hardware you control.

## What it does

- **The Pilot - your job search on autopilot.** Write your instructions once
  (goals, daily caps, active hours, saved searches) and the agent runs
  perpetual sense → decide → act → record cycles: it discovers and applies to
  jobs, checks for warm intros before cold applies, sends and follows up on
  outreach, reviews recruiter replies, and drafts interview prep and
  self-promotion posts. Every action is narrated in a live journal, questions
  reach your phone as one-tap cards, and hard caps are enforced server-side.
- **Four manual campaign modes.** Search-and-review, autonomous auto-apply,
  single-job apply, and recruiter outreach - for when you'd rather drive.
- **Any job board.** 12 built in - LinkedIn, Indeed, Glassdoor, Wellfound, Y
  Combinator, HN Who's Hiring, We Work Remotely, Remote OK, and more - plus any
  other board you add yourself. The agent drives a real browser, so nothing is
  off-limits.
- **A pipeline, not a spreadsheet.** Every application tracked through 9 stages,
  from applied to offer, with analytics on top.
- **An inbox that reads itself.** Recruiter replies are pulled from Gmail,
  classified, and matched to applications; you approve each stage move.
- **Resume studio.** Base resumes plus AI-tailored variants per job, rendered to
  PDF live.
- **First-class Upwork.** Client-quality filtering, targeted proposals, and
  profile enhancement.
- **Outreach.** Finds the hiring manager or recruiter and sends a personalized
  email or LinkedIn message.

## Get started

1. **Sign up** at [jobpilot.suxrobgm.net](https://jobpilot.suxrobgm.net) and
   complete onboarding - add your profile and a resume.
2. **Install the plugin** in Claude Code or Codex and run the `setup` skill; it
   installs and starts the local agent for you.
3. **Start a campaign** (or switch on the Pilot) and watch applications land in
   your pipeline.

The app runs in your browser; the agent and the browser it drives run on your
own computer, on your own Claude/Codex subscription - so nothing happens you
can't see. Curious how the pieces fit together? Read the plain-language
[how-it-works guide](docs/architecture.md).

### Install the plugin

In **Claude Code**:

```text
/plugin marketplace add https://github.com/suxrobgm/claude-plugins
/plugin install jobpilot@sukhrob-claude-plugins
/jobpilot:setup
```

In **Codex** (run both commands in a shell, start a new session, then run `$setup`):

```text
codex plugin marketplace add suxrobGM/codex-plugins
codex plugin add jobpilot@sukhrob-codex-plugins
```

The `setup` skill installs and starts the local agent terminal and opens the
dashboard. From then on, launch the agent anytime from the dashboard's agent
dock.

Need to install or repair the standalone terminal host on its own? Use a
one-liner below (the JobPilot plugin is still required before launching Codex
from the dashboard):

- **Windows (PowerShell):** `irm https://raw.githubusercontent.com/suxrobGM/jobpilot/main/apps/terminal/install.ps1 | iex`
- **macOS / Linux:** `curl -fsSL https://raw.githubusercontent.com/suxrobGM/jobpilot/main/apps/terminal/install.sh | bash`

New here? Start with the
[getting-started guide](https://jobpilot.suxrobgm.net/docs/getting-started).
Want to run it locally or contribute? See
[docs/development.md](docs/development.md).

## Skills

Every JobPilot action is a skill - a command you run from the agent. Claude Code
commands use `/jobpilot:<skill>`, Codex commands use `$<skill>`:

```text
/jobpilot:auto-apply senior typescript remote
$auto-apply senior typescript remote
```

In Codex, `/skills` opens the skill picker if you want to browse the installed
JobPilot skills. Direct invocation uses `$setup`, `$search`, and the other
`$<skill>` forms; `/setup` and `/jobpilot:setup` are not Codex skill commands.

| Skill               | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| **Pilot**           |                                                                                 |
| `pilot`             | One autonomous cycle - read the agenda, act on the top item, journal, exit. Driven by the Pilot host loop, not run by hand. |
| **Campaigns**       |                                                                                 |
| `search`            | Search a board, rank results against your resume, save them for review.         |
| `auto-apply`        | Search and apply autonomously, one job at a time, until done or capped.         |
| `apply`             | Apply to one job (URL or pasted posting) with a fit review, or drain the queue. |
| `resume`            | Resume an interrupted campaign and finish its remaining approved jobs.          |
| `rescan-skipped`    | Re-score a campaign's skipped jobs and promote the wrongly dropped ones.        |
| `outreach`          | Find the hiring manager or recruiter and send a personalized message.           |
| **Writing**         |                                                                                 |
| `cover-letter`      | Draft a tailored one-page cover letter, humanized.                              |
| `interview`         | Build a prep sheet: behavioral, technical, system design, company.              |
| `tailor-resume`     | Pick or create the best resume variant for a job (runs automatically).          |
| `extract-resume`    | Parse an uploaded resume PDF into the structured editor.                        |
| **Email**           |                                                                                 |
| `scan-inbox`        | Classify new mail, match it to applications, propose stage moves.               |
| `get-code`          | Pull the latest verification code or magic link for a board domain.             |
| **Upwork**          |                                                                                 |
| `upwork-search`     | Search Upwork, filter out low-quality clients, rank the rest.                   |
| `upwork-proposal`   | Draft a short, targeted Upwork proposal.                                        |
| `upwork-profile`    | Improve your Upwork overview and portfolio; writes back on approval.            |
| **Setup & helpers** |                                                                                 |
| `setup`             | Install, start, or update the local agent terminal.                             |
| `solve-captcha`     | Solve captchas - free vision path first, token service fallback.                |
| `humanizer`         | Rewrite generated text to read naturally; used by the writing skills.           |

Email (inbox scanning, verification codes, outreach sending) uses your own
Google OAuth client - see the
[email setup guide](https://jobpilot.suxrobgm.net/docs/email-setup).

## Documentation

- [User docs](https://jobpilot.suxrobgm.net/docs) - getting started, campaigns &
  skills, email setup, credentials, FAQ.
- [docs/architecture.md](docs/architecture.md) - how JobPilot works, in plain
  language.
- [docs/development.md](docs/development.md) - local setup, repository layout,
  tech stack, and architecture internals.

## License

MIT. The shared humanizer skill is based on the bundled upstream humanizer
package under [plugin/skills/humanizer/](plugin/skills/humanizer/), which ships
with its own LICENSE file.
