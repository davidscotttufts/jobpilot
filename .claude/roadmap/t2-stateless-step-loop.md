# Stateless step loop ("infinite campaign")

Tier 2 — Loop Engine · Status: **todo** · Depends on: [t2-job-leases.md](t2-job-leases.md)

## What

A `step` skill does exactly one lease → execute → report cycle and exits; the .NET host (or a
Stop hook) re-injects `/jobpilot:step <campaign-id>` while the campaign is non-terminal and the
PTY is idle. Fresh context per iteration.

## Why

Compaction never happens; campaigns become unbounded; token cost per job is minimal and
constant; `resume` stops being a skill and becomes a property of the system. All state already
lives in the API — iterations need zero conversation memory.

## Pointers

- `apps/terminal/Sessions/SessionManager.cs` — the inject mechanism
- New `plugin/skills/step/SKILL.md`

## Done when

A 100+ job campaign runs to completion across agent restarts with no compaction.

## Notes

- (add dated notes here)
