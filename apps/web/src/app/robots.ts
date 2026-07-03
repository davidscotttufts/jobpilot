import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES } from "./public-routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_ROUTES],
        disallow: [
          "/pipeline",
          "/campaigns",
          "/applications",
          "/analytics",
          "/inbox",
          "/outreach",
          "/resumes",
          "/cover-letters",
          "/boards",
          "/upwork",
          "/settings",
          "/onboarding",
        ],
      },
    ],
    sitemap: "https://jobpilot.suxrobgm.net/sitemap.xml",
  };
}
