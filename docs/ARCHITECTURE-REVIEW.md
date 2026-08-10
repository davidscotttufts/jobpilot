# Architecture & Feature Review — JobPilot

> 2026-08-10 · Evidence: 1,334 discovered jobs, 153 applied, 19 failed, 141 applications,
> 309 pilot claims, and the source of `apps/{web,api,terminal}` + `plugin/`.

## 1. What the architecture gets right

Worth stating first, because the proposals below are refinements, not a rewrite.

- **The API owns all state.** Web and agent are both clients. There is exactly one writer of
  truth, which is why the duplicate-apply bug was fixable in one place.
- **The agent is treated as fallible.** Claims, generations, terminal outcomes, and ownership
  checks are server-side. This session extended that principle (duplicate guard, apply budget,
  claim lifetime) and it kept paying off — every invariant moved server-side stopped a real defect.
- **Provider-neutral skills.** One skill tree drives Claude or Codex; the agent runs on the user's
  own subscription, on their machine, with their credentials. That is a genuinely good product
  and privacy position.
- **The state machine is explicit.** `queued → pending → approved → applying → terminal` with a
  transition table, generation-tagged PTY exits, and an expiry sweep. Most agent apps have no
  such spine.

## 2. The funnel, measured

```
1,334 jobs discovered
  1,153 skipped   (86%)   below score 621 · dedupe 336 · question expired 52 · captcha 48 · other 96
     19 failed     (1%)
    153 applied   (11%)
      ↓
    141 applications → 131 open · 10 rejected · 0 interviews recorded
```

Two things jump out.

**The app optimizes throughput and measures nothing about outcome.** 141 applications have
produced 10 rejections and zero recorded interviews. Nothing in the system learns from which
applications go anywhere — score threshold, board, title, and resume variant are all set by
instinct and never validated against replies.

**94% of applications came from one board** (`hiring.cafe`, 133 of 141; Indeed 8). That board has
already changed domain once mid-run, which is precisely what caused the duplicate GitLab and
Alpaca applications. A single board is both the throughput ceiling and the biggest single
point of failure.

## 3. Robustness — ranked by expected harm

### R1. An application can be submitted twice after a crash (**highest severity**)

The expiry sweep returns a stale `applying` job to `approved`, and the duplicate guard only sees
`Application` rows, which are written *after* the browser submits. So a job whose form was
submitted but whose result was never recorded — agent crash, host restart, claim expiry — is
retried, and a second real application reaches the employer. The 25-minute claim cap makes this
*more* frequent, not less.

**Proposal.** Record intent before the irreversible act. Write an `ApplicationAttempt` row
(job, timestamp, phase) immediately before the submit click, transition it to `recorded` when the
result lands. Recovery then distinguishes three states instead of two: never started (safe to
retry), started but unsubmitted (safe to retry), **submitted but unrecorded (never auto-retry —
route to human review)**. This is the one gap where the failure is externally visible to an
employer and cannot be undone.

### R2. One browser profile is both a bottleneck and a top failure cause

**8 of 19 recorded failures** are variations of *"Playwright profile locked / browser unavailable"*.
A Chrome profile opens in exactly one browser, so any second consumer — a second worker, a
concurrent skill, an audit script — fails. Concurrency (`maxConcurrentApplies`) is capped by this
in practice regardless of the configured number.

**Proposal.** A small browser-lease registry: N profiles, each leased to one worker with a TTL,
released on completion, reclaimed on expiry. Workers request a lease and get a definite answer
instead of a lock error. Fail with a retryable reason rather than a terminal `failed` outcome —
those 8 failures cost the pipeline ~2 hours of claim time for zero applications.

### R3. No process supervision

Killing one process during this session took down the API, web, **and** terminal host together
(one `concurrently` parent), and nothing restarted them. The agent session then could not start
because it is the dashboard that holds the token.

**Proposal.** Run the three services under a real supervisor (launchd on macOS, systemd user unit
on Linux) with restart-on-failure and health probes. Make session start idempotent and available
without the browser — a `jobpilot start` CLI path using the stored terminal token, so recovery
never depends on a human opening a tab.

### R4. Board drift has no detector

`hiring.cafe` moved to `hiringcafe.com` with identical paths and nothing noticed until duplicate
applications had already gone out. Board health exists as an agenda item but reacts to failures,
not to *structural* change.

**Proposal.** A per-board canary: one known posting fetched on a schedule, asserting the URL
shape, the fields the digest depends on, and the apply-button selector class. On drift, pause the
board and raise a question instead of applying against a changed page. Pair with URL
canonicalization as a general rule (already done for one host) rather than per-incident patches.

### R5. The local database is not reproducible

`jobpilot-db` is an ad-hoc container nothing in the repo can rebuild. All 141 applications, the
resumes, and the pilot history live in it. If the container is removed rather than stopped, it is
gone unless it happens to be on a named volume.

**Proposal.** A committed `docker-compose.dev.yml` with a named volume, plus `db:backup` /
`db:restore` scripts and a nightly local dump. Cheap insurance for irreplaceable data.

### R6. Nothing measures the pipeline from inside

There are no per-phase timings. `--save-session` only flushes at server shutdown, so the tool-call
baseline is not readable during a run.

**Proposal.** Emit a structured journal event per apply phase (navigate / read / fill / submit /
record) with durations. Then regressions and improvements are visible instead of inferred — the
2m30s-vs-5m applies observed after the form-fill change are currently a hint, not a measurement.

## 4. UX — ranked by user value

### U1. Close the loop: make it learn from replies (**biggest opportunity**)

The system already ingests replies (inbox classification, rejection detection) and already scores
jobs. It just never connects the two. Zero interviews across 141 applications is either a real
signal or a measurement failure, and today there is no way to tell which.

**Proposal.** A response-rate view sliced by board, score band, title family, and resume variant,
with the pilot biasing discovery toward what actually converts. This turns the product from *spray
at scale* into *learn at scale* — which is the difference between a tool people abandon after a
month and one they keep.

### U2. Make the skip pile explorable and the threshold tunable

**621 jobs (54% of skips) were rejected for scoring below 60**, a number the user picked blind and
has never seen the consequences of.

**Proposal.** A "why skipped" browser, plus a threshold simulator: *"at 55 you would have applied
to 87 more — here are five of them."* Turns an invisible policy into an informed decision.

### U3. Show what was actually submitted

The agent fills forms on the user's behalf and the only window into it is a raw terminal. Trust is
the core UX problem of an app that acts for you.

**Proposal.** Per-application detail showing the answers given, the resume variant, and the cover
letter sent — an auditable record. This is also the fastest way to catch a bad answer pattern
across many applications.

### U4. `needs_user` is a dead end

52 jobs were skipped with *"Question expired without an answer"* and 6 sit in `needs_user`. The
pipeline asks, waits hours, then throws the job away.

**Proposal.** Push the question (subscriptions already exist) with a one-tap answer and a visible
deadline; on expiry, park the job for later rather than discarding it. A question should never
cost a job outright.

### U5. Give CAPTCHA and clearance skips somewhere to go

48 CAPTCHA skips and 10 clearance rejections are currently write-offs.

**Proposal.** A short "needs you" queue with deep links, so a user with five spare minutes can
convert a handful of them by hand.

### U6. A dry run before the first real application

The scariest moment is the first autonomous apply.

**Proposal.** *"Show me what you'd apply to"* — run discovery and scoring, render the first N with
the tailored resume and cover letter, and require one approval before the first live submission.

## 5. Suggested sequence

1. **R1** (double-submit) — the only defect an employer can see, and undo-proof.
2. **R2** (browser leases) — removes both the top failure cause and the real concurrency ceiling.
3. **R3** (supervision) — stops single-process death from taking the product down.
4. **U1** (outcome loop) — the highest-value feature, and the data is already being collected.
5. **R5 / R4** (backups, board canary) — cheap protection for irreplaceable data and the one board
   the product currently depends on.
6. **U2 / U3** — make the invisible policy and the invisible actions visible.

R1, R2 and R3 are the "bulletproof" core. U1 is the one that would make the product feel
different in kind rather than degree.
