"use client";

import type { ReactElement, ReactNode } from "react";
import { EastRounded } from "@mui/icons-material";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { PulseDot, type PulseDotTone } from "@/components/ui/feedback";
import { formatTokens } from "@/utils/format";
import { AGENT_LABELS, type PilotAgent, taskTypeAgent } from "../task-types";

export interface Stage {
  title: string;
  role: string;
  tone: PulseDotTone;
}

/** Required record, so a new agent fails typecheck instead of silently missing from the list. */
const AGENT_ROLES: Record<PilotAgent, string> = {
  "job-searcher": "Finds jobs",
  "job-scorer": "Scores jobs",
  "job-applier": "Applies to jobs",
  "networking-worker": "Reaches out",
  session: "Inbox, messages, posts",
};

const AGENTS = Object.keys(AGENT_ROLES) as PilotAgent[];

const DIM_OPACITY = 0.5;

interface StageCardProps {
  stage: Stage;
  caption: string;
  active?: boolean;
  muted: boolean;
  grow?: number;
  children?: ReactNode;
}

export function StageCard(props: StageCardProps): ReactElement {
  const { stage, caption, active = false, muted, grow = 1, children } = props;

  return (
    <Card
      variant={active ? "accent" : undefined}
      sx={{ flex: { md: `${grow} 1 0` }, minWidth: 0, opacity: muted ? DIM_OPACITY : 1 }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <PulseDot tone={muted ? "muted" : stage.tone} size="sm" pulsing={active} />
          <Typography variant="body1Strong">{stage.title}</Typography>
        </Stack>
        <Typography variant="overlineMuted" sx={{ display: "block", ml: 2 }}>
          {stage.role}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.75,
            ml: 2,
            color: active ? "text.primary" : "text.secondary",
          }}
        >
          {caption}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

interface AgentListProps {
  branch: PilotAgent | null;
}

export function AgentList(props: AgentListProps): ReactElement {
  const { branch } = props;
  const cost = useApiQuery(pilotQueries.cost());

  const weekTokens = new Map<PilotAgent, number>();
  for (const item of cost.data?.items ?? []) {
    const agent = taskTypeAgent(item.taskType);
    weekTokens.set(agent, (weekTokens.get(agent) ?? 0) + item.totalTokens);
  }

  return (
    <Box sx={{ mt: 1.5, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", px: 1, mb: 0.5 }}>
        <Typography variant="overlineMuted">Done by</Typography>
        <Typography variant="overlineMuted">Tokens this week</Typography>
      </Stack>
      <Stack spacing={0.25}>
        {AGENTS.map((agent) => {
          const active = agent === branch;
          const dim = branch !== null && !active;
          return (
            <Stack
              key={agent}
              direction="row"
              spacing={1}
              sx={(theme) => ({
                alignItems: "center",
                px: 1,
                py: 0.5,
                borderRadius: theme.radii.xs,
                backgroundColor: active ? theme.tints.selected : "transparent",
                opacity: dim ? DIM_OPACITY : 1,
              })}
            >
              <PulseDot tone={active ? "amber" : "muted"} size="xs" pulsing={active} />
              <Typography variant={active ? "body2Strong" : "body2"} sx={{ flexShrink: 0 }}>
                {AGENT_LABELS[agent]}
              </Typography>
              <Typography variant="captionMuted" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {AGENT_ROLES[agent]}
              </Typography>
              <Typography variant="captionMuted" sx={{ flexShrink: 0 }}>
                {formatTokens(weekTokens.get(agent) ?? 0)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

interface StageArrowProps {
  lit: boolean;
}

export function StageArrow(props: StageArrowProps): ReactElement {
  const { lit } = props;
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        px: { md: 0.5 },
        py: { xs: 0.5, md: 0 },
        color: lit ? theme.palette.accent.primary : "text.disabled",
        transition: theme.transitions.create("color"),
      })}
    >
      <EastRounded fontSize="small" sx={{ transform: { xs: "rotate(90deg)", md: "none" } }} />
    </Box>
  );
}
