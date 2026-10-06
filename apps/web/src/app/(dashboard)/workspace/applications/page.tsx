import type { ReactElement } from "react";
import type { Metadata } from "next";
import { ApplicationsPanel } from "@/components/features/workspace/applications/applications-panel";

export const metadata: Metadata = { title: "Applications" };

export default function WorkspaceApplicationsPage(): ReactElement {
  return <ApplicationsPanel />;
}
