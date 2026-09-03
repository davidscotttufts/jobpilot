"use client";

import type { ReactElement } from "react";
import { MoreVert, Pause, PlayArrow, RestartAlt } from "@mui/icons-material";
import { Button, IconButton, Stack } from "@mui/material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { CampaignDetailDto } from "@/api/types";
import { DropdownMenu } from "@/components/ui/feedback";
import { useCampaignActions } from "../use-campaign-actions";

interface CampaignActionsBarProps {
  campaign: CampaignDetailDto;
}

export function CampaignActionsBar(props: CampaignActionsBarProps): ReactElement {
  const { campaign } = props;
  const router = useRouter();

  // Stop, Resume, and Run again are promoted to buttons here, so they drop out of the menu.
  const actions = useCampaignActions({
    campaign,
    omit: ["stop", "resume", "run-again"],
    onDeleted: () => router.replace("/" as Route),
  });

  const isFinished = campaign.status === "completed" || campaign.status === "failed";

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {actions.isInProgress && (
        <Button
          variant="outlined"
          color="warning"
          startIcon={<Pause fontSize="sm" />}
          onClick={() => actions.stop.mutate()}
          disabled={actions.stop.isPending}
        >
          Stop
        </Button>
      )}
      {actions.isStopped && actions.agentAvailable && (
        <Button
          variant="contained"
          startIcon={<PlayArrow fontSize="sm" />}
          onClick={actions.resume}
        >
          Resume
        </Button>
      )}
      {isFinished && actions.agentAvailable && (
        <Button
          variant="outlined"
          startIcon={<RestartAlt fontSize="sm" />}
          onClick={actions.runAgain}
        >
          Run again
        </Button>
      )}
      {actions.hasMenu && (
        <DropdownMenu
          items={actions.menuItems}
          trigger={({ onOpen }) => (
            <IconButton onClick={onOpen} aria-label="More campaign actions">
              <MoreVert fontSize="sm" />
            </IconButton>
          )}
        />
      )}

      {actions.dialogs}
    </Stack>
  );
}
