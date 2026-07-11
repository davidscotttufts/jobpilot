# Multi-machine fleet

Tier 4 — Breakthrough bets · Status: **todo** · Depends on: [t2-job-leases.md](t2-job-leases.md)

## What

Once leases exist, a user can run agents on two machines against the same campaign safely — the
lease is the mutex. Document and test rather than build.

## Done when

Two hosts drain one campaign concurrently with no duplicate applications (proven by a test
against the lease API).

## Notes

- (add dated notes here)
