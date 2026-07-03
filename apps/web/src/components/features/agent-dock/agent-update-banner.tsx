"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Close } from "@mui/icons-material";
import { Alert, IconButton, Stack, Typography } from "@mui/material";
import { CopyField } from "@/components/ui/display";
import { formatSkillCommand, providerDisplayName, type TerminalProviderId } from "@/lib/terminal";
import { RELEASES_URL } from "./agent-install";

const MARKETPLACE_UPDATE_COMMAND = "/plugin marketplace update sukhrob-claude-plugins";

const RELOAD_PLUGINS_COMMAND = "/reload-plugins";

const CODEX_MARKETPLACE_UPDATE_COMMAND = "codex plugin marketplace upgrade sukhrob-codex-plugins";

const TAG_PREFIX = "v";

interface GitHubRelease {
  tag_name: string;
}

function parseVersion(value: string): number[] {
  return value.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

/** True when `latest` is a strictly higher semver than `current`. */
function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

interface AgentUpdateBannerProps {
  currentVersion: string;
  provider: TerminalProviderId;
}

/** Checks GitHub for the latest terminal release; when behind, points the user at the plugin + setup update path. */
export function AgentUpdateBanner(props: AgentUpdateBannerProps): ReactNode {
  const { currentVersion, provider } = props;
  const providerLabel = providerDisplayName(provider);
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async (): Promise<void> => {
      try {
        const res = await fetch(RELEASES_URL, {
          headers: { accept: "application/vnd.github+json" },
        });

        if (!res.ok) {
          return;
        }

        const releases = (await res.json()) as GitHubRelease[];
        const versions = releases
          .map((r) => r.tag_name)
          .filter((tag) => tag.startsWith(TAG_PREFIX))
          .map((tag) => tag.slice(TAG_PREFIX.length));

        if (active && versions.length > 0) {
          setLatest(versions.reduce((max, v) => (isNewer(v, max) ? v : max)));
        }
      } catch {
        // offline or rate-limited - no banner
        console.warn("Failed to check for agent updates");
      }
    };

    void check();
    return () => {
      active = false;
    };
  }, []);

  if (dismissed || !latest || !currentVersion || !isNewer(latest, currentVersion)) {
    return null;
  }

  return (
    <Alert
      severity="info"
      sx={{ borderRadius: 0, py: 0.5, "& .MuiAlert-message": { width: "100%" } }}
      action={
        <IconButton
          size="small"
          aria-label="Dismiss update notice"
          onClick={() => setDismissed(true)}
        >
          <Close fontSize="small" />
        </IconButton>
      }
    >
      <Stack spacing={1}>
        <Typography variant="captionMuted">
          Agent update available - v{latest} (you have v{currentVersion}). In {providerLabel}:
        </Typography>
        {provider === "claude" ? (
          <>
            <Stack spacing={0.5}>
              <Typography variant="captionMuted">1. Update the JobPilot plugin:</Typography>
              <CopyField
                value={MARKETPLACE_UPDATE_COMMAND}
                copyMessage="Command copied"
                ariaLabel="Copy plugin update command"
              />
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="captionMuted">2. Reload plugins to pick up the update:</Typography>
              <CopyField
                value={RELOAD_PLUGINS_COMMAND}
                copyMessage="Command copied"
                ariaLabel="Copy reload plugins command"
              />
            </Stack>
          </>
        ) : (
          <Stack spacing={0.5}>
            <Typography variant="captionMuted">
              1. Update the JobPilot plugin (in a shell):
            </Typography>
            <CopyField
              value={CODEX_MARKETPLACE_UPDATE_COMMAND}
              copyMessage="Command copied"
              ariaLabel="Copy plugin update command"
            />
          </Stack>
        )}
        <Stack spacing={0.5}>
          <Typography variant="captionMuted">
            {provider === "claude"
              ? "3. Update the agent (restarts it, self-updating):"
              : "2. Update the agent (restarts it, self-updating - the restart loads the updated plugin):"}
          </Typography>
          <CopyField
            value={formatSkillCommand(provider, "setup")}
            copyMessage="Command copied"
            ariaLabel="Copy setup command"
          />
        </Stack>
      </Stack>
    </Alert>
  );
}
