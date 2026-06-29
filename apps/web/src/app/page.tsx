import type { ReactElement } from "react";
import { Box } from "@mui/material";
import {
  CampaignTypes,
  CtaBand,
  Hero,
  HowItWorks,
  MarketingFooter,
  MarketingNav,
} from "@/components/features/marketing";

export default function LandingPage(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "surfaces.base" }}>
      <MarketingNav />
      <Box component="main">
        <Hero />
        <CampaignTypes />
        <HowItWorks />
        <CtaBand />
      </Box>
      <MarketingFooter />
    </Box>
  );
}
