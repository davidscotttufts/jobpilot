"use client";

import { type ReactElement, useState } from "react";
import { Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { api } from "@/api/client";
import type { LeaderboardRow, LeaderboardWindow } from "@/api/types";
import { EmptyState } from "@/components/ui/data";
import { LeaderboardList } from "./leaderboard-list";
import { LeaderboardPodium } from "./leaderboard-podium";

interface LeaderboardViewProps {
  initialRows: LeaderboardRow[];
  initialWindow: LeaderboardWindow;
}

const WINDOWS: { value: LeaderboardWindow; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

export function LeaderboardView(props: LeaderboardViewProps): ReactElement {
  const [window, setWindow] = useState<LeaderboardWindow>(props.initialWindow);
  const [rows, setRows] = useState<LeaderboardRow[]>(props.initialRows);
  const [loading, setLoading] = useState(false);

  const changeWindow = async (next: LeaderboardWindow): Promise<void> => {
    setWindow(next);
    setLoading(true);
    const { data } = await api.public.portfolio.leaderboard.get({ query: { window: next } });
    setRows(data?.rows ?? []);
    setLoading(false);
  };

  return (
    <Stack spacing={3}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={window}
        onChange={(_, next: LeaderboardWindow | null) => {
          if (next) void changeWindow(next);
        }}
        sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
      >
        {WINDOWS.map((w) => (
          <ToggleButton key={w.value} value={w.value} sx={{ flex: { xs: 1, sm: "none" } }}>
            {w.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {rows.length === 0 ? (
        <EmptyState
          title={loading ? "Loading" : "No trending users yet"}
          description={
            loading
              ? "Fetching the leaderboard…"
              : "Once people publish their portfolios and start applying, they'll show up here."
          }
        />
      ) : (
        <Stack spacing={3} sx={{ opacity: loading ? 0.5 : 1, transition: "opacity 120ms" }}>
          <LeaderboardPodium rows={rows} />
          {rows.length > 3 && <LeaderboardList rows={rows.slice(3)} />}
        </Stack>
      )}
    </Stack>
  );
}
