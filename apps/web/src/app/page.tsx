import type { ReactElement } from "react";
import { Box } from "@mui/material";
import type { Metadata } from "next";
import {
  CtaBand,
  FAQ_ITEMS,
  Faq,
  Hero,
  LiveJobsStrip,
  MarketingFooter,
  MarketingNav,
  Pilot,
  ProductTour,
  ProofStrip,
  Teaser,
  Trust,
} from "@/components/features/marketing";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageLd, organizationLd, softwareApplicationLd, websiteLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SOFTWARE_DESCRIPTION =
  "A free, open-source AI agent that finds jobs, tailors your resume, and applies for you. It runs on your computer with your Claude Code or Codex subscription.";

export default function LandingPage(): ReactElement {
  return (
    // overflowX clip: decorative glows/orbs must never widen the page on mobile.
    <Box sx={{ minHeight: "100vh", backgroundColor: "surfaces.base", overflowX: "clip" }}>
      <JsonLd
        data={[
          organizationLd(),
          websiteLd(),
          softwareApplicationLd(SOFTWARE_DESCRIPTION),
          faqPageLd(FAQ_ITEMS),
        ]}
      />
      <MarketingNav />
      <Box component="main">
        <Hero />
        <Teaser footer={<ProofStrip />} />
        <Pilot />
        <ProductTour />
        <Trust />
        <LiveJobsStrip />
        <Faq />
        <CtaBand />
      </Box>
      <MarketingFooter />
    </Box>
  );
}
