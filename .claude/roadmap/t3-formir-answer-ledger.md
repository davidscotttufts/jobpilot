# FormIR + answer ledger + receipts

Tier 3 — Intelligence & Efficiency · Status: **todo**

## What

Compile each form page into a canonical field IR: `{semantic, control, required, options,
source, confidence}`. Fill order: deterministic mappings → learned mappings → LLM only for
unknown questions.

Persist two artifacts:

- **Answer ledger**: value, provenance (profile / resume / previously-approved / calculated /
  agent-inferred), confidence, user-approved flag, expiry. Every question answered once is never
  asked again — including answers collected via
  [t2-needs-user-escalation.md](t2-needs-user-escalation.md).
- **Receipt** per application: domains visited, field provenance, final confirmation text, DOM
  hash. Workers currently discard all evidence; receipts answer "did it really submit?"

## Done when

A repeat application on a known ATS fills every previously-seen field deterministically and the
application row links to its receipt.

## Notes

- (add dated notes here)
