"use client";

import { type ReactElement, useState } from "react";
import { Stack, Tab, Tabs, Typography } from "@mui/material";
import { CopyField } from "@/components/ui/display";
import { HostInstallCommands } from "./host-install-commands";
import { type InstallProvider, PLUGIN_COMMANDS, SETUP_COMMANDS } from "./provider-commands";

/** Provider tabs + plugin/setup copy commands, with a separate host repair command. */
export function PluginInstallCommands(): ReactElement {
  const [provider, setProvider] = useState<InstallProvider>("claude");

  return (
    <Stack spacing={2}>
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
        Need to repair the terminal host? The plugin is still required for Codex:
      </Typography>
      <Stack spacing={1}>
        <HostInstallCommands />
      </Stack>
    </Stack>
  );
}
