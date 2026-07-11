# Supervisor watchdog (the loop that watches the loop)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t2-job-leases.md](t2-job-leases.md)

## What

Two-layer stall detection with automatic intervention:

- **Server layer**: leases already carry heartbeats — a missed-heartbeat watchdog flags the job
  and re-leases after TTL (comes free with T2).
- **Host layer**: the .NET host uniquely sees the full PTY output stream AND owns inject. Add
  stall heuristics (no output for N minutes, repeated identical output, error-message loops) and
  escalating interventions: inject a nudge ("you appear stuck — skip this job and record
  failure"), then inject a skip directive, then kill + restart the session and let the lease TTL
  recover the job.

## Why

Closes the "hung worker blocks the whole campaign" gap completely. No other tool in this space
can do it — the supervisor vantage point (PTY stream + inject) is unique to JobPilot's
architecture. The agent is no longer trusted to never wedge; the system assumes it will and
recovers unattended.

## Done when

A deliberately-wedged worker (e.g. infinite `browser_wait_for`) is detected, nudged, and the
campaign continues without human intervention, overnight.

## Notes

- (add dated notes here)
