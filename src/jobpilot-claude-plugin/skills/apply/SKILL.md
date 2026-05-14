---
name: apply
description: Apply to jobs autonomously. With no argument, drains the JobPilot queue at /api/queue/pending. With a URL or pasted job page as the argument, runs a single-job fit review and applies just that one.
argument-hint: "[job_url_or_pasted_job_page] (omit to drain the batch queue)"
---

# JobPilot Claude Adapter

This Claude Code skill is a provider adapter. The reusable workflow lives in
the shared JobPilot skill pack.

Set these provider values for the shared workflow:

- `JOBPILOT_SKILLS_ROOT=${CLAUDE_PLUGIN_ROOT}/../jobpilot-skills`
- `JOBPILOT_WORKSPACE_ROOT` is the current JobPilot repository/workspace root.
- `<apply-command>` = `/jobpilot:apply`
- `<autopilot-command>` = `/jobpilot:autopilot`
- `<cover-letter-command>` = `/jobpilot:cover-letter`
- `<humanizer-command>` = `/jobpilot:humanizer`
- `<scan-inbox-command>` = `/jobpilot:scan-inbox`
- `<get-code-command>` = `/jobpilot:get-code`

Read and follow `${JOBPILOT_SKILLS_ROOT}/skills/apply.md`.
