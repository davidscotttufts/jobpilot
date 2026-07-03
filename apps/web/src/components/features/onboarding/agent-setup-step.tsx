"use client";

import { useState, type ReactElement } from "react";
import { Alert, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useTerminalHealth } from "@/components/features/agent-dock/use-terminal-health";
import {
  HostInstallCommands,
  PLUGIN_COMMANDS,
  SETUP_COMMANDS,
  type InstallProvider,
} from "@/components/features/install";
import { CopyField } from "@/components/ui/display";
import { LoadingSpinner } from "@/components/ui/feedback";

/** Onboarding's "Connect agent" step: detects a running host, or shows compact install commands. */
export function AgentSetupStep(): ReactElement {
  const { health, status } = useTerminalHealth();
  const [provider, setProvider] = useState<InstallProvider>("claude");

  if (health === "checking") {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <LoadingSpinner />
      </Stack>
    );
  }

  if (health === "reachable") {
    return (
      <Stack spacing={1.5}>
        <Alert severity="success">
          Agent detected{status?.hostVersion ? ` (v${status.hostVersion})` : ""} - you&apos;re all
          set. Finish to open your workspace and launch it from the agent dock.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2Muted">
        The agent runs on your machine and does the actual searching and applying. Add the JobPilot
        plugin to Claude Code or Codex, then run setup - it installs and starts everything.
      </Typography>
      {health === "degraded" && status?.detail && (
        <Alert severity="warning">
          A JobPilot host is running but broken: {status.detail} Re-run setup to reinstall.
        </Alert>
      )}
      <Tabs
        value={provider}
        onChange={(_, next: InstallProvider) => setProvider(next)}
        sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}
      >
        <Tab value="claude" label="Claude Code" />
        <Tab value="codex" label="Codex" />
      </Tabs>
      <Stack spacing={1}>
        {[...PLUGIN_COMMANDS[provider], SETUP_COMMANDS[provider]].map((command) => (
          <CopyField
            key={command}
            value={command}
            copyMessage="Command copied"
            ariaLabel="Copy install command"
          />
        ))}
      </Stack>
      <Typography variant="captionMuted">
        No plugin support? Install the host directly, then start <code>jobpilot</code>:
      </Typography>
      <Stack spacing={1}>
        <HostInstallCommands />
      </Stack>
      <Typography variant="body2Muted">
        You can do this anytime later - the agent dock on the dashboard has the same instructions.
      </Typography>
    </Stack>
  );
}
