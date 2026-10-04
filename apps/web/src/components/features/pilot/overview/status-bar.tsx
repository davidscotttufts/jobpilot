"use client";

import type { ReactElement } from "react";
import type { PilotState } from "@jobpilot/contracts/pilot";
import { Box, Button, Card, CardContent, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { ColorChip } from "@/components/ui/display";
import { PulseDot } from "@/components/ui/feedback";
import { CYCLE_STATUS_COLOR, type PilotHealth, providerDisplayName } from "@/lib/terminal";
import { useConfirm } from "@/providers/confirm-provider";
import { formatRelativeTime, plural } from "@/utils/format";
import type { TerminalHealth } from "../../agent-dock/use-terminal-health";
import {
  idleCaption,
  PILOT_HOST_OFFLINE_MESSAGE,
  PILOT_MODE_LOOK,
  type PilotMode,
  pilotMode,
} from "../pilot-status";
import { AGENT_LABELS, taskTypeAgent, taskTypeLabel } from "../task-types";
import type { PilotControls } from "../use-pilot-controls";
import { useNextWake } from "./use-next-wake";

function statusDetail(
  mode: PilotMode,
  state: PilotState,
  pilot: PilotHealth | null,
  nextWakeAt: Date | null,
): string {
  const run = state.currentRun;
  switch (mode) {
    case "off":
      return state.instructionsGoals.trim() === ""
        ? "Write your goals, then start the pilot."
        : "Start the pilot to run cycles on your local agent.";
    case "offline":
      return PILOT_HOST_OFFLINE_MESSAGE;
    case "working":
      if (!run) {
        return "Running a cycle";
      }
      return `${taskTypeLabel(run.taskType)} · ${AGENT_LABELS[taskTypeAgent(run.taskType)]} · for ${formatRelativeTime(run.startedAt)}`;
    case "starting":
      return "The first cycle begins shortly.";
    case "unpaired":
      return "The agent host is up; waiting for the pilot session to connect.";
  }
  const caption = idleCaption(pilot, nextWakeAt);
  if (caption !== "") {
    return caption;
  }
  return state.lastCycleAt ? `Last cycle ${formatRelativeTime(state.lastCycleAt)} ago` : "";
}

interface StatusBarProps {
  state: PilotState;
  controls: PilotControls;
  health: TerminalHealth;
  pilot: PilotHealth | null;
}

/** The pilot's one status readout and its Start/Stop control. */
export function StatusBar(props: StatusBarProps): ReactElement {
  const { state, controls, health, pilot } = props;
  const confirm = useConfirm();
  const nextWakeAt = useNextWake(state);

  const mode = pilotMode(state, health, pilot);
  const look = PILOT_MODE_LOOK[mode];
  const detail = statusDetail(mode, state, pilot, nextWakeAt);
  const goalsEmpty = state.instructionsGoals.trim() === "";
  const timeouts = pilot?.consecutiveTimeouts ?? 0;

  const stopWithConfirm = async (): Promise<void> => {
    const ok = await confirm({
      title: "Stop the pilot?",
      description:
        "The pilot stops running cycles: no applying, networking, or posting until you start it again.",
      confirmLabel: "Stop",
      destructive: true,
    });
    if (ok) {
      await controls.stop();
    }
  };

  const meta = [
    providerDisplayName(controls.provider),
    plural(state.cycleCount, "cycle"),
    state.lastCycleAt && `last ${formatRelativeTime(state.lastCycleAt)} ago`,
  ].filter(Boolean);

  return (
    <Card variant={mode === "working" ? "accent" : undefined}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
          <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
            <PulseDot tone={look.tone} pulsing={look.pulsing} size="md" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="p">
                {look.label}
              </Typography>
              {detail !== "" && <Typography variant="body2Muted">{detail}</Typography>}
            </Box>
          </Stack>
          {state.running ? (
            <Button
              color="error"
              variant="outlined"
              disabled={controls.isLoading}
              onClick={() => void stopWithConfirm()}
            >
              Stop
            </Button>
          ) : (
            // A disabled button emits no pointer events, so the tooltip needs an enabled span to hover over.
            <Tooltip title={goalsEmpty ? "Write the pilot's goals before starting it." : ""}>
              <Box component="span" sx={{ display: { xs: "flex", sm: "inline-flex" } }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={controls.isLoading || health !== "reachable" || goalsEmpty}
                  onClick={() => void controls.start()}
                >
                  Start
                </Button>
              </Box>
            </Tooltip>
          )}
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1.5, ml: { sm: 3 }, alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
        >
          <Typography variant="captionMuted">{meta.join(" · ")}</Typography>
          {pilot?.lastCycleStatus && (
            <ColorChip
              value={pilot.lastCycleStatus}
              colors={CYCLE_STATUS_COLOR}
              variant="outlined"
              size="small"
            />
          )}
          {timeouts > 0 && (
            <Chip
              color="warning"
              variant="outlined"
              label={plural(timeouts, "timeout")}
              size="small"
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
