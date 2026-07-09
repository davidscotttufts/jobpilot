"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Close } from "@mui/icons-material";
import { Alert, Button, CircularProgress, IconButton, Link, Stack, Typography } from "@mui/material";
import { CopyField } from "@/components/ui/display";
import {
  formatSkillCommand,
  providerDisplayName,
  triggerUpdate,
  type TerminalProviderId,
} from "@/lib/terminal";
import { RELEASES_URL } from "./agent-install";

const MARKETPLACE_UPDATE_COMMAND = "/plugin marketplace update sukhrob-claude-plugins";

const RELOAD_PLUGINS_COMMAND = "/reload-plugins";

const CODEX_MARKETPLACE_UPDATE_COMMAND = "codex plugin marketplace upgrade sukhrob-codex-plugins";

const TAG_PREFIX = "v";

type UpdatePhase = "idle" | "updating" | "restarting" | "error";

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
  /** Re-probe host health after triggering an update, so the banner clears once the new version is live. */
  onUpdated: () => void;
  /** False in a dev checkout - the one-click update is unavailable, so show manual steps only. */
  canUpdate?: boolean;
}

/**
 * Checks GitHub for the latest terminal release; when behind, offers a one-click self-update (the host
 * swaps + relaunches) and falls back to the manual plugin + setup path when that isn't available.
 */
export function AgentUpdateBanner(props: AgentUpdateBannerProps): ReactNode {
  const { currentVersion, provider, onUpdated, canUpdate } = props;
  const providerLabel = providerDisplayName(provider);
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [showManual, setShowManual] = useState(false);

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

  const handleUpdate = async (): Promise<void> => {
    setPhase("updating");
    try {
      const result = await triggerUpdate();
      if (result.updating || result.reason === "in-progress") {
        // The host is relaunching (here or in another tab); let the health poll ride it back to reachable.
        setPhase("restarting");
        onUpdated();
        return;
      }
      // dev-checkout / no-asset / up-to-date - fall back to the manual steps.
      const upToDate = result.reason === "up-to-date";
      setShowManual(true);
      setPhase(upToDate ? "idle" : "error");
      if (upToDate) {
        onUpdated();
      }
    } catch {
      setShowManual(true);
      setPhase("error");
    }
  };

  if (dismissed || !latest || !currentVersion || !isNewer(latest, currentVersion)) {
    return null;
  }

  const manualOnly = canUpdate === false;

  const manualSteps = (
    <Stack spacing={1}>
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
          <Typography variant="captionMuted">1. Update the JobPilot plugin (in a shell):</Typography>
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
  );

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
          Agent update available - v{latest} (you have v{currentVersion}).
        </Typography>

        {phase === "restarting" ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={14} />
            <Typography variant="captionMuted">Restarting the agent on v{latest}…</Typography>
          </Stack>
        ) : manualOnly ? (
          <>
            <Typography variant="captionMuted">In {providerLabel}:</Typography>
            {manualSteps}
          </>
        ) : (
          <>
            <Button
              size="small"
              variant="contained"
              disabled={phase === "updating"}
              onClick={() => void handleUpdate()}
              startIcon={phase === "updating" ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ alignSelf: "flex-start" }}
            >
              {phase === "updating" ? "Updating…" : "Update now"}
            </Button>
            {phase === "error" && (
              <Typography variant="captionMuted" color="error">
                Automatic update failed - update manually in {providerLabel}:
              </Typography>
            )}
            {showManual ? (
              manualSteps
            ) : (
              <Link
                component="button"
                type="button"
                variant="captionMuted"
                underline="hover"
                onClick={() => setShowManual(true)}
                sx={{ alignSelf: "flex-start" }}
              >
                Prefer to update manually?
              </Link>
            )}
          </>
        )}
      </Stack>
    </Alert>
  );
}
