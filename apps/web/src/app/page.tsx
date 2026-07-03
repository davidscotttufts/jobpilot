import type { ReactElement } from "react";
import { Box } from "@mui/material";
import {
  BoardStrip,
  CampaignTypes,
  CtaBand,
  Faq,
  Hero,
  HowItWorks,
  MarketingFooter,
  MarketingNav,
  PrivacyGrid,
  ProductTour,
} from "@/components/features/marketing";

export default function LandingPage(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "surfaces.base" }}>
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
