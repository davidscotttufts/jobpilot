# Scratch-file discipline

Tier 0 — Fixes · Status: **todo**

## What

A worker wrote raw browser snapshots to the repo root (`job-header.md`, `results-p2.md`) instead
of `$JOBPILOT_WORKSPACE_ROOT/.temp`. Tighten the scratch-file rule in `plugin/shared/setup.md`
and gitignore the pattern.

## Done when

Rule is explicit in setup.md; `.gitignore` covers stray snapshot dumps; the two stray files are
removed.

## Notes

- (add dated notes here)
