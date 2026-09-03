"use client";

import type { ReactNode } from "react";
import { MoreVert } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import type { CampaignDto } from "@/api/types";
import { DropdownMenu } from "@/components/ui/feedback";
import { useCampaignActions } from "./use-campaign-actions";

interface CampaignRowMenuProps {
  campaign: CampaignDto;
}

/** The campaign detail page's actions, on a list row - so resuming or replaying one of a page of
 *  campaigns doesn't cost a round trip through its detail page. */
export function CampaignRowMenu(props: CampaignRowMenuProps): ReactNode {
  const { campaign } = props;
  const actions = useCampaignActions({ campaign });

  if (!actions.hasMenu) {
    return null;
  }

  return (
    <>
      <DropdownMenu
        items={actions.menuItems}
        stopPropagation
        trigger={({ onOpen }) => (
          <Tooltip title="Campaign actions" enterDelay={400}>
            <IconButton
              size="small"
              aria-label={`Actions for campaign ${campaign.query}`}
              onClick={onOpen}
            >
              <MoreVert fontSize="sm" />
            </IconButton>
          </Tooltip>
        )}
      />
      {actions.dialogs}
    </>
  );
}
