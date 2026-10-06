# How JobPilot works

This page explains what JobPilot is made of and what happens when you use it.
You don't need to know how to code to follow it. For technical details, see
[development.md](development.md).

## The short version

JobPilot has two halves:

- **The dashboard** is a website. You sign up there, fill in your profile,
  manage your resumes, start campaigns, and follow each application from
  "applied" to "offer".
- **The agent** runs on your computer. It's Claude Code or Codex, on your own
  subscription, with the JobPilot plugin added. It opens a browser on your
  machine and does the work: searching job boards, tailoring your resume,
  filling in applications, and writing to recruiters.

```text
          Website                              Your computer
  ┌──────────────────────┐             ┌───────────────────────────┐
  │  JobPilot dashboard  │ ◄────────►  │  AI agent (Claude/Codex)  │
  │  profile · resumes   │             │  + JobPilot plugin        │
  │  campaigns · inbox   │             │  + a web browser          │
  └──────────────────────┘             └───────────────────────────┘
```

There are three reasons it's split this way:

1. The AI runs on the Claude or Codex plan you already pay for, so JobPilot
   doesn't need to sell you AI usage or count tokens.
2. Applications are sent from a browser on your own computer, signed in as
   you, instead of from a server somewhere.
3. You can see that browser. Every search, click, and form happens on your
   screen, and you can step in whenever you want.

## The three parts

### 1. The dashboard

Your data lives at [jobpilot.suxrobgm.net](https://jobpilot.suxrobgm.net):
your profile, your resumes and their tailored copies, campaigns, the list of
applications, recruiter emails, networking contacts, and charts. The site also
has a terminal panel called the dock, where you can watch and control the
agent on your computer.

### 2. The agent

The JobPilot plugin teaches Claude Code or Codex a set of **skills**, such as
`search`, `auto-apply`, `cover-letter`, and `networking`. When a skill runs,
the agent:

- loads your profile and resume from the dashboard,
- uses a browser to do the work (searching, signing in, filling in forms),
- sends the results back, so the dashboard updates straight away.

Three skills deal with resumes. `extract-resume` reads your PDF exactly as it
is. `review-resume` suggests an improved version, which you can accept or
reject. `tailor-resume` makes a copy for one job and leaves your main resume
alone. None of them can add an employer, a date, or a number that isn't
already in your resume. The dashboard checks this itself instead of trusting
the AI, and flags anything it can't confirm.

The same plugin works in Claude Code and Codex, so use whichever you have.

### 3. The terminal host

This is a small program that runs in the background on your computer. It keeps
the agent's session running and connects it to the dashboard. That's how the
dock on the website can show the agent working, and how buttons on the website
can tell it what to do. When it starts the agent, it also hands over a token
that lets the agent act as you, so you don't have to set anything up.

You never deal with it directly. Setup installs and starts it for you, and the
dock can start it again later.

## What happens during a campaign

Say you start an auto-apply campaign for "senior typescript remote":

1. The agent checks in with the dashboard and loads your profile, settings,
   and main resume.
2. It opens a browser on your computer and searches the job board you picked,
   signing in with your saved login if it needs to.
3. It scores each job against your resume. It skips jobs that don't fit, jobs
   you've already applied to, and low-quality postings.
4. For each good match, it picks or makes the right version of your resume,
   fills in the form, answers the screening questions, and writes a cover
   letter if one is asked for.
5. After every job it reports back, so the campaign page shows each job as
   applied, skipped, or failed, with the reason.
6. Each application it sends appears in your list. When a recruiter replies
   later, the reply is matched to that application.

In Search only mode, the agent waits for you to approve matches before
applying. In Apply to links mode, it applies to the jobs you pasted. In
Auto-apply mode, it applies on its own up to the limit you set.

## The Pilot

You can still do everything above by hand, but you can also let JobPilot run
the whole search. You write your instructions once: your goals, daily limits,
networking settings, and where it may draft posts. The Pilot then repeats the
same loop for as long as it's on:

```text
  look for work ──► claim a task ──► agent works ──► agent reports ──► log it
       ▲                                                                 │
       └────────────────── wait, then look again ◄───────────────────────┘
```

- **Look for work.** A small program on your computer asks the server for a
  to-do list, which the server builds fresh from your data each time: jobs to
  apply to, replies to read, follow-ups that are due. There's no separate
  queue or scheduled job behind it. If the list is empty, the program logs a
  quiet cycle and waits, and the AI never starts.
- **Claim a task.** It takes the top task and locks it for a limited time,
  then clears the agent's memory and gives it that task.
- **Agent works.** The agent does that one thing, like applying to one job,
  sending one follow-up, or drafting one interview reply. Results are saved to
  the server as they happen, so a crash halfway through loses nothing.
- **Agent reports.** Its last step is to report whether the task worked, with
  a one-line summary. The server writes it to the journal, releases the lock,
  and tells the program on your computer.
- **Log it.** The program records the cycle, including how much AI usage it
  took, and decides when to look again. If the agent goes quiet or gets stuck,
  it gets a reminder first, then a fresh session. If it never reports back,
  the task is cancelled, and an application it didn't finish goes back on the
  list.

Two things let this run without a browser tab open. The first time you start
the Pilot, your computer is **paired** with it: your login token is stored
safely with the terminal host, so it can start sessions on its own after a
restart or crash. And the dashboard keeps a live connection to the host, so it
can wake the agent as soon as something urgent comes in instead of waiting
for the next check.

When the Pilot isn't sure what to do, for example with a salary question, an
odd form field, or an interview invite, it sends you a short question that you
can answer from your phone. The job waits until you answer. The most important
rules aren't just instructions to the AI. The daily application and
networking limits, "never send a LinkedIn message by yourself", and "never
publish a post without my approval" are enforced by the dashboard, so they
hold even if the AI makes a mistake.

## Where your data lives

- Your profile, resumes, applications, and campaigns are stored in your
  JobPilot account.
- Job board passwords and tokens are encrypted with a key that belongs only to
  your account.
- The website never signs in to job boards for you. Board sessions, cookies,
  and form submissions stay in the browser on your computer.
- The AI work goes through your own Claude or Codex subscription, not through
  JobPilot's servers.

## Live updates

While the agent works, every open dashboard page updates by itself. The
campaign page shows each job's progress, the application list shows new
applications, and the inbox shows newly matched replies. You never need to
refresh.

## Further reading

- [development.md](development.md): running JobPilot locally, the repository
  layout, the tech stack, and the technical details behind this page.
- [User guide](https://jobpilot.suxrobgm.net/docs): getting started, campaigns
  and skills, email setup, credentials, and the FAQ.
