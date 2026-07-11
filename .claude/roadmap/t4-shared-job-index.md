# Shared job index (collective crawl)

Tier 4 — Breakthrough bets · Status: **todo**

## What

Agents across users scan the same boards; dedupe discovery fleet-wide. A posting
scouted+digested by user A's agent is instantly matchable to user B's campaign (postings are
public data; digests carry no user info).

## Why

Marginal campaign cost drops as the user base grows — a network effect on top of playbooks.
The public jobs page ([t3-public-jobs-page.md](t3-public-jobs-page.md)) is this index's
storefront; build the `JobListing` table there first. Enables
[t4-ghost-job-detection.md](t4-ghost-job-detection.md).

## Done when

A campaign's pre-filter checks the shared index before opening the board and skips
already-digested postings.

## Notes

- (add dated notes here)
