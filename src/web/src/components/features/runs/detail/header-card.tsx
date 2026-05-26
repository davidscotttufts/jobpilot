"use client";

import type { ReactElement } from "react";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { RunDetailDto } from "@/types/api";
import { formatRelativeTime } from "@/utils/format";
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL } from "../run-status";
import { RunActionsBar } from "./actions-bar";
import { RunIdentityBanner } from "./identity-banner";

interface RunHeaderCardProps {
  run: RunDetailDto;
}

/** Consolidated run header: status, query, config + identity, and actions in one card. */
export function RunHeaderCard(props: RunHeaderCardProps): ReactElement {
  const { run } = props;
  const cfg = run.config;
  const isAutoApply = run.source === "auto-apply";

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "flex-start" }, justifyContent: "space-between" }}
        >
          <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
            >
              <Chip
                size="small"
                label={RUN_STATUS_LABEL[run.status]}
                color={RUN_STATUS_COLOR[run.status]}
                variant="outlined"
              />
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}
              >
                {run.query}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
            >
              <Typography variant="body2Muted">
                {run.source} · Started {formatRelativeTime(run.startedAt)} ago
              </Typography>
              {cfg.board && <Chip size="small" label={`Board: ${cfg.board}`} variant="outlined" />}
              {!isAutoApply && typeof cfg.maxJobs === "number" && (
                <Chip size="small" label={`Jobs: ${cfg.maxJobs}`} variant="outlined" />
              )}
              {isAutoApply && typeof cfg.minScore === "number" && (
                <Chip size="small" label={`Min score: ${cfg.minScore}`} variant="outlined" />
              )}
              {isAutoApply && (
                <Chip
                  size="small"
                  label={`Max apps: ${cfg.maxApplications ?? "∞"}`}
                  variant="outlined"
                />
              )}
            </Stack>

            <RunIdentityBanner />

            {run.status === "paused" && (
              <Typography variant="captionMuted">Paused — resume to continue.</Typography>
            )}
          </Stack>

          <RunActionsBar run={run} />
        </Stack>
      </CardContent>
    </Card>
  );
}
