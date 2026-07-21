<div align="center">

<img src="apps/web/public/icon.svg" width="96" alt="JobPilot logo" />

# JobPilot

**An AI agent that applies to jobs for you - on the Claude or Codex subscription you already have.**

[![Release](https://img.shields.io/github/v/release/suxrobGM/jobpilot?style=flat&color=FF6A3D)](https://github.com/suxrobGM/jobpilot/releases)
[![CI](https://github.com/suxrobGM/jobpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/suxrobGM/jobpilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)](https://dotnet.microsoft.com)

[**Open JobPilot →**](https://jobpilot.suxrobgm.net) &nbsp;·&nbsp; [Docs](https://jobpilot.suxrobgm.net/docs) &nbsp;·&nbsp; [How it works](docs/architecture.md) &nbsp;·&nbsp; [Changelog](CHANGELOG.md)

</div>

---

Job searching is a second job: the same forms, the same tailoring, the same
follow-ups, every day. JobPilot hands that work to an AI agent that runs on
your own computer. It searches the boards, tailors your resume for each
posting, fills out the applications, messages recruiters, and files every
reply - while a hosted dashboard keeps score. It's free and MIT-licensed.

<!-- TODO: dashboard screenshot -->

> **Uses your subscription, not an AI API key.** Claude Code or Codex performs
> the AI work, so JobPilot uses the limits included with your existing
> subscription. You do not need to provide an Anthropic or OpenAI API key, and
> JobPilot does not add a separate per-token AI charge.

The agent drives a real browser on your machine, logged in as you - so you can
watch every click and step in whenever you like. The dashboard stores your
profile, resumes, campaigns, and application history.

## What it does

- **Finds and applies to jobs.** Search any of the built-in boards - LinkedIn,
  Indeed, Hiring Cafe, Wellfound, Y Combinator, HN Who's Hiring, We Work
  Remotely, Remote OK, and more - or add your own. The agent scores each
  posting against your resume, then applies one at a time or works through an
  auto-apply campaign up to the limits you set. Screening questions, tailored
  resumes, and cover letters included.

- **Runs on its own with the Pilot.** Give it your goals and daily caps, and
  the Pilot keeps the whole search moving - finding roles, applying, following
  up - and asks you (by push notification) when only you can answer. You wake
  up to a journal of what it did.

- **Handles the people side.** It finds the recruiter or hiring manager behind
  a posting and drafts a personal message for email or LinkedIn. Connect Gmail
  and it also reads recruiter replies, matches them to your applications, and
  proposes the pipeline update - you approve every move.

- **Keeps everything tracked.** Applications flow from submitted to offer in
  one pipeline with analytics on top. Resume variants are versioned and
  exported to PDF, so you always know which resume went where. Upwork gets the
  same treatment: job search, client-quality filters, and drafted proposals.

## Get started

1. Install the JobPilot plugin for Claude Code or Codex using the instructions
   below.
2. Run the `setup` skill. It installs the local terminal companion, starts the
   agent, and opens the dashboard.
3. [Create an account](https://jobpilot.suxrobgm.net) and complete onboarding -
   the agent parses your uploaded resume into your profile.
4. Start with a search campaign. Review the matches, then apply to selected jobs
   or create an auto-apply campaign.

### Install the plugin

#### Claude Code

Run these commands in Claude Code:

```text
/plugin marketplace add https://github.com/suxrobgm/claude-plugins
/plugin install jobpilot@sukhrob-claude-plugins
/jobpilot:setup
```

#### Codex

Run these commands in a shell:

```text
codex plugin marketplace add suxrobGM/codex-plugins
codex plugin add jobpilot@sukhrob-codex-plugins
```

Start a new Codex session, then run:

```text
$setup
```

After setup, you can launch the agent from the agent dock in the dashboard.

### Install the terminal companion manually

Use one of these commands if you need to install or repair the terminal
companion without running the setup skill. The JobPilot plugin is still required
to launch Codex from the dashboard.

- **Windows (PowerShell):** `irm https://raw.githubusercontent.com/suxrobGM/jobpilot/main/apps/terminal/install.ps1 | iex`
- **macOS / Linux:** `curl -fsSL https://raw.githubusercontent.com/suxrobGM/jobpilot/main/apps/terminal/install.sh | bash`

For a guided walkthrough, see the
[getting-started guide](https://jobpilot.suxrobgm.net/docs/getting-started).

## Skills

Skills are the commands JobPilot adds to Claude Code and Codex. The command name
is the same in both; only the prefix changes:

```text
/jobpilot:auto-apply senior typescript remote
$auto-apply senior typescript remote
```

In Codex, use `/skills` to browse installed skills. To run one directly, use the
`$<skill>` form, such as `$search` or `$setup`.

| Skill             | Purpose                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `search`          | Search a board, rank results against your resume, save them for review.         |
| `auto-apply`      | Search and apply autonomously, one job at a time, until done or capped.         |
| `apply`           | Apply to one job (URL or pasted posting) with a fit review, or drain the queue. |
| `resume`          | Resume an interrupted campaign and finish its remaining approved jobs.          |
| `networking`      | Find the hiring manager or recruiter and send a personalized message.           |
| `cover-letter`    | Draft a natural, job-specific one-page cover letter.                            |
| `interview`       | Build a prep sheet: behavioral, technical, system design, company.              |
| `scan-inbox`      | Classify new mail, match it to applications, propose stage moves.               |
| `get-code`        | Pull the latest verification code or magic link for a board domain.             |
| `upwork-search`   | Search Upwork, filter out low-quality clients, rank the rest.                   |
| `upwork-proposal` | Draft a short, targeted Upwork proposal.                                        |
| `upwork-profile`  | Improve your Upwork overview and portfolio; writes back on approval.            |
| `setup`           | Install, start, or update the local agent terminal.                             |

A few more run on their own when needed - `pilot` (one autonomous cycle),
`tailor-resume`, `extract-resume`, `solve-captcha`, `rescan-skipped`, and
`humanizer` - see the [full catalog](https://jobpilot.suxrobgm.net/docs/campaigns-and-skills).

Inbox scanning, verification codes, and networking emails require your own Google
OAuth client. Follow the
[email setup guide](https://jobpilot.suxrobgm.net/docs/email-setup) to connect
it.

## Documentation

- [User documentation](https://jobpilot.suxrobgm.net/docs) - setup, campaigns,
  skills, email, credentials, and common questions.
- [How JobPilot works](docs/architecture.md) - a non-technical overview of the
  dashboard, local agent, and terminal companion.
- [Development guide](docs/development.md) - local setup, repository layout,
  technical architecture, and contribution notes.

## License

MIT. The shared humanizer skill is based on the bundled upstream humanizer
package under [plugin/skills/humanizer/](plugin/skills/humanizer/), which ships
with its own LICENSE file.
