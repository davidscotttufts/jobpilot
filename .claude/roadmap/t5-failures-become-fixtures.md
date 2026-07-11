# Failures become fixtures (self-feeding eval lab)

Tier 5 — Loop intelligence · Status: **todo** · Depends on: [t1-eval-lab.md](t1-eval-lab.md), [t1-step-telemetry.md](t1-step-telemetry.md)

## What

Persist a redacted trace for every failed job (action sequence + key observations — the worker
currently discards everything). One command promotes a failure into a sanitized, replayable eval
fixture. The eval lab stops being a hand-curated set and grows automatically from production
reality.

## Why

Compounding: every real-world failure becomes a permanent regression test. Closes the triangle
with [t4-self-healing-skills.md](t4-self-healing-skills.md) — a proposed playbook/skill patch is
validated against the very fixture its failure created. This is how the fixture set keeps pace
with boards that change under you.

## Done when

A production failure can be replayed locally from its trace, and promoting it to a fixture takes
one command with secrets/PII provably stripped.

## Notes

- (add dated notes here)
