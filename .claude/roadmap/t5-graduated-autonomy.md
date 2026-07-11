# Graduated autonomy (trust as a per-board state machine)

Tier 5 — Loop intelligence · Status: **todo** · Pairs with: [t3-formir-answer-ledger.md](t3-formir-answer-ledger.md) (receipts)

## What

Autonomy stops being a global campaign config and becomes an earned, per-board (or per-ATS)
trust level: `observe → propose → supervised (pre-submit review) → autonomous`. Verified
successful applications (receipts) advance the level; failures or fabrication flags demote it.
Server-enforced: the lease payload carries the board's max autonomy, so the worker cannot exceed
it regardless of prompt drift.

## Why

Solves the cold-start trust problem for new/custom boards ("the agent drives a real browser on
*any* board" is scary precisely there) and gives users a legible safety model: the agent earns
autonomy the same way a new hire does. Also the natural gate for the first N applies on a board
whose playbook doesn't exist yet.

## Done when

A newly added custom board starts at `supervised`, reaches `autonomous` after N verified
receipts, and a failure demotes it — all visible in the dashboard.

## Notes

- (add dated notes here)
