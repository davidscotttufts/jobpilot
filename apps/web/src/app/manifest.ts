import type { MetadataRoute } from "next";
import { surfaces } from "@/theme/palette";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobPilot - your job search on autopilot",
    short_name: "JobPilot",
    description:
      "Write your goals once; JobPilot's local Pilot finds roles, tailors your resume, applies, and chases replies overnight - on your own Claude or Codex subscription.",
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
