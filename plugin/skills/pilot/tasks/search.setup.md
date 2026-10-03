# `search.setup`

Payload `{goals, minScore}`: goals are set but no searches exist. No browser, no worker, no searching. Load the profile and primary resume per `../../_shared/setup.md`, derive 1-3 searches and create each:

```bash
jobpilot-api POST /api/pilot/searches \
  --data '{"query":"<query>","resumeId":"<primary resume id>","reason":"<why>"}'
```

`query` is what you'd type into a board ("senior typescript remote", not "good jobs"); `reason` is one user-facing sentence. Never pin a `board`: boards rotate one per cycle.

Summary: "Set up 2 searches from your goals: 'senior typescript remote', 'dotnet engineer remote'."
