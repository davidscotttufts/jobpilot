import type { MetadataRoute } from "next";
import { api } from "@/api/client";
import { DOCS_NAV } from "@/components/features/docs";
import { SITE_URL } from "@/lib/constants";
import { PUBLIC_ROUTES } from "./public-routes";

/** Every published listing, so the job pages are discoverable rather than orphaned. */
async function jobEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data } = await api.public.jobs.sitemap.get();
    return (data ?? []).map((job) => ({
      url: `${SITE_URL}/jobs/${job.slug}`,
      lastModified: new Date(job.lastSeenAt),
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {
    // A sitemap missing its job URLs beats a build that fails because the API blinked.
    return [];
  }
}

/** Every portfolio, so the /u/[username] pages are indexable. */
async function portfolioEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data } = await api.public.portfolio.sitemap.get();
    return (data ?? []).map((p) => ({
      url: `${SITE_URL}/u/${p.username}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.5,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docPaths = DOCS_NAV.map((entry) => entry.href as string);
  const staticEntries: MetadataRoute.Sitemap = [...PUBLIC_ROUTES, ...docPaths].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const [jobs, portfolios] = await Promise.all([jobEntries(), portfolioEntries()]);
  return [...staticEntries, ...jobs, ...portfolios];
}
