# Job-level leases

Tier 2 — Loop Engine · Status: **todo**

## What

`POST /api/campaigns/:id/lease` hands the agent the next unit of work; a lease has owner + TTL +
heartbeat; an expired lease auto-reverts the job to `approved`. Replaces the lazy 5-minute stale
watchdog (`campaign.service.ts`, read-triggered only) with precise recovery, and collapses the
three near-identical loops (auto-apply / apply / resume) into one.

Deliberately **job-level, not step-level**: browser state can't be resumed mid-form anyway —
re-navigate + re-fill is the real recovery path. Keep step data as telemetry only
(see [deferred.md](deferred.md)).

## Why

Foundation for [t2-stateless-step-loop.md](t2-stateless-step-loop.md),
[t2-needs-user-escalation.md](t2-needs-user-escalation.md), and
[t4-multi-machine-fleet.md](t4-multi-machine-fleet.md).

## Done when

Killing the agent mid-apply loses at most one leased job, recovered by TTL.

## Notes

- (add dated notes here)
