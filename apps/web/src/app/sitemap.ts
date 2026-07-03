import type { MetadataRoute } from "next";
import { DOCS_NAV } from "@/components/features/docs";
import { SITE_URL } from "@/lib/constants";
import { PUBLIC_ROUTES } from "./public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const docPaths = DOCS_NAV.map((entry) => entry.href as string);
  return [...PUBLIC_ROUTES, ...docPaths].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
