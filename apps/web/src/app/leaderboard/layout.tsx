import type { ReactElement, ReactNode } from "react";
import { MarketingShell } from "@/components/features/marketing";

interface LeaderboardLayoutProps {
  children: ReactNode;
}

/** The public leaderboard shares the marketing shell - it is an acquisition surface, not the app. */
export default function LeaderboardLayout(props: LeaderboardLayoutProps): ReactElement {
  return <MarketingShell maxWidth="md">{props.children}</MarketingShell>;
}
