import type { ReactElement } from "react";
import type { Metadata } from "next";
import { OverviewPanel } from "@/components/features/workspace/overview-panel";

export const metadata: Metadata = { title: "Workspace" };

export default function WorkspacePage(): ReactElement {
  return <OverviewPanel />;
}
