"use client";

import type { ReactElement } from "react";
import { Terminal as TerminalIcon } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useTerminal } from "@/providers/terminal-provider";

export function TerminalToggleButton(): ReactElement {
  const { open, toggle } = useTerminal();
  return (
    <Button
      onClick={toggle}
      size="small"
      fullWidth
      variant={open ? "contained" : "outlined"}
      startIcon={<TerminalIcon fontSize="small" />}
      sx={{ justifyContent: "flex-start" }}
    >
      Terminal
    </Button>
  );
}
