# Per-board circuit breakers (loop homeostasis)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t1-step-telemetry.md](t1-step-telemetry.md)

## What

Track a sliding-window failure rate per board/ATS. When it trips (board redesign, bot detection,
expired login), stop leasing that board's jobs and run ONE diagnostic probe job in careful mode
(low gear, strong model, full attention). Outcome: heal (root cause fixed — e.g. re-login —
resume the lane) or park the board with a user-facing reason and move on to other boards.

## Why

Without this, a board that broke at 1am grinds out twenty identical failures overnight, burning
tokens and the user's application quota on nothing. Control-theory reliability: the loop senses
a sick lane and quarantines it instead of retrying blindly. Feeds
[t5-failures-become-fixtures.md](t5-failures-become-fixtures.md) and, when the probe finds a
procedure change, [t4-self-healing-skills.md](t4-self-healing-skills.md).

## Done when

Three consecutive failures on one board trigger a probe instead of a fourth normal attempt, and
the campaign continues on other boards either way.

## Notes

- (add dated notes here)
