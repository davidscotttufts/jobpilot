"use client";

import type { ReactElement } from "react";
import { OpenInNew } from "@mui/icons-material";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { RunDto } from "@/types/api";
import { formatRelativeTime } from "@/utils/format";
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL } from "./run-status";

interface RunRowProps {
  run: RunDto;
  /** Highlights the row as the active board scope. */
  selected?: boolean;
  /** Primary click — e.g. scope the board to this run. */
  onSelect: (run: RunDto) => void;
  /** Secondary affordance — open the full run detail. */
  onOpenDetail?: (run: RunDto) => void;
}

export function RunRow(props: RunRowProps): ReactElement {
  const { run, selected = false, onSelect, onOpenDetail } = props;
  const s = run.summary;

  return (
    <Card
      variant="interactive"
      sx={(theme) => ({
        position: "relative",
        ...(selected && {
          borderColor: theme.palette.accent.primary,
          backgroundColor: theme.palette.action.selected,
        }),
      })}
    >
      <CardActionArea
        aria-pressed={selected}
        onClick={() => onSelect(run)}
        sx={{ padding: 1.25, paddingRight: onOpenDetail ? 4.5 : 1.25 }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Chip
              size="small"
              label={RUN_STATUS_LABEL[run.status]}
              color={RUN_STATUS_COLOR[run.status]}
              variant="outlined"
            />
            <Chip size="small" label={run.source} variant="outlined" />
            <Box sx={{ flex: 1 }} />
            <Typography variant="captionMuted" noWrap>
              {formatRelativeTime(run.startedAt)}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {run.query}
          </Typography>
          <Typography variant="captionMuted">
            {s.applied} applied · {s.failed} failed · {s.skipped} skipped
          </Typography>
        </Stack>
      </CardActionArea>
      {onOpenDetail && (
        <Box
          sx={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="Open run details" enterDelay={400}>
            <IconButton
              size="small"
              aria-label="Open run details"
              onClick={() => onOpenDetail(run)}
            >
              <OpenInNew fontSize="sm" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Card>
  );
}
