import type { ReactElement } from "react";
import type { Metadata } from "next";
import { CampaignDetail } from "@/components/features/campaigns";

export const metadata: Metadata = { title: "Campaign" };

interface PageProps {
  params: Promise<{ id: string }>;
}

// The shell and heading live in the client component, which is where the campaign's query - the
// only human-readable name it has - is loaded. Same split as the application detail page.
export default async function CampaignDetailPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <CampaignDetail campaignId={id} />;
}
