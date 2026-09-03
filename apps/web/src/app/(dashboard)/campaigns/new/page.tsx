import type { ReactElement } from "react";
import type { Metadata } from "next";
import { CampaignComposer } from "@/components/features/campaigns";
import { PageHeader, PageShell } from "@/components/ui/layout";

export const metadata: Metadata = { title: "New campaign" };

interface NewCampaignPageProps {
  searchParams: Promise<{ board?: string; from?: string }>;
}

export default async function NewCampaignPage(props: NewCampaignPageProps): Promise<ReactElement> {
  const { board, from } = await props.searchParams;
  const isReplay = !!from;

  return (
    <PageShell maxWidth="md">
      <PageHeader
        eyebrow="Campaign"
        title={isReplay ? "Run this campaign again" : "Start a new campaign"}
        description={
          isReplay
            ? "Everything is copied from the earlier campaign. Change anything you want before starting - this runs as a new campaign, and the old one stays as it is."
            : "Search a job board, score matches, and optionally batch-apply."
        }
      />
      <CampaignComposer defaultBoard={board} fromCampaignId={from} />
    </PageShell>
  );
}
