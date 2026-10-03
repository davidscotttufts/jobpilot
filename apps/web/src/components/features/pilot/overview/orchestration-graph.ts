import { Position, type XYPosition } from "@xyflow/react";
import { AGENT_LABELS, type PilotAgent } from "../task-types";
import type { StageFlowNode } from "./flow-nodes";

type BranchAgent = Exclude<PilotAgent, "session">;
type NodeId = "host" | "server" | "session" | BranchAgent | "journal";
type EdgeRoute = "spine" | "fanOut" | "fanIn" | "text";

export interface Stage {
  id: NodeId;
  title: string;
  role: string;
  tone: StageFlowNode["data"]["tone"];
}

interface AgentStage extends Stage {
  id: BranchAgent;
}

export const HOST: Stage = { id: "host", title: "Host", role: "Checks for work", tone: "blue" };
export const SERVER: Stage = { id: "server", title: "Server", role: "Picks a task", tone: "peach" };
export const SESSION: Stage = {
  id: "session",
  title: "Session",
  role: "Runs the task",
  tone: "violet",
};
export const JOURNAL: Stage = { id: "journal", title: "Journal", role: "Results", tone: "green" };

export const AGENTS: AgentStage[] = [
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
  route: EdgeRoute;
  /** The agent whose run lights this edge; `session` is a text-only run. */
  agent: PilotAgent | null;
}

export const LINKS: Link[] = [
  { source: "host", target: "server", route: "spine", agent: null },
  { source: "server", target: "session", route: "spine", agent: null },
  ...AGENTS.flatMap((agent): Link[] => [
    { source: "session", target: agent.id, route: "fanOut", agent: agent.id },
    { source: agent.id, target: "journal", route: "fanIn", agent: agent.id },
  ]),
  { source: "session", target: "journal", route: "text", agent: "session" },
];

interface Layout {
  height: number;
  positions: Record<NodeId, XYPosition>;
  sides: Record<EdgeRoute, [Position, Position]>;
  /** How far the text-task edge runs out before turning, so it clears the agent column. */
  textOffset: number;
}

export const WIDE_LAYOUT: Layout = {
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
export const NARROW_LAYOUT: Layout = {
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
