# Strategist loop (dual-loop architecture)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t1-step-telemetry.md](t1-step-telemetry.md)

## What

A slow deliberation loop above the fast step loop. Every N jobs (or nightly), a strategist pass
reads the campaign's telemetry — score distribution per query/board, skip-reason clusters,
yield — and adjusts the campaign config: rewrites a low-yield search query, tunes `minScore`,
reorders boards, tightens or relaxes filters. Changes are written back as campaign events
(auditable), with server-enforced bounds on what the strategist may touch.

## Why

Today a bad search query grinds a whole campaign through low-quality results; only the user
notices. This closes the loop on the *search itself* — "this query returns 80% irrelevant
postings, refining to X" — the OODA outer loop the fast loop can't afford to run per-iteration.

## Done when

A campaign with a deliberately poor query self-corrects mid-run and the event log shows the
strategist's reasoning and the yield improvement.

## Notes

- (add dated notes here)
