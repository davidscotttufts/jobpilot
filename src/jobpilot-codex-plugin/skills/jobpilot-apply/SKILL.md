---
name: jobpilot-apply
description: Auto-fill job application forms via Playwright. Accepts a URL or pasted job page, reviews qualification fit, handles login, and fills forms with resume data.
argument-hint: "<job_application_url_or_pasted_job_page>"
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

Read and follow ${JOBPILOT_SKILLS_ROOT}/skills/apply.md.