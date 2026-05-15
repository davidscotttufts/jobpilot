---
name: jobpilot-extract-resume
description: Extract structured fields (basics, summary, experience, projects, skills, education) from a resume's uploaded source PDF and save them to the editor.
argument-hint: "[resume-id] [--force]"
---
# JobPilot Codex Adapter

This Codex skill is a provider adapter. The reusable workflow lives in the
shared JobPilot skill pack.

Set these provider values for the shared workflow:

- `JOBPILOT_SKILLS_ROOT` and `JOBPILOT_WORKSPACE_ROOT` are exported by JobPilot.Terminal when it spawns Codex. If running outside the terminal, set them yourself from the JobPilot repo root: `JOBPILOT_WORKSPACE_ROOT=$(pwd)` and `JOBPILOT_SKILLS_ROOT=$JOBPILOT_WORKSPACE_ROOT/src/jobpilot-skills`.
- <extract-resume-command> = $jobpilot-extract-resume

Read and follow ${JOBPILOT_SKILLS_ROOT}/skills/extract-resume.md.
