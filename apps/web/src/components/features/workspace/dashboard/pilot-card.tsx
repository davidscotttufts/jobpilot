"use client";

import type { ReactElement, ReactNode } from "react";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { Alert, Chip, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { queryKeys } from "@/api/query-keys";
import {
  PILOT_HOST_OFFLINE_MESSAGE,
  PILOT_MODE_LOOK,
  pilotMode,
} from "@/components/features/pilot/pilot-status";
import { LinkButton } from "@/components/ui/buttons";
import { RelativeTime } from "@/components/ui/display";
import { PulseDot } from "@/components/ui/feedback";
import { SectionCard } from "@/components/ui/layout";
import { useSseChannel } from "@/lib/sse/client";
import type { SessionStatus } from "@/lib/terminal";
import { useAgentAvailable } from "@/providers/agent-provider";
import { plural } from "@/utils/format";
import { type TerminalHealth, useTerminalHealth } from "../../agent-dock/use-terminal-health";
import { useOpenQuestions } from "../../pilot/attention/use-open-questions";

/** Compact read-only pilot presence for the workspace overview; controls live on /pilot. */
export function PilotStatusCard(): ReactElement {
  const agentAvailable = useAgentAvailable();
  // Split so the host poller never mounts on mobile, where no local host can exist.
  return agentAvailable ? <PilotCardWithHost /> : <PilotCardBody health={null} hostStatus={null} />;
}

function PilotCardWithHost(): ReactElement {
  const { health, status } = useTerminalHealth();
  return <PilotCardBody health={health} hostStatus={status} />;
}

interface PilotCardBodyProps {
  health: TerminalHealth | null;
  hostStatus: SessionStatus | null;
}

function PilotCardBody(props: PilotCardBodyProps): ReactNode {
  const { health, hostStatus } = props;
  const queryClient = useQueryClient();
  const stateQuery = useApiQuery(pilotQueries.state());
  const openQuestions = useOpenQuestions().questions.length;

  // Rides the shared pilotChannel source (refcounted per URL), so this adds no connection.
  useSseChannel(pilotChannel, null, {
    on: {
      "state.changed": () => queryClient.invalidateQueries({ queryKey: queryKeys.pilot.state() }),
    },
  });

  const state = stateQuery.data;
  if (!state) return null;

  const mode = pilotMode(state, health, hostStatus?.pilot ?? null);
  const look = PILOT_MODE_LOOK[mode];
  const { dailyApplyCap } = state.instructionsConfig;

  return (
    <SectionCard
      title="Pilot"
      actions={
        <LinkButton size="small" variant="outlined" href="/pilot">
          Open
        </LinkButton>
      }
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <PulseDot tone={look.tone} pulsing={look.pulsing} />
          <Typography variant="body2">{look.label}</Typography>
        </Stack>

        {mode === "offline" && <Alert severity="warning">{PILOT_HOST_OFFLINE_MESSAGE}</Alert>}

        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Stack spacing={0.25}>
            <Typography variant="overlineMuted">Applied today</Typography>
            <Typography variant="body2" color={state.capReached ? "error.main" : "text.primary"}>
              {state.appliedToday} / {dailyApplyCap}
            </Typography>
          </Stack>
          <Stack spacing={0.25}>
            <Typography variant="overlineMuted">Last cycle</Typography>
            {state.lastCycleAt ? (
              <RelativeTime value={state.lastCycleAt} variant="body2" />
            ) : (
              <Typography variant="body2">-</Typography>
            )}
          </Stack>
          {openQuestions > 0 && (
            <Chip
              component={Link}
              href="/pilot"
              clickable
              color="warning"
              size="small"
              label={`${plural(openQuestions, "question")} for you`}
            />
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
