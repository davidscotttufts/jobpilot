# Public "hire me" page

Independent track · Status: **done** · Added 2026-07-15 · Builds on: [t3-public-jobs-page.md](t3-public-jobs-page.md) infra (done), the Pilot's promotion feature (M3)

## What

A public, SEO-indexed per-user portfolio page on the hosted domain, auto-generated from
profile/resume and kept fresh by the Pilot (new resume variant, new project, journal-worthy
outcomes → page updates as a proposed refresh). Promotion posts (Reddit/HN/LinkedIn, Pilot M3)
and outreach messages link to it, so every Pilot action doubles as inbound funnel - and the
page footer markets JobPilot itself.

## Why

Outbound applications and posts need somewhere credible to land; a maintained personal page
converts better than a resume attachment and is marketing no competitor's apply-bot produces.

## Done when

Every account has an always-public page ✅ (superseded the opt-in toggle - see 07-19 note), promo/
outreach links point at it ✅, it renders the active resume + portfolio server-side (SEO) ✅, and a
Pilot-proposed refresh after a resume change is one-tap approvable (deferred - see notes).

## Notes

- **2026-07-19 - shipped MVP.** Public per-user portfolio at `/u/[username]`, rendered server-side
  from the active resume (headline, summary, skills, links) plus a GitHub-style activity heatmap
  (applications + networking, 365-day, UTC buckets) and stat tiles (streaks, 30-day activity).
  Identity moved onto `User` (`username` unique slug, `portfolioPublished`, `availability`) - not
  Profile - via `20260719000000_add_user_portfolio_fields`. New unguarded `portfolio` module
  (`/api/public/portfolio/:username` + `/leaderboard` + `/sitemap`) with an explicit `select` so no
  private Profile column (email/address/EEO/work-auth) can leak; rate-limited like `publicJobs`.
  Authed settings live under `/api/profile/portfolio` (get/patch/available/preview), surfaced in a
  new **Settings → Portfolio** tab (claim handle, publish toggle, "open to work", copy link, live
  preview) + a rail nav entry. Also shipped beyond the original scope: a public **`/leaderboard`**
  (podium + week/month/all window toggle, ranked by activity), a landing-page **trending strip**
  (Suspense-safe, hides under 3 published users), per-portfolio **OpenGraph images** for rich link
  unfurls, marketing nav/footer links, sitemap entries, and an analytics "Your rank" chip. Verified
  end-to-end: public pages render logged-out (no `/login` 307), unknown/unpublished usernames 404,
  no private fields in the JSON, OG image falls back (never 500s) when the API is down.
- **2026-07-19 - always-public model.** Dropped the `portfolioPublished` opt-in: every account now
  has an always-live portfolio. `username` is required (unique) and auto-assigned at registration
  (readable `adjective-noun-####`, e.g. `lunar-cirrus-5266`); existing users were backfilled with a
  deterministic `pilot-<md5(id)>` slug in migration `20260719010000_portfolio_always_public`. The
  leaderboard, sitemap, and landing "trending" strip now include every user with a profile (strip
  shows whenever ≥1 trending user, not ≥3). Settings keeps the username + "open to work" controls;
  the publish toggle is gone.
- **Deferred:** the Pilot-proposed one-tap refresh after a resume change (M3 promotion tie-in). The
  page already stays fresh automatically because it reads the live primary resume; the explicit
  "approve refresh" card is a Pilot-agenda item, not a page feature.
