# Public jobs page

Tier 3 — Intelligence & Efficiency · Status: **todo**

## What

Public `/jobs` list + detail pages built from scraped jobs, deduped into a user-agnostic
`JobListing` table holding digest fields only (title, company, location, salary, techStack,
source board) — **never** who discovered or applied. Ship a simple aggregation from existing Job
rows now; it grows into [t4-shared-job-index.md](t4-shared-job-index.md) and later carries the
ghost-job credibility score.

## Why

Each listing gets an "Apply with JobPilot" CTA — public pages are an SEO/acquisition funnel.

## Implementation notes

- Public routes must be added to the web `proxy.ts` matcher or they 307 to /login.
- Listing pages should be RSC/static for crawlability; add to sitemap.
- Moderation UI belongs to [t1-admin-pages.md](t1-admin-pages.md).

## Done when

`/jobs` renders logged-out, is indexed by the sitemap, and detail pages dedupe reposts of the
same posting.

## Notes

- (add dated notes here)
