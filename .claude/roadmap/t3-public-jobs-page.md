# Public jobs page

Tier 3 — Intelligence & Efficiency · Status: **done**

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
same posting. ✅ All three verified live.

## Notes

- **2026-07-13 — shipped.** 213 listings backfilled from 684 existing jobs. `/jobs` renders with no
  cookie, `sitemap.xml` carries all 213 listing URLs, and detail pages collapse reposts.

- **Two tables, not one.** `JobListing` (deduped posting) + `JobListingSource` (one row per board
  URL, `url @unique`). The child table is what makes "deduped reposts" *visible* ("Posted on N
  boards") and its unique URL makes the ingest upsert atomic — collapsing sources into a `String[]`
  would make appending a read-modify-write that races between two agents scraping the same board,
  and Prisma can't express a safe append-if-absent without `$executeRaw`.

- **Reusing the `Job` table was considered and rejected.** `Job` cascades from `Campaign`, so a
  public URL would 404 the moment its discovering user deleted their campaign; the same posting
  found by 3 users is 3 rows with no canonical id to publish; and `Job` carries `matchScore` /
  `failReason` / `profileId`-by-association, making "never who applied" a code-review discipline
  instead of a structural fact.

- **Do NOT reuse `normalizeJobTitle` from `scoring/applied-duplicates.ts` for the fingerprint.** It
  strips seniority tokens — correct for "did I already apply here?", catastrophic here: it would
  merge a Senior and a Junior opening at one company into a single public listing. `job-listing/
  fingerprint.ts` has its own normalizer that keeps seniority. There is a test for exactly this.

- **Identity is resolved URL-first, then fingerprint.** A known source URL already names its
  posting and is the stronger signal; trusting the fingerprint first would fork a second listing
  whenever a re-scrape worded the title differently, orphaning a listing with no sources.

- **`seenCount` only increments when a new source URL appears**, not on every ingest — otherwise
  re-running the backfill silently doubles it, and it later feeds the ghost-job score.

- **The quality gate is title + company + url + non-empty `techStack`.** Thin rows are skipped
  entirely rather than written as hidden: 69% of existing jobs (469/684) are search-result stubs the
  agent scored but never opened. They get picked up automatically on the PATCH that adds the digest —
  which is why write-through hooks `patchJob`, not just `addJob`.

- **RSC boundary bit twice.** MUI components taking `component={NextLink}` or a function `sx` cannot
  receive them from a server component. This surfaced only in `next build` (dev silently
  client-rendered the page, which also swallowed the JSON-LD). Fixed globally: `NextLink` is now the
  theme default (`MuiLink.component`, `MuiButtonBase.LinkComponent`), so any RSC can link with a
  plain `href`; `LinkCard` / `AccentCard` wrap the remaining function-`sx` cases.

- **Admin surface lives in the feature module.** `/api/admin/listings` is owned by
  `modules/job-listing/admin-listing.controller.ts` (and board CRUD moved to `modules/job-board/`) —
  `/api/admin` is a route prefix, not a home for every feature's admin code. `admin.guard.test.ts`
  mounts each admin controller, so new ones must be registered there.
