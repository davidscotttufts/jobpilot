# `search.discover`

Payload `{searchId, query, board?, resumeId?, minScore, campaignId?, newJobsTarget, maxPages}`. Run ONE board search through the `job-searcher` subagent. `SEARCH_ID=<payload.searchId>`.

## 1. Campaign

A `campaignId` in the payload means reuse it (`CID=<payload.campaignId>`); never open a second campaign for one search. Only when it is absent, create one - `pilotSearchId` is load-bearing, it is how the next cycle finds this campaign again:

```bash
jobpilot-api POST /api/campaigns \
  --data '{"query":"<query>","source":"auto_apply","createdBy":"pilot","pilotSearchId":"<SEARCH_ID>","config":{"resumeId":"<resumeId>","minScore":<n>,"board":"<board>"}}'
```

Read `.campaignId` from the response as `CID`.

## 2. Search

Delegate to the `job-searcher` subagent with:

```json
{ "runId": "<RUN_ID>", "campaignId": "<CID>", "query": "<query>", "board": "<board>", "resumeId": "<resumeId>",
  "minScore": <minScore>, "newJobsTarget": <newJobsTarget>, "maxPages": <maxPages> }
```

It searches, dedupes, scores and saves the rows, heartbeats the run, and returns `{jobsSeen, newJobs, reachedEnd, pagesRead, best, skipped, hints, error}`. No subagent support, or the delegation fails: read `$JOBPILOT_SKILLS_ROOT/../agents/job-searcher.md` and follow it inline. Same behavior, just no context isolation.

## 3. Report

Report the search run with the agent's counts - a `404` means the search was deleted mid-run, so say so in the summary and move on:

```bash
jobpilot-api POST /api/pilot/searches/$SEARCH_ID/run-result \
  --data '{"jobsSeen":<jobsSeen>,"newJobs":<newJobs>,"reachedEnd":<reachedEnd>}'
```

Journal the pages read, new jobs and best scores ("Discovered 8 jobs on linkedin.com for 'senior typescript remote' over 3 pages; best Acme 88, Globex 81."). Pass the agent's `hints` through as the result's `hints`. A non-null `error` with no new jobs is `outcome:"failed"`, the error in the summary; otherwise `done`, with the error named in the summary.
