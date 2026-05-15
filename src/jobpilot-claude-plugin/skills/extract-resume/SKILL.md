---
name: extract-resume
description: Extract structured fields (basics, summary, experience, projects, skills, education) from a resume's uploaded source PDF and save them to the editor.
argument-hint: "[resume-id] [--force]"
---

# JobPilot Claude Adapter

This Claude Code skill is a provider adapter. The reusable workflow lives in
the shared JobPilot skill pack.

Set these provider values for the shared workflow:

- `JOBPILOT_SKILLS_ROOT=${CLAUDE_PLUGIN_ROOT}/../jobpilot-skills`
- `JOBPILOT_WORKSPACE_ROOT` is the current JobPilot repository/workspace root.
- `<extract-resume-command>` = `/jobpilot:extract-resume`

Read and follow `${JOBPILOT_SKILLS_ROOT}/skills/extract-resume.md`.
