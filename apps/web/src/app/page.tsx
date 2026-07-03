import type { ReactElement } from "react";
import { Box } from "@mui/material";
import type { Metadata } from "next";
import {
  BoardStrip,
  CampaignTypes,
  CtaBand,
  Faq,
  FAQ_ITEMS,
  Hero,
  HowItWorks,
  MarketingFooter,
  MarketingNav,
  PrivacyGrid,
  ProductTour,
} from "@/components/features/marketing";
import { JsonLd } from "@/components/seo";
import { faqPageLd, organizationLd, softwareApplicationLd, websiteLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SOFTWARE_DESCRIPTION =
  "JobPilot drives Claude Code or Codex on your own subscription to search 12 job boards, tailor your resume, apply, and track every reply - from one dashboard.";

export default function LandingPage(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "surfaces.base" }}>
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
        <BoardStrip />
        <CampaignTypes />
        <ProductTour />
        <PrivacyGrid />
        <HowItWorks />
        <Faq />
        <CtaBand />
      </Box>
      <MarketingFooter />
    </Box>
  );
}
