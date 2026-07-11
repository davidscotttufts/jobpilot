# The Pilot — one generic autonomous loop (north star)

Status: **todo** · This is the unifying architecture. T2 items are its plumbing; T5 items are
its reflexes, not separate systems.

## The idea

Today JobPilot is a collection of skills the user invokes. The Pilot inverts it: **one
perpetual sense → decide → act → record cycle** that manages everything — campaigns, queue,
inbox, outreach, escalations, schedules — completely autonomously. The user states goals once;
the Pilot runs the job search.

Each cycle is stateless (fresh context, all state server-side) and does ONE thing:

1. **Sense** — `GET /api/pilot/agenda`: a server-compiled, prioritized, compact world state.
   The server (deterministic code) does the heavy lifting: answered questions ready to resume,
   expired leases, new postings matching standing queries, unprocessed inbox events, campaign
   work available, scheduled tasks due, budget/burn status, per-board health. Small payload,
   one call.
2. **Decide** — pick the highest-value action given the **mandate** (see below). Ranking is
   mostly server-side; the LLM breaks ties, handles ambiguity, and chooses proactive work when
   the agenda is quiet (rescan skipped, outreach follow-ups, playbook improvement).
3. **Act** — delegate: job-worker for score/apply, outreach-worker, inbox scan, a strategist
   review of a low-yield campaign. One action (or one small batch) per cycle.
4. **Record** — results via existing endpoints, plus one line to the **pilot journal**: an
   auditable narrative of what it did and why ("resumed job X — your salary answer arrived").
5. **Exit** — the host re-injects the pilot skill. If the agenda is empty: report "sleeping
   until <next schedule/event>"; the host wakes it on schedule or on server push (SSE → inject).

## The mandate (the user's charter)

One small, user-editable document in the dashboard — the only input the Pilot needs:

- **Goals**: "senior TypeScript remote role, ≥$150k, by October."
- **Effort**: up to 20 applications/day, token budget/week, active hours.
- **Boundaries**: never auto-send InMail; always ask me about salary questions; boards to
  avoid; autonomy ceilings per board.
- **Escalation prefs**: what deserves a push notification vs. the morning digest.

Soft judgment lives in the mandate text (LLM interprets it each cycle — it's small). Hard
limits (caps, budgets, autonomy ceilings) are ALSO enforced server-side so prompt drift can
never exceed them.

## How the T5 "loops" collapse into the Pilot

| Former loop | Becomes |
| --- | --- |
| Strategist loop | An agenda item type: "campaign yield is poor" → Pilot runs a strategy review |
| Circuit breakers | Server puts "board X failing repeatedly" on the agenda → Pilot probes or parks it |
| Standing-query campaigns | An agenda event source: new matches wake the Pilot |
| Gearbox effort control | A policy the Pilot applies when delegating (model tier, budgets per worker call) |
| Graduated autonomy | Mandate + server-enforced ceilings read at delegation time |
| Speculative prep | A proactive action the Pilot picks when the agenda is quiet |
| Failures → fixtures | Part of Record: failed work leaves a trace the eval lab ingests |
| Supervisor watchdog | **Stays separate by design** — the dumb, deterministic host-level safety net that supervises the Pilot itself (something non-LLM must watch the watcher) |

## What stays outside the Pilot

- **Workers** (job-worker / outreach-worker): isolation exists for token reasons; the Pilot
  delegates to them exactly as orchestrator skills do today.
- **Host watchdog**: deterministic stall detection + kill/re-inject. Not intelligent on purpose.
- **Server-side hard limits**: the Pilot proposes, the API disposes.

## Self-improvement

The Pilot's learning subsystem is designed in [pilot-learning.md](pilot-learning.md): a
capture → reflect → commit → validate → adopt → share flywheel over tiered memory (facts,
procedures, strategy, mandate proposals), with the eval lab as immune system, auto-rollback,
and a never-touch list. Reflection runs as a quiet-hours agenda item — no separate loop.

## Build path

1. **v0 — agenda drain** (needs [t2-job-leases.md](t2-job-leases.md)): generalize the step
   skill from "one job in one campaign" to "one agenda item across everything." Agenda v1 can
   be just leases + answered escalations.
2. **v1 — mandate + journal**: charter doc in the dashboard; pilot journal visible as a feed
   ("what your pilot did today"). This is also the killer demo.
3. **v2 — event wake**: SSE/push → host inject, so the Pilot reacts in minutes, not on a timer.
   Standing queries and inbox events join the agenda.
4. **v3 — proactive intelligence**: quiet-agenda work (strategy reviews, rescans, follow-ups,
   playbook care), gearbox policies, autonomy ceilings.

## Done when

A user writes a mandate, closes the laptop lid at night with the host running, and wakes to a
journal: applications submitted, replies triaged, two questions awaiting one-tap answers — with
zero skill invocations by the user, ever.

## Notes

- (add dated notes here)
