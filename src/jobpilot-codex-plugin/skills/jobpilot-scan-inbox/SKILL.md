---
name: jobpilot-scan-inbox
description: Classify pending email from the connected mailbox, fuzzy-match to existing applications, and stage results in the /inbox page for user review.
argument-hint: "(none)"
---
# JobPilot Codex Adapter

This Codex skill is a provider adapter. The reusable workflow lives in the
shared JobPilot skill pack.

Set these provider values for the shared workflow:

- `JOBPILOT_SKILLS_ROOT` and `JOBPILOT_WORKSPACE_ROOT` are exported by JobPilot.Terminal when it spawns Codex. If running outside the terminal, set them yourself from the JobPilot repo root: `JOBPILOT_WORKSPACE_ROOT=$(pwd)` and `JOBPILOT_SKILLS_ROOT=$JOBPILOT_WORKSPACE_ROOT/src/jobpilot-skills`.
- <apply-command> = $jobpilot-apply
- <apply-batch-command> = $jobpilot-apply-batch
- <autopilot-command> = $jobpilot-autopilot
- <cover-letter-command> = $jobpilot-cover-letter
- <humanizer-command> = $jobpilot-humanizer
- <scan-inbox-command> = $jobpilot-scan-inbox
- <get-code-command> = $jobpilot-get-code

Read and follow ${JOBPILOT_SKILLS_ROOT}/skills/scan-inbox.md.
