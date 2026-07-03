import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobPilot - your AI job agent",
    short_name: "JobPilot",
    description:
      "Drive Claude Code or Codex on your own subscription to search job boards, tailor your resume, apply, and track every reply.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0A",
    theme_color: "#0B0B0A",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" }],
  };
}
