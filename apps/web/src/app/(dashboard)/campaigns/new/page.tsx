import { type ReactElement, Suspense } from "react";
import { Skeleton } from "@mui/material";
import type { Metadata } from "next";
import { CampaignComposer } from "@/components/features/campaigns";
import { PageHeader, PageShell } from "@/components/ui/layout";

export const metadata: Metadata = { title: "New campaign" };

interface NewCampaignPageProps {
  searchParams: Promise<{ board?: string; from?: string }>;
}

export default function NewCampaignPage(props: NewCampaignPageProps): ReactElement {
  return (
    <PageShell maxWidth="md">
      {/* `?board=` preselects the board and `?from=` replays a campaign, so both wait on the URL. */}
      <Suspense fallback={<Skeleton variant="rounded" height={480} />}>
        <Composer searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Composer(props: NewCampaignPageProps): Promise<ReactElement> {
  const { board, from } = await props.searchParams;
  const isReplay = !!from;
  return (
    <>
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
    </>
  );
}
