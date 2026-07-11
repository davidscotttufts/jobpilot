# Speculative preparation (latency hiding)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t2-job-leases.md](t2-job-leases.md) (lease lookahead)

## What

While the apply worker is blocked on browser I/O (page loads, uploads, waits), precompute the
*next* leased job's artifacts: tailored resume variant, cover letter draft, ledger answers.
None of these need the browser. Requires a lease "peek" (reserve job N+1 without starting it).

## Why

Classic pipeline latency hiding: the LLM idles during browser waits and the browser idles during
LLM reasoning. Overlapping them cuts wall-clock per application without touching submission
pacing or bot-detection risk. Cheapest of the T5 wins once leases exist.

## Done when

Time-per-application drops measurably with prep overlapped, and an abandoned speculative prep
(job N+1 got skipped) costs nothing but the tokens spent.

## Notes

- (add dated notes here)
