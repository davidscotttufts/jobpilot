import type { MetadataRoute } from "next";
import { surfaces } from "@/theme/palette";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobPilot - an AI agent that applies to jobs for you",
    short_name: "JobPilot",
    description:
      "An AI agent that finds jobs, tailors your resume, applies, and follows up on replies. It runs on your computer with your Claude or Codex subscription.",
    start_url: "/",
    display: "standalone",
    background_color: surfaces.base,
    theme_color: surfaces.base,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icon-maskable.svg", type: "image/svg+xml", sizes: "any", purpose: "maskable" },
      // Raster fallbacks for platforms (iOS, older Android) that don't render SVG launcher icons.
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
    ],
  };
}
