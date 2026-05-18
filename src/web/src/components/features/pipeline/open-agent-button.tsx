"use client";

import type { ReactElement } from "react";
import { PlayArrow } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useAgent } from "@/providers/agent-provider";

export function OpenAgentButton(): ReactElement {
  const { expand } = useAgent();
  return (
    <Button
      variant="contained"
      size="small"
      startIcon={<PlayArrow fontSize="md" />}
      onClick={() => expand()}
    >
      Open agent
    </Button>
  );
}
