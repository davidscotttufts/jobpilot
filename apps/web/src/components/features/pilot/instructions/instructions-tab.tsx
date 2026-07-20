"use client";

import type { ReactElement } from "react";
import { Link as MuiLink, Skeleton, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { InstructionsEditor } from "./instructions-editor";

/** Instructions tab: the sectioned instructions editor. */
export function InstructionsTab(): ReactElement {
  // Same key as the Overview's state query; PilotLive keeps the shared cache fresh.
  const stateQuery = useApiQuery(pilotQueries.state(), {
    errorMessage: "Failed to load pilot state",
  });

  return (
    <Stack spacing={3}>
      {stateQuery.isLoading || !stateQuery.data ? (
        <Skeleton variant="rectangular" height={480} />
      ) : (
        <InstructionsEditor state={stateQuery.data} />
      )}
      <Typography variant="body2Muted">
        Manage push notifications in{" "}
        <MuiLink href="/settings/notifications">Settings → Notifications</MuiLink>.
      </Typography>
    </Stack>
  );
}
