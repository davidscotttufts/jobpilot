---
name: jobpilot-search
description: Search job boards for matching positions using Playwright. Filters by qualification fit against the user's resume. Respects job board config from the JobPilot API.
argument-hint: "<job_title_keywords_location>"
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

Read and follow ${JOBPILOT_SKILLS_ROOT}/skills/search.md.