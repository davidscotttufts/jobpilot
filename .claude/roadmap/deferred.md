# Deferred / rejected (with reasons)

Recorded so future sessions don't re-litigate. Revisit only if the stated condition changes.

- **Step-level checkpoint/resume DB** (AgentRun→Task→Step→Attempt hierarchy, from the Codex
  review): browser state can't actually resume mid-form — sessions expire, pages reset;
  re-navigate + re-fill is the real recovery path. Job-level leases + step *telemetry* give ~90%
  of the value at ~20% of the machinery. Revisit only if a real recovery case demands it.
- **Per-user contextual bandit now:** too little data per user (tens of applications, weeks of
  outcome delay) — noise wearing a math costume. Do calibration display + pooled priors first
  ([t3-outcome-calibration.md](t3-outcome-calibration.md)).
- **Fit-critic / recovery-agent multi-agent roles:** speculative token burn; scouts
  ([t3-scout-apply-pipeline.md](t3-scout-apply-pipeline.md)) and the receipt/verifier
  ([t3-formir-answer-ledger.md](t3-formir-answer-ledger.md)) are the multi-agent roles with
  clear ROI.
