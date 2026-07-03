"use client";

import type { ReactElement } from "react";
import { Refresh } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { HostInstallCommands } from "@/components/features/install";

interface AgentInstallCardProps {
  onRecheck: () => void;
  /** Override for the degraded-host case (running but broken install). */
  title?: string;
  description?: string;
  /** Host-reported reason shown under the description (e.g. missing plugin tree). */
  detail?: string | null;
}

/** Shown in the dock when the local terminal host is unreachable: install one-liners + recheck. */
export function AgentInstallCard(props: AgentInstallCardProps): ReactElement {
  const { onRecheck, title, description, detail } = props;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, p: 2, overflowY: "auto" }}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">{title ?? "Install the JobPilot agent"}</Typography>
        <Typography variant="body2Muted">
          {description ??
            "The agent runs locally and drives Claude Code or Codex on your machine. Run the one-liner for your OS, start it, and it connects here automatically."}
        </Typography>
        {detail && (
          <Typography variant="captionMuted" sx={{ color: "error.main" }}>
            {detail}
          </Typography>
        )}
      </Stack>

      <HostInstallCommands />

      <Button
        variant="outlined"
        size="small"
        startIcon={<Refresh />}
        onClick={onRecheck}
        sx={{ alignSelf: "flex-start" }}
      >
        Recheck
      </Button>
    </Stack>
  );
}
