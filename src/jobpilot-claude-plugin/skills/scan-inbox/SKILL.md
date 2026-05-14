---
name: scan-inbox
description: Classify pending email from the connected mailbox, fuzzy-match to existing applications, and stage results in the /inbox page for user review.
argument-hint: "(none)"
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

Read and follow `${JOBPILOT_SKILLS_ROOT}/skills/scan-inbox.md`.
