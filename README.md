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

[![Watch the teaser](docs/images/teaser.gif)](docs/images/teaser.mp4)

</div>

---

Job searching is a second job. The same forms, the same resume tweaks, the same
follow-ups, every single day. JobPilot gives that job to an AI agent that runs
on your own computer. You tell it what you're looking for. It searches the
boards, tailors your resume for each posting, fills out the forms, submits,
messages recruiters, and files every reply. A hosted dashboard keeps score.

> **No API keys. No per-token bills.** The agent runs inside Claude Code or
> Codex, so all AI work comes out of the subscription you already pay for.

And you never lose sight of it: the agent drives a real browser on your
machine, logged in as you. You can watch every click, or close the lid and
read the journal in the morning.

## What it does

- **Applies while you do something else.** Point it at LinkedIn, Indeed,
  Hiring Cafe, and more - or add your own board. It scores every posting against your resume,
  then applies one at a time or works through an auto-apply campaign, up to
  the limits you set. Screening questions, tailored resumes, and cover
  letters included.

- **Runs itself with the Pilot.** Write your goals once and set a daily cap.
  The Pilot keeps the search moving on its own - finding roles, applying,
  following up - and sends you a push notification when a question only you
  can answer. You wake up to a journal of what it did overnight.

- **Talks to the humans too.** It finds the recruiter or hiring manager
  behind a posting and drafts a personal message for email or LinkedIn.
  Connect Gmail and it reads replies, matches them to your applications, and
  proposes the next move - you approve every send.

- **Tracks everything.** One pipeline from submitted to offer, with
  analytics on top. Every resume variant is versioned and exported to PDF,
  so you always know which resume went where. Upwork gets the same
  treatment: search, client-quality filters, and drafted proposals.

## Get started

1. Install the JobPilot plugin for Claude Code or Codex (commands below).
2. Run the `setup` skill. It installs the local terminal companion (or
   upgrades it to the latest release if you already have one), starts the
   agent, and opens the dashboard.
3. [Create an account](https://jobpilot.suxrobgm.net) and upload your
   resume - the agent parses it into your profile.
4. Launch your first search campaign. Review the matches, then apply to the
   ones you like or let an auto-apply campaign work through them.

### Install the plugin

#### Claude Code

Run these commands in Claude Code:

```text
/plugin marketplace add https://github.com/suxrobGM/claude-plugins
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

After setup, launch the agent any time from the agent dock in the dashboard.

<details>
<summary><b>Install the terminal companion manually</b></summary>

Use one of these commands if you need to install or repair the terminal
companion without running the setup skill. The JobPilot plugin is still
required to launch Codex from the dashboard.

- **Windows (PowerShell):**

  ```powershell
  irm https://raw.githubusercontent.com/suxrobGM/jobpilot/main/apps/terminal/install.ps1 | iex
  ```

- **macOS / Linux:**

  ```bash
  curl -fsSL https://raw.githubusercontent.com/suxrobGM/jobpilot/main/apps/terminal/install.sh | bash
  ```

</details>

For a guided walkthrough, see the
[getting-started guide](https://jobpilot.suxrobgm.net/docs/getting-started).

## Skills

There is one command you ever type yourself:

```text
/jobpilot:setup     # Claude Code
$setup              # Codex
```

It installs the local terminal companion, starts the agent, and opens the
dashboard. If the companion is already installed, `setup` upgrades it to the
latest release instead - so run it again any time to update or repair the
install.

Everything else happens from the dashboard. Click an action and JobPilot hands
the matching skill to the agent in the dock, so you can watch the work as it
goes:

| In the dashboard                             | What the agent does                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| New campaign → Search only (`search`)        | Searches a board and scores every result against your resume.              |
| New campaign → Auto-apply (`auto-apply`)     | Searches, then applies to matches one at a time, up to the limits you set. |
| New campaign → Networking (`networking`)     | Finds the recruiter or hiring manager and drafts a message to each.        |
| New campaign on Upwork (`upwork-search`)     | Searches Upwork, filters out low-quality clients, ranks the rest.          |
| Apply all, or apply one URL (`apply`)        | Applies to a single job after a fit review.                                |
| Campaign → Resume (`resume-campaign`)        | Picks a paused campaign back up and finishes its approved jobs.            |
| Campaign → Rescan skipped (`rescan-skipped`) | Re-checks skipped jobs in case the reason no longer holds.                 |
| Campaign → Retry failed (`auto-apply`)       | Re-runs the applications that errored out.                                 |
| Inbox → Scan (`scan-inbox`)                  | Classifies new mail, matches it to applications, proposes stage moves.     |
| Networking → Regenerate (`networking`)       | Rewrites a drafted message.                                                |
| Upload a resume (`extract-resume`)           | Parses the PDF into your structured profile.                               |
| Resume → Tailor (`tailor-resume`)            | Rewrites a resume variant against one job description.                     |
| Upwork → Proposal (`upwork-proposal`)        | Drafts a proposal for one posting.                                         |
| Upwork → Profile (`upwork-profile`)          | Improves your Upwork overview; writes back only after you approve.         |
| Pilot → Start (`pilot`)                      | Hands the whole search to the agent on a loop.                             |

Mid-job the agent reaches for more skills on its own: tailoring your resume
before it submits, writing a cover letter, solving a CAPTCHA, pulling a
verification code out of your inbox. You never invoke those. The
[full catalog](https://jobpilot.suxrobgm.net/docs/campaigns-and-skills) lists
everything that exists.

Inbox scanning, verification codes, and networking emails require your own
Google OAuth client. Follow the
[email setup guide](https://jobpilot.suxrobgm.net/docs/email-setup) to
connect it.

## Documentation

- [User documentation](https://jobpilot.suxrobgm.net/docs) - setup,
  campaigns, skills, email, credentials, and common questions.
- [How JobPilot works](docs/architecture.md) - a non-technical overview of
  the dashboard, local agent, and terminal companion.
- [Development guide](docs/development.md) - local setup, repository layout,
  technical architecture, and contribution notes.

## License

MIT. The shared humanizer skill is vendored from
[blader/humanizer](https://github.com/blader/humanizer) (MIT) under
[plugin/skills/humanizer/](plugin/skills/humanizer/), which ships with its
own LICENSE file.
