import type { ReactElement } from "react";
import { Stack, Typography } from "@mui/material";
import type { Metadata } from "next";
import { DocsIndexCards } from "@/components/features/docs";

const description = "How to set up and use JobPilot: the agent, campaigns, email, and credentials.";

export const metadata: Metadata = {
  title: "Docs",
  description,
  alternates: { canonical: "/docs" },
  openGraph: { type: "article", url: "/docs", title: "Docs · JobPilot", description },
  twitter: { title: "Docs · JobPilot", description },
};

export default function DocsIndexPage(): ReactElement {
  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Typography variant="h1" sx={{ fontSize: "2rem" }}>
          JobPilot docs
        </Typography>
        <Typography variant="body1Muted" sx={{ fontSize: "0.9375rem", maxWidth: 560 }}>
          JobPilot is an AI agent for your job search. Your dashboard lives on the web; the agent
          runs on your machine, on your own Claude Code or Codex subscription, and drives a real
          browser to search boards, tailor your resume, apply, and follow up. These guides cover
          setup and everyday use.
        </Typography>
      </Stack>
      <DocsIndexCards />
    </Stack>
  );
}
