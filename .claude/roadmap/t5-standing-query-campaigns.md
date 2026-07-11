# Standing-query campaigns (first-responder loop)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t2-scheduled-runs.md](t2-scheduled-runs.md); amplified by [t4-shared-job-index.md](t4-shared-job-index.md)

## What

A campaign type that never "completes": a standing query over the user's criteria. New postings
matching it (from scheduled scans, or instantly from the shared index as any user's agent
discovers them) wake the local agent for exactly those jobs. The loop stops being "iterate until
the board is exhausted" and becomes "subscribe and react."

## Why

Early applications convert disproportionately — being in the first dozen applicants matters more
than resume polish. Optimize **latency-from-posting-to-application** as a first-class metric.
"Applied 3 hours after posting, while you slept" is a marketing line no competitor can match,
and with the shared index the fleet's collective discovery makes every user faster.

## Done when

A new posting matching a standing query is applied to within hours, unattended, and the
dashboard shows time-from-posting-to-application per application.

## Notes

- (add dated notes here)
