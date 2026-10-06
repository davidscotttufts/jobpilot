# `search.discover`

Payload `{searchId, query, board?, resumeId?, minScore, maxApplications?, campaignId?, newJobsTarget,
maxPages}`.

1. **Campaign.** Use `campaignId` when set; never open a second campaign for one search. Otherwise
   create one and read `.campaignId` as `CID` (`pilotSearchId` is how later runs find it):

   ```bash
   jobpilot-api POST /api/campaigns \
     --data '{"query":"<query>","source":"auto_apply","createdBy":"pilot","pilotSearchId":"<searchId>","config":{"resumeId":"<resumeId>","minScore":<minScore>,"board":"<board>"}}'
   ```

   With `maxApplications` in the payload, add it to that `config`: it is the cap the user set on the
   campaign this search repeats, and dropping it turns a capped weekly run into an unlimited one.

2. **Search.** Delegate one `job-searcher` run with `{runId:$RUN_ID, campaignId:CID, query, board,
   resumeId, minScore, newJobsTarget, maxPages}`. Without subagent support, or if the delegation
   fails, follow `$JOBPILOT_SKILLS_ROOT/../agents/job-searcher.md` inline.

3. **Report** its counts (a `404` means the search was deleted meanwhile: say so in the summary):

   ```bash
   jobpilot-api POST /api/pilot/searches/$SEARCH_ID/run-result \
     --data '{"jobsSeen":<jobsSeen>,"newJobs":<newJobs>,"reachedEnd":<reachedEnd>}'
   ```

An `error` with no new jobs is `outcome:"failed"`; otherwise `done`, naming any `error` in the
summary.

Summary: "Discovered 8 jobs on linkedin.com for 'senior typescript remote' over 3 pages; best Acme
88, Globex 81."
