import type { MetadataRoute } from "next";
import { DOCS_NAV } from "@/components/features/docs";
import { PUBLIC_ROUTES } from "./public-routes";

const BASE = "https://jobpilot.suxrobgm.net";

export default function sitemap(): MetadataRoute.Sitemap {
  const docPaths = DOCS_NAV.map((entry) => entry.href as string);
  return [...PUBLIC_ROUTES, ...docPaths].map((path) => ({
    url: `${BASE}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
