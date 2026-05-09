"use client";

import { useState, type ReactElement } from "react";
import { Close, RestartAlt, StopCircle } from "@mui/icons-material";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { killSession, startSession } from "@/lib/terminal";
import { useTerminal } from "@/providers/terminal-provider";
import { TerminalPanel } from "./terminal-panel";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 720;
const DEFAULT_HEIGHT = 320;

export function TerminalDrawer(): ReactElement | null {
  const { open, setOpen } = useTerminal();
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [reloadKey, setReloadKey] = useState(0);

  if (!open) return null;

  const startDrag = (event: React.MouseEvent): void => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;

    const onMove = (e: MouseEvent): void => {
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + (startY - e.clientY)));
      setHeight(next);
    };
    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleStop = async (): Promise<void> => {
    await killSession();
  };

  const handleRestart = async (): Promise<void> => {
    await killSession();
    setReloadKey((k) => k + 1);
  };

  return (
    <Box
      sx={(t) => ({
        height,
        flexShrink: 0,
        borderTop: `1px solid ${t.palette.line.divider}`,
        backgroundColor: t.palette.surfaces.base,
        display: "flex",
        flexDirection: "column",
      })}
    >
      <Box
        onMouseDown={startDrag}
        sx={(t) => ({
          height: 6,
          cursor: "ns-resize",
          backgroundColor: t.palette.line.divider,
          "&:hover": { backgroundColor: t.palette.line.border },
        })}
      />
      <Stack
        direction="row"
        sx={(t) => ({
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderBottom: `1px solid ${t.palette.line.divider}`,
        })}
      >
        <Typography variant="captionMuted" sx={{ flex: 1 }}>
          Claude Code · JobPilot.Terminal
        </Typography>
        <Tooltip title="Restart Claude">
          <IconButton size="small" onClick={handleRestart}>
            <RestartAlt fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Stop Claude">
          <IconButton size="small" onClick={handleStop}>
            <StopCircle fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hide terminal">
          <IconButton size="small" onClick={() => setOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <TerminalPanel key={reloadKey} />
    </Box>
  );
}
