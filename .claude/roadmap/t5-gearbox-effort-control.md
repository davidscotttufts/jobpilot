# Gearbox loop (confidence-driven effort allocation)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t3-ats-playbooks.md](t3-ats-playbooks.md), [t1-step-telemetry.md](t1-step-telemetry.md)

## What

The loop chooses a gear per iteration instead of running every job at the same effort:

- **High gear** (playbook hit, familiar board, simple form): cheap model, minimal snapshot
  budget, replay-and-verify.
- **Low gear** (unknown ATS, complex form, prior failures here): strong model, full exploration,
  generous budgets.

Gear is predicted from priors (playbook hit rate, board familiarity, form complexity estimate)
and **shifts down on surprise** — an unexpected field, a mismatched snapshot, a failed verify —
mid-job, not just between jobs.

## Why

Model routing as *loop control* rather than static config. Most applications are routine; the
expensive model should be a reserve the loop calls up, not the default. Telemetry proves the
savings; the eval lab proves no quality regression.

## Done when

Token-per-applied-job on a familiar ATS drops materially vs. baseline while eval-lab scores hold,
and a surprise mid-form provably escalates the gear.

## Notes

- (add dated notes here)
