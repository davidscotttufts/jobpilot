"use client";

import type { ReactElement } from "react";
import type { PilotState, TaskList } from "@jobpilot/contracts/pilot";
import { Box, Typography } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { SectionCard } from "@/components/ui/layout";
import type { PilotHealth } from "@/lib/terminal";
import { formatRelativeTime, formatTimeUntil, humanizeIsoInText } from "@/utils/format";
import type { TerminalHealth } from "../../agent-dock/use-terminal-health";
import { isHostOffline } from "../host-status";
import { taskTypeAgent, taskTypeLabel } from "../task-types";
import { AgentList, type Stage, StageArrow, StageCard } from "./stage-card";
import { useTaskList } from "./task-list-preview";
import { useNextWake } from "./use-next-wake";

type Mode = "off" | "offline" | "working" | "sleeping";

const HOST: Stage = { title: "Host", role: "Checks for work", tone: "blue" };
const SERVER: Stage = { title: "Server", role: "Picks a task", tone: "peach" };
const SESSION: Stage = { title: "Session", role: "Runs the task", tone: "violet" };
const JOURNAL: Stage = { title: "Journal", role: "Records the outcome", tone: "green" };

const EMPTY_REASON_CAPTIONS: Record<NonNullable<TaskList["emptyReason"]>, string> = {
  capReached: "Daily cap reached",
  awaitingSetup: "Waiting for your goals",
  clear: "Nothing to do",
};

const MODE_NOTICES: Partial<Record<Mode, string>> = {
  off: "Enable the pilot to watch it run cycles.",
  offline: "Start the JobPilot agent so the pilot can run cycles.",
};

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function pilotMode(state: PilotState, health: TerminalHealth, pilot: PilotHealth | null): Mode {
  if (!state.running) {
    return "off";
  }
  if (isHostOffline(health)) {
    return "offline";
  }
  return pilot?.conducting ? "working" : "sleeping";
}

function hostCaption(mode: Mode, pilot: PilotHealth | null, nextWakeAt: Date | null): string {
  switch (mode) {
    case "off":
      return "Pilot disabled";
    case "offline":
      return "Agent offline";
    case "working":
      return "Running a cycle";
  }
  const parts: string[] = [];
  const lastCycleAt = pilot?.lastCycleAt ?? null;
  if (pilot?.lastCycleStatus === "empty" && lastCycleAt) {
    parts.push(`Checked ${formatRelativeTime(lastCycleAt)} ago, nothing to do`);
  }
  if (nextWakeAt) {
    parts.push(`wakes in ${formatTimeUntil(nextWakeAt)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Idle";
}

function serverCaption(taskList: TaskList | null | undefined): string {
  const next = taskList?.tasks[0];
  if (next) {
    return `Up next · ${truncate(next.title)}`;
  }
  return EMPTY_REASON_CAPTIONS[taskList?.emptyReason ?? "clear"];
}

interface OrchestrationPanelProps {
  state: PilotState;
  health: TerminalHealth;
  pilot: PilotHealth | null;
}

export function OrchestrationPanel(props: OrchestrationPanelProps): ReactElement {
  const { state, health, pilot } = props;
  const journal = useApiQuery(pilotQueries.journal());
  const nextWakeAt = useNextWake(state);
  const taskList = useTaskList();

  const mode = pilotMode(state, health, pilot);
  const muted = mode === "off" || mode === "offline";
  const working = mode === "working";
  const run = muted ? null : state.currentRun;
  const running = run !== null;
  const branch = run ? taskTypeAgent(run.taskType) : null;

  // A run's id is the cycleId of the action it posts.
  const journalItems = journal.data?.items ?? [];
  const posted = run
    ? (journalItems.find((entry) => entry.kind === "action" && entry.cycleId === run.id) ?? null)
    : null;
  const journalCaption = posted
    ? truncate(humanizeIsoInText(posted.summary))
    : `${state.appliedToday} / ${state.instructionsConfig.dailyApplyCap} applied today`;
  const sessionCaption = run
    ? `${taskTypeLabel(run.taskType)} · running ${formatRelativeTime(run.startedAt)}`
    : "Idle";

  const notice = MODE_NOTICES[mode] ?? null;

  return (
    <SectionCard title="Orchestration" description="How the pilot works a cycle, live.">
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        <StageCard
          stage={HOST}
          caption={hostCaption(mode, pilot, nextWakeAt)}
          active={working && !run}
          muted={muted}
        />
        <StageArrow lit={working} />
        <StageCard stage={SERVER} caption={serverCaption(taskList.data)} muted={muted} />
        <StageArrow lit={running} />
        <StageCard
          stage={SESSION}
          caption={sessionCaption}
          active={running}
          muted={muted}
          grow={1.6}
        >
          <AgentList branch={branch} />
        </StageCard>
        <StageArrow lit={running} />
        <StageCard
          stage={JOURNAL}
          caption={journalCaption}
          active={posted !== null}
          muted={muted}
        />
      </Box>
      <Box sx={{ mt: 1.5 }}>
        {notice ? (
          <Typography variant="body2Muted">{notice}</Typography>
        ) : (
          <Typography variant="captionMuted">
            Each cycle the host checks for work, the server picks one task, and the pilot session
            hands it to one agent or does it directly.
          </Typography>
        )}
      </Box>
    </SectionCard>
  );
}
