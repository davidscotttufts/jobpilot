# `campaign.tune`

Payload `{campaignId, query, config, counts, topSkipReasons}`. No browser. Judge the yield: query too broad or narrow, `minScore` off, skip reasons clustered? Make one change:

- **Config**: rewrite the query and/or move `minScore` by at most 10, staying within 50-95. Start from a fresh `GET /api/campaigns/$CID`, write `{"config": <updated config>, "expectedUpdatedAt": "<its updatedAt>"}` to `$JOBPILOT_TEMP/campaign.json`, then `PATCH /api/campaigns/$CID --data @...`. A `409` means the user edited it meanwhile: re-fetch and decide once more. A bigger change → ask a `choice` question instead.
- **Search**: when the search itself is dry or off-target, change one saved search instead, via `POST`/`PATCH`/`DELETE /api/pilot/searches[/:id]` (`GET /api/pilot/searches` for ids), with `reason` saying why.

Detail `{"type":"tune"}` (the server dedupes reviews on it). Summary: "Campaign '<query>' yielding 12% - narrowed query to '<new>', minScore 70->65."
