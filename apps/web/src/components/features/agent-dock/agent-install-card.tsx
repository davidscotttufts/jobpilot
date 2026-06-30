"use client";

import type { ReactElement } from "react";
import { Refresh } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { CopyField } from "@/components/ui/display";
import { orderedInstallCommands } from "./agent-install";

interface AgentInstallCardProps {
  onRecheck: () => void;
}

/** Shown in the dock when the local terminal host is unreachable: install one-liners + recheck. */
export function AgentInstallCard(props: AgentInstallCardProps): ReactElement {
  const { onRecheck } = props;
  const commands = orderedInstallCommands();

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, p: 2, overflowY: "auto" }}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Install the JobPilot agent</Typography>
        <Typography variant="body2Muted">
          The agent runs locally and drives Claude Code or Codex on your machine. Run the one-liner
          for your OS, start it, and it connects here automatically.
        </Typography>
      </Stack>

      {commands.map(({ label, command }) => (
        <Stack key={label} spacing={0.5}>
          <Typography variant="captionMuted">{label}</Typography>
          <CopyField
            value={command}
            copyMessage="Command copied"
            ariaLabel={`Copy ${label} command`}
          />
        </Stack>
      ))}

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
