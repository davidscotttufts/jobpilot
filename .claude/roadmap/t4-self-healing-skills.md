# Self-healing skills (eval-gated meta-loop)

Tier 4 — Breakthrough bets · Status: **todo** · Depends on: [t1-eval-lab.md](t1-eval-lab.md)

## What

Post-campaign, a retro agent clusters failReasons from campaign events and proposes patches to
playbooks — or PRs against skill docs. The eval lab is the merge gate: propose → replay
fixtures → merge only on green.

## Why

Closed-loop self-improvement, made safe by evals. The system that improves its own procedures.

## Done when

A recurring failure class (e.g. a board's changed login flow) produces an auto-proposed patch
that passes evals and fixes the failure on the next run.

## Notes

- (add dated notes here)
