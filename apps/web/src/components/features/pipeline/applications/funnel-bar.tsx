"use client";

import type { ReactElement } from "react";
import { Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import { PulseDot, type PulseDotTone } from "@/components/ui/feedback";

/** Active interview-stage buckets the raw application stages roll up into. */
export const FUNNEL_GROUPS = [
  { key: "applied", label: "Applied", tone: "blue", stages: ["applied"] },
  {
    key: "screening",
    label: "Screening",
    tone: "violet",
    stages: ["recruiter_screen", "assessment", "hiring_manager_screen"],
  },
  {
    key: "interview",
    label: "Interview",
    tone: "peach",
    stages: ["technical_interview", "onsite"],
  },
  { key: "offer", label: "Offer", tone: "green", stages: ["offer"] },
] as const;

export type FunnelKey = (typeof FUNNEL_GROUPS)[number]["key"];

const STAGE_TO_GROUP = new Map<string, FunnelKey>(
  FUNNEL_GROUPS.flatMap((g) => g.stages.map((s) => [s, g.key] as const)),
);

/** Returns the funnel bucket for a stage, or null for closed-out stages (rejected/withdrawn). */
export function groupForStage(stage: string): FunnelKey | null {
  return STAGE_TO_GROUP.get(stage) ?? null;
}

/** Stages past the initial "applied" bucket — i.e. an application that's interviewing. */
export const INTERVIEW_STAGES: ReadonlySet<string> = new Set(
  FUNNEL_GROUPS.filter((g) => g.key !== "applied").flatMap((g) => g.stages),
);

interface FunnelBarProps {
  counts: Record<FunnelKey, number>;
  selected: FunnelKey | null;
  onSelect: (key: FunnelKey | null) => void;
}

export function FunnelBar(props: FunnelBarProps): ReactElement {
  const { counts, selected, onSelect } = props;

  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
      {FUNNEL_GROUPS.map((group) => {
        const active = selected === group.key;
        const toggle = (): void => onSelect(active ? null : group.key);
        return (
          <Card key={group.key} variant="interactive" sx={{ flex: 1, minWidth: 120 }}>
            <CardContent aria-pressed={active} onClick={toggle}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <PulseDot tone={group.tone as PulseDotTone} />
                <Typography variant="captionMuted">{group.label}</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 0.5 }}>
                {counts[group.key]}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
