# Public jobs page

Tier 3 - Intelligence & Efficiency · Status: **done**

## What

Public `/jobs` list + detail pages built from scraped jobs, deduped into a user-agnostic
`JobListing` table holding digest fields only (title, company, location, salary, techStack,
source board) - **never** who discovered or applied. Ship a simple aggregation from existing Job
rows now; it grows into [t4-shared-job-index.md](t4-shared-job-index.md) and later carries the
ghost-job credibility score.

## Why

Each listing gets an "Apply with JobPilot" CTA - public pages are an SEO/acquisition funnel.

## Implementation notes

- Public routes must be added to the web `proxy.ts` matcher or they 307 to /login.
- Listing pages should be RSC/static for crawlability; add to sitemap.
- Moderation UI belongs to [t1-admin-pages.md](t1-admin-pages.md).

## Done when

`/jobs` renders logged-out, is indexed by the sitemap, and detail pages dedupe reposts of the
same posting. ✅ All three verified live.

## Notes

- **2026-07-13 - shipped.** 213 listings backfilled from 684 existing jobs. `/jobs` renders with no
  cookie, `sitemap.xml` carries all 213 listing URLs, and detail pages collapse reposts.

- **2026-07-13 - follow-up pass: filters, mobile, live strip.** Tech-stack filter (facets-driven
  multi-select), removable active-filter chips, relative "seen" times, clickable tech chips on the
  detail page, a mobile nav drawer, and a theme-wide control height. Four defects fixed:

  - **The landing "live jobs" strip rendered nothing in production.** It was a `"use cache"` +
    `cacheLife("hours")` component on a page with no dynamic hole, so `cacheComponents` prerendered
    it at *build* time - where the API is unreachable from the image builder. Its `catch → [] →
    return null` then baked an empty section into the static shell for hours, and swallowed Eden's
    `error` too, so a down API looked exactly like an empty index. Now it fetches inside a `Suspense`
    boundary (an uncached fetch there is a dynamic hole) and logs the failure.
  - **`/docs` overflowed horizontally on mobile.** The grid was `gridTemplateColumns: { xs: "1fr" }`
    and the sidebar grid item had no `minWidth: 0`, so the auto track was sized to the min-content of
    six `white-space: nowrap` pills (~650px). `overflowX: "auto"` on the inner Stack could not help:
    the auto-minimum-size-of-zero rule only applies when the *grid item itself* has a non-visible
    overflow. `minmax(0, 1fr)` + `minWidth: 0` on the item.
  - **The RSC boundary bit a third time** - a function `sx` (`transition: (theme) => …`) in the
    server-rendered `TechChips` crashed the detail page the moment a chip became a MUI `Link`. Use
    the raw `motion` token, not a theme callback, in any component that is not `"use client"`.
  - **Elysia's query parser splits on commas.** `?tech=React,TypeScript` arrives as `string[]`, while
    a lone `?tech=React` arrives as `string`, so the contract must accept a union of both. It only
    surfaced at runtime - the Zod schema typechecked fine against a `string`-only shape.

- **`?tech=` stays case-insensitive without a schema migration.** Prisma's array `hasSome` is exact,
  and the agent writes whatever casing the posting used. Rather than add a normalized column, the
  service caches one tech *vocabulary* (`unnest(tech_stack)` grouped by `lower()`, 10 min TTL) and
  uses it for both jobs: it is the facets option list, and it expands an incoming `react` into every
  stored casing (`React`, `react`) before the query. `tech-facets.ts` is pure, so it is unit-tested
  with no DB.

- **Two tables, not one.** `JobListing` (deduped posting) + `JobListingSource` (one row per board
  URL, `url @unique`). The child table is what makes "deduped reposts" *visible* ("Posted on N
  boards") and its unique URL makes the ingest upsert atomic - collapsing sources into a `String[]`
  would make appending a read-modify-write that races between two agents scraping the same board,
  and Prisma can't express a safe append-if-absent without `$executeRaw`.

- **Reusing the `Job` table was considered and rejected.** `Job` cascades from `Campaign`, so a
  public URL would 404 the moment its discovering user deleted their campaign; the same posting
  found by 3 users is 3 rows with no canonical id to publish; and `Job` carries `matchScore` /
  `failReason` / `profileId`-by-association, making "never who applied" a code-review discipline
  instead of a structural fact.

- **Do NOT reuse `normalizeJobTitle` from `scoring/applied-duplicates.ts` for the fingerprint.** It
  strips seniority tokens - correct for "did I already apply here?", catastrophic here: it would
  merge a Senior and a Junior opening at one company into a single public listing. `job-listing/
  fingerprint.ts` has its own normalizer that keeps seniority. There is a test for exactly this.

- **Identity is resolved URL-first, then fingerprint.** A known source URL already names its
  posting and is the stronger signal; trusting the fingerprint first would fork a second listing
  whenever a re-scrape worded the title differently, orphaning a listing with no sources.

- **`seenCount` only increments when a new source URL appears**, not on every ingest - otherwise
  re-running the backfill silently doubles it, and it later feeds the ghost-job score.

- **The quality gate is title + company + url + non-empty `techStack`.** Thin rows are skipped
  entirely rather than written as hidden: 69% of existing jobs (469/684) are search-result stubs the
  agent scored but never opened. They get picked up automatically on the PATCH that adds the digest -
  which is why write-through hooks `patchJob`, not just `addJob`.

- **RSC boundary bit twice.** MUI components taking `component={NextLink}` or a function `sx` cannot
  receive them from a server component. This surfaced only in `next build` (dev silently
  client-rendered the page, which also swallowed the JSON-LD). Fixed globally: `NextLink` is now the
  theme default (`MuiLink.component`, `MuiButtonBase.LinkComponent`), so any RSC can link with a
  plain `href`; `LinkCard` / `AccentCard` wrap the remaining function-`sx` cases.

- **Admin surface lives in the feature module.** `/api/admin/listings` is owned by
  `modules/job-listing/admin-listing.controller.ts` (and board CRUD moved to `modules/job-board/`) -
  `/api/admin` is a route prefix, not a home for every feature's admin code. `admin.guard.test.ts`
  mounts each admin controller, so new ones must be registered there.
