/**
 * Indexable, no-auth entry pages - the SEO-visible marketing/auth surface.
 * Shared by `sitemap.ts` and `robots.ts` so the two never drift.
 * (Distinct from the proxy's public matcher, which also lets through
 * non-indexable flows like verify-email / reset-password.)
 *
 * A static public page must be added BOTH here and to the `config.matcher`
 * lookahead in `proxy.ts` - Next requires that matcher to be a literal, so it
 * can't be derived from this list. Dynamic pages (e.g. `/u/[username]`) stay
 * out of here and are emitted by `sitemap.ts` instead.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/docs",
  "/install",
  "/jobs",
  "/leaderboard",
  "/login",
  "/register",
] as const;
