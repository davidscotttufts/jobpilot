/**
 * Indexable, no-auth entry pages - the SEO-visible marketing/auth surface.
 * Shared by `sitemap.ts` and `robots.ts` so the two never drift.
 * (Distinct from the proxy's public matcher, which also lets through
 * non-indexable flows like verify-email / reset-password.)
 */
export const PUBLIC_ROUTES = ["/", "/docs", "/install", "/jobs", "/login", "/register"] as const;
