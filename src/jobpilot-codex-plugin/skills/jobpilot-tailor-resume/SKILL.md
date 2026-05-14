---
name: jobpilot-tailor-resume
description: Pick the best existing resume for a job, or create a new tailored variant when nothing fits.
argument-hint: "<job-description-or-url>"
---
# JobPilot Codex Adapter

This Codex skill is a provider adapter. The reusable workflow lives in the
shared JobPilot skill pack.

Set these provider values for the shared workflow:

- `JOBPILOT_SKILLS_ROOT` and `JOBPILOT_WORKSPACE_ROOT` are exported by JobPilot.Terminal when it spawns Codex. If running outside the terminal, set them yourself from the JobPilot repo root: `JOBPILOT_WORKSPACE_ROOT=$(pwd)` and `JOBPILOT_SKILLS_ROOT=$JOBPILOT_WORKSPACE_ROOT/src/jobpilot-skills`.
- <tailor-resume-command> = $jobpilot-tailor-resume
- <humanizer-command> = $jobpilot-humanizer

Read and follow ${JOBPILOT_SKILLS_ROOT}/skills/tailor-resume.md.
