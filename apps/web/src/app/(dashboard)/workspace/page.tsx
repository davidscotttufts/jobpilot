import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { WorkspaceActionsProvider, WorkspaceView } from "@/components/features/workspace";
import { PageHeader } from "@/components/ui/layout";

export default function WorkspacePage(): ReactElement {
  return (
    <WorkspaceActionsProvider>
      <Stack sx={{ flex: 1, minHeight: 0 }}>
        <Stack sx={{ paddingInline: 2.5 }}>
          <PageHeader eyebrow="Workspace" title="Workspace" />
        </Stack>
        <WorkspaceView />
      </Stack>
    </WorkspaceActionsProvider>
  );
}
