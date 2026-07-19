import type { ReactElement, ReactNode } from "react";
import { MarketingShell } from "@/components/features/marketing";

interface PortfolioLayoutProps {
  children: ReactNode;
}

/** Public portfolios share the marketing shell - they are an acquisition surface, not the app. */
export default function PortfolioLayout(props: PortfolioLayoutProps): ReactElement {
  return <MarketingShell maxWidth="md">{props.children}</MarketingShell>;
}
