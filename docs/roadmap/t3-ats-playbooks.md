# Compiled ATS playbooks, fleet-shared

Tier 3 - Intelligence & Efficiency · Status: **todo**

## What

After each successful apply, write back a compact playbook keyed by ATS domain (step sequence,
quirks, field mappings). The next worker on that ATS replays + verifies instead of exploring;
diverging steps drop to LLM mode and patch the playbook. LLM as compiler, script as hot path.

Share fleet-wide - form **structure** only, never values. Every user's agent improves everyone's.

## Why

Token cost per application collapses (replay needs a fraction of exploration's snapshots, and
replay can run on a cheap model). The fleet-sharing is the moat: a network effect no local-only
competitor can copy. `rescan-skipped`'s digest write-back is the same instinct applied to
reading - this applies it to acting.

## Done when

Second-ever apply on a Greenhouse form uses measurably fewer snapshots/tokens than the first
(via [t1-step-telemetry.md](t1-step-telemetry.md)).

## Notes

- (add dated notes here)
