import type { ReactNode } from "react";
import type { CampaignActor } from "@jobpilot/contracts/campaign";
import { Chip } from "@mui/material";

interface PilotBadgeProps {
  createdBy: CampaignActor;
}

/** Marks a campaign the pilot created; renders nothing for user- or agent-created ones. */
export function PilotBadge(props: PilotBadgeProps): ReactNode {
  if (props.createdBy !== "pilot") return null;
  return <Chip size="small" label="Pilot" color="info" variant="outlined" />;
}
