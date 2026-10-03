"use client";

import "@xyflow/react/dist/style.css";
import { type ReactElement, useEffect, useState } from "react";
import type { PilotState, TaskList } from "@jobpilot/contracts/pilot";
import { Box, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import {
  Background,
  BackgroundVariant,
  type BuiltInEdge,
  Position,
  ReactFlow,
  type XYPosition,
} from "@xyflow/react";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { SectionCard } from "@/components/ui/layout";
import type { PilotHealth } from "@/lib/terminal";
import {
  formatRelativeTime,
  formatTimeUntil,
  formatTokens,
  humanizeIsoInText,
} from "@/utils/format";
import type { TerminalHealth } from "../../agent-dock/use-terminal-health";
import { isHostOffline } from "../host-status";
import { AGENT_LABELS, type PilotAgent, taskTypeAgent, taskTypeLabel } from "../task-types";
import { type StageFlowNode, stageNodeTypes } from "./flow-nodes";
import { useTaskList } from "./task-list-preview";
import { useNextWake } from "./use-next-wake";

type BranchAgent = Exclude<PilotAgent, "session">;
type NodeId = "host" | "server" | "session" | BranchAgent | "journal";
type EdgeKind = "spine" | "fanOut" | "fanIn" | "text";
type Mode = "off" | "offline" | "working" | "sleeping";

interface Stage {
  id: NodeId;
  title: string;
  role: string;
  tone: StageFlowNode["data"]["tone"];
}

interface AgentStage extends Stage {
  id: BranchAgent;
}

const HOST: Stage = { id: "host", title: "Host", role: "Checks for work", tone: "blue" };
const SERVER: Stage = { id: "server", title: "Server", role: "Picks a task", tone: "peach" };
const SESSION: Stage = { id: "session", title: "Session", role: "Runs the task", tone: "violet" };
const JOURNAL: Stage = { id: "journal", title: "Journal", role: "Results", tone: "green" };

const AGENTS: AgentStage[] = [
  { id: "job-searcher", title: AGENT_LABELS["job-searcher"], role: "Finds jobs", tone: "amber" },
  { id: "job-scorer", title: AGENT_LABELS["job-scorer"], role: "Scores jobs", tone: "amber" },
  { id: "job-applier", title: AGENT_LABELS["job-applier"], role: "Applies", tone: "amber" },
  {
    id: "networking-worker",
    title: AGENT_LABELS["networking-worker"],
    role: "Reaches out",
    tone: "amber",
  },
];

interface Link {
  source: NodeId;
  target: NodeId;
  kind: EdgeKind;
  /** The agent whose run lights this edge; `session` is a text-only run. */
  agent: PilotAgent | null;
}

const LINKS: Link[] = [
  { source: "host", target: "server", kind: "spine", agent: null },
  { source: "server", target: "session", kind: "spine", agent: null },
  ...AGENTS.flatMap((agent): Link[] => [
    { source: "session", target: agent.id, kind: "fanOut", agent: agent.id },
    { source: agent.id, target: "journal", kind: "fanIn", agent: agent.id },
  ]),
  { source: "session", target: "journal", kind: "text", agent: "session" },
];

interface Layout {
  height: number;
  positions: Record<NodeId, XYPosition>;
  /** Source and target handle sides for each kind of edge. */
  sides: Record<EdgeKind, [Position, Position]>;
  /** How far the text-task edge runs out before turning, so it clears the agent column. */
  textOffset: number;
}

const WIDE_LAYOUT: Layout = {
  height: 420,
  positions: {
    host: { x: 0, y: 135 },
    server: { x: 185, y: 135 },
    session: { x: 370, y: 135 },
    "job-searcher": { x: 555, y: 0 },
    "job-scorer": { x: 555, y: 90 },
    "job-applier": { x: 555, y: 180 },
    "networking-worker": { x: 555, y: 270 },
    journal: { x: 740, y: 135 },
  },
  sides: {
    spine: [Position.Right, Position.Left],
    fanOut: [Position.Right, Position.Left],
    fanIn: [Position.Right, Position.Left],
    text: [Position.Bottom, Position.Bottom],
  },
  textOffset: 150,
};

/** Phone width: one column, agents indented so their edges run down either side. */
const NARROW_LAYOUT: Layout = {
  height: 900,
  positions: {
    host: { x: 0, y: 0 },
    server: { x: 0, y: 125 },
    session: { x: 0, y: 250 },
    "job-searcher": { x: 40, y: 365 },
    "job-scorer": { x: 40, y: 470 },
    "job-applier": { x: 40, y: 575 },
    "networking-worker": { x: 40, y: 680 },
    journal: { x: 0, y: 795 },
  },
  sides: {
    spine: [Position.Bottom, Position.Top],
    fanOut: [Position.Left, Position.Left],
    fanIn: [Position.Right, Position.Right],
    text: [Position.Left, Position.Left],
  },
  textOffset: 20,
};

const EMPTY_REASON_CAPTIONS: Record<NonNullable<TaskList["emptyReason"]>, string> = {
  capReached: "Daily cap reached",
  awaitingSetup: "Waiting for your goals",
  clear: "Nothing to do",
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
    return `Next: ${truncate(next.title)}`;
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
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("sm"));
  const journal = useApiQuery(pilotQueries.journal());
  const cost = useApiQuery(pilotQueries.cost());
  const nextWakeAt = useNextWake();
  const taskList = useTaskList();

  // ReactFlow measures the DOM, so the canvas must never render during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const layout = narrow ? NARROW_LAYOUT : WIDE_LAYOUT;
  const mode = pilotMode(state, health, pilot);
  const muted = mode === "off" || mode === "offline";
  const run = muted ? null : state.currentRun;
  const branch = run ? taskTypeAgent(run.taskType) : null;

  const weekTokens = new Map<PilotAgent, number>();
  for (const item of cost.data?.items ?? []) {
    const agent = taskTypeAgent(item.taskType);
    weekTokens.set(agent, (weekTokens.get(agent) ?? 0) + item.totalTokens);
  }

  const runStartMs = run ? run.startedAt.getTime() : null;
  const posted =
    journal.data?.items.find(
      (entry) =>
        entry.kind === "action" && runStartMs !== null && entry.createdAt.getTime() >= runStartMs,
    ) ?? null;
  const journalCaption = posted
    ? truncate(humanizeIsoInText(posted.summary))
    : `${state.appliedToday} / ${state.instructionsConfig.dailyApplyCap} applied today`;
  const sessionCaption = run
    ? `${taskTypeLabel(run.taskType)} · ${formatRelativeTime(run.startedAt)}`
    : "Idle";

  const toNode = (stage: Stage, caption: string, active: boolean, dim: boolean): StageFlowNode => ({
    id: stage.id,
    type: "stage",
    position: layout.positions[stage.id],
    data: { title: stage.title, role: stage.role, tone: stage.tone, caption, active, muted: dim },
    draggable: false,
    selectable: false,
  });

  const nodes: StageFlowNode[] = [
    toNode(HOST, hostCaption(mode, pilot, nextWakeAt), mode === "working" && !run, muted),
    toNode(SERVER, serverCaption(taskList.data), false, muted),
    toNode(SESSION, sessionCaption, run !== null, muted),
    ...AGENTS.map((agent) =>
      toNode(
        agent,
        `${formatTokens(weekTokens.get(agent.id) ?? 0)} tokens this week`,
        agent.id === branch,
        muted || agent.id !== branch,
      ),
    ),
    toNode(JOURNAL, journalCaption, false, muted),
  ];

  const flame = theme.palette.accent.primary;
  const dim = theme.palette.divider;
  const edges: BuiltInEdge[] = LINKS.map((link) => {
    const lit = link.agent !== null && link.agent === branch;
    const [sourceHandle, targetHandle] = layout.sides[link.kind];
    const text = link.kind === "text";
    return {
      id: `${link.source}-${link.target}`,
      source: link.source,
      target: link.target,
      sourceHandle,
      targetHandle,
      type: "smoothstep",
      animated: lit,
      // Branch edges share their first and last segments; the lit one draws on top.
      zIndex: lit ? 1 : 0,
      style: { stroke: lit ? flame : dim, strokeWidth: lit ? 2 : 1.5 },
      pathOptions: text ? { offset: layout.textOffset } : undefined,
      label: text ? "text tasks" : null,
      labelStyle: { fill: theme.palette.text.secondary },
      labelBgStyle: { fill: theme.palette.background.paper },
    };
  });

  let hint: string | null = null;
  if (mode === "off") {
    hint = "Enable the pilot to watch it run cycles.";
  } else if (mode === "offline") {
    hint = "Start the JobPilot agent so the pilot can run cycles.";
  }

  return (
    <SectionCard title="Orchestration" description="How the pilot works a cycle, live.">
      {mounted ? (
        <Box
          sx={{
            height: layout.height,
            width: "100%",
            // Strip the library's node/handle/attribution chrome so only our themed surfaces show.
            "& .react-flow__node": {
              background: "transparent",
              border: 0,
              padding: 0,
              fontFamily: "inherit",
            },
            "& .react-flow__handle": { opacity: 0 },
            "& .react-flow__attribution": { display: "none" },
          }}
        >
          <ReactFlow
            // Remount on a layout switch so fitView reframes the new shape.
            key={narrow ? "narrow" : "wide"}
            nodes={nodes}
            edges={edges}
            nodeTypes={stageNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.5}
            maxZoom={1.5}
            colorMode={theme.palette.mode}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={dim} />
          </ReactFlow>
        </Box>
      ) : (
        <Skeleton variant="rounded" height={layout.height} />
      )}
      <Box sx={{ mt: 1 }}>
        {hint ? (
          <Typography variant="body2Muted">{hint}</Typography>
        ) : (
          <Typography variant="captionMuted">
            Each cycle the host checks for work, the server picks one task, and the pilot session
            hands it to one agent or does text-only work itself.
          </Typography>
        )}
      </Box>
    </SectionCard>
  );
}
