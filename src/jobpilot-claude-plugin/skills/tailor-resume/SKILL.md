---
name: tailor-resume
description: Pick the best existing resume for a job, or create a new tailored variant when nothing fits.
argument-hint: "<job-description-or-url>"
---

# JobPilot Claude Adapter

This Claude Code skill is a provider adapter. The reusable workflow lives in
the shared JobPilot skill pack.

Set these provider values for the shared workflow:

- `JOBPILOT_SKILLS_ROOT=${CLAUDE_PLUGIN_ROOT}/../jobpilot-skills`
- `JOBPILOT_WORKSPACE_ROOT` is the current JobPilot repository/workspace root.
- `<tailor-resume-command>` = `/jobpilot:tailor-resume`
- `<humanizer-command>` = `/jobpilot:humanizer`

Read and follow `${JOBPILOT_SKILLS_ROOT}/skills/tailor-resume.md`.
