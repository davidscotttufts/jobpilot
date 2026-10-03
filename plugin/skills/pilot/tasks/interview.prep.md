# `interview.prep`

Payload `{applicationId, company, jobTitle, jobUrl, resumeId}`. Write a prep sheet with the `interview` skill's procedure (JD from `jobUrl` when reachable, else the application's stored data; resume per `../../_shared/setup.md`). Save `{"kind":"note","notes":"[interview-prep]\n<sheet>"}` to `$JOBPILOT_TEMP/prep.json`; the server dedupes on the `[interview-prep]` prefix.

```bash
jobpilot-api POST /api/applied/$APP_ID/events --data @"$JOBPILOT_TEMP/prep.json"
```

Summary: "Prep sheet ready for <company> <jobTitle> interview."
