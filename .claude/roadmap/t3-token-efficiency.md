# Token efficiency grab bag

Tier 3 — Intelligence & Efficiency · Status: **todo**

## What

Three independent wins, each measurable via [t1-step-telemetry.md](t1-step-telemetry.md):

- **Per-board `browser_evaluate` extractors** — structured JSON out of the page instead of a11y
  snapshots; an order of magnitude cheaper for scoring. Pairs with
  [t3-ats-playbooks.md](t3-ats-playbooks.md).
- **Model routing per worker mode** — workers are pinned to `sonnet`; use a cheap model for
  replay/pagination/dedupe, the strong model for eligibility edge cases + essay questions.
- **Campaign-level tailoring memoization** — JDs within one campaign cluster tightly; reuse the
  variant decision across similar digests instead of re-invoking `tailor-resume` per job.

## Done when

Token-per-applied-job drops against the telemetry baseline; no quality regression in the eval
lab.

## Notes

- (add dated notes here)
