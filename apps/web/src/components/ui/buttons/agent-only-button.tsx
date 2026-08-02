"use client";

import type { ReactElement, ReactNode } from "react";
import { Box, Button, type ButtonProps, Tooltip } from "@mui/material";
import { useAgentAvailable } from "@/providers/agent-provider";

const UNAVAILABLE = "Open JobPilot on your desktop to run this.";

interface AgentOnlyButtonProps extends ButtonProps {
  children: ReactNode;
  /** Shown while the agent is reachable; the unavailable reason replaces it otherwise. */
  tooltip?: string;
}

/**
 * A button for work that only the local agent can do. Disabled with a reason rather than hidden:
 * a control that silently vanishes on mobile reads as a missing feature.
 */
export function AgentOnlyButton(props: AgentOnlyButtonProps): ReactElement {
  const { children, disabled, tooltip = "", ...rest } = props;
  const available = useAgentAvailable();

  return (
    <Tooltip title={available ? tooltip : UNAVAILABLE}>
      {/* A disabled button emits no pointer events, so the tooltip needs an enabled wrapper. */}
      <Box component="span" sx={{ display: "inline-flex" }}>
        <Button {...rest} disabled={disabled || !available}>
          {children}
        </Button>
      </Box>
    </Tooltip>
  );
}
