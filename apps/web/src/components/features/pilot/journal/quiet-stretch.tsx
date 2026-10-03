"use client";

import type { ReactElement } from "react";
import type { PilotJournalEntry } from "@jobpilot/contracts/pilot";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { format } from "date-fns";
import { RelativeTime } from "@/components/ui/display";
import { plural } from "@/utils/format";
import { KIND_META } from "./journal-row";

interface QuietStretch {
  type: "quiet";
  entries: PilotJournalEntry[];
}

export type JournalItem = QuietStretch | { type: "entry"; entry: PilotJournalEntry };

/** Folds each run of adjacent empty cycles (an idle host writes up to 48 a day) into one item. */
export function groupQuietStretches(entries: PilotJournalEntry[]): JournalItem[] {
  const items: JournalItem[] = [];
  for (const entry of entries) {
    if (entry.kind !== "cycle" || entry.detail.status !== "empty") {
      items.push({ type: "entry", entry });
      continue;
    }
    const last = items.at(-1);
    if (last?.type === "quiet") {
      last.entries.push(entry);
    } else {
      items.push({ type: "quiet", entries: [entry] });
    }
  }
  return items;
}

interface QuietStretchRowProps {
  entries: PilotJournalEntry[];
}

/** Entries arrive newest first, like the feed. */
export function QuietStretchRow(props: QuietStretchRowProps): ReactElement {
  const { entries } = props;
  const meta = KIND_META.cycle;
  const Icon = meta.icon;
  const newest = entries[0];
  const oldest = entries[entries.length - 1];
  const end = format(newest.createdAt, "HH:mm");
  const span = entries.length === 1 ? end : `${format(oldest.createdAt, "HH:mm")}-${end}`;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <Chip
        size="small"
        color={meta.color}
        icon={<Icon fontSize="sm" />}
        label={meta.label}
        sx={{ minWidth: 110 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2Muted">
          Quiet {span}, {plural(entries.length, "check")}
        </Typography>
      </Box>
      <RelativeTime value={newest.createdAt} sx={{ whiteSpace: "nowrap" }} />
    </Stack>
  );
}
