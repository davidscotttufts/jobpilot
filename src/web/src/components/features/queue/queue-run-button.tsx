"use client";

import type { ReactElement } from "react";
import { PlayArrow } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useTerminal } from "@/providers/terminal-provider";

export function QueueRunButton(): ReactElement {
  const { injectSkill, setOpen } = useTerminal();

  const handleClick = async (): Promise<void> => {
    setOpen(true);
    await injectSkill("apply");
  };

  return (
    <Button variant="outlined" startIcon={<PlayArrow />} onClick={handleClick}>
      Run apply
    </Button>
  );
}
