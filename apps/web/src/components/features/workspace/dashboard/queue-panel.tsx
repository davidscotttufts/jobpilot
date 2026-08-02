"use client";

import type { ReactElement } from "react";
import { Add, Delete, MoreVert, PlayArrow } from "@mui/icons-material";
import { Box, Button, Card, CardContent, IconButton, Stack, Typography } from "@mui/material";
import { api } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { queueQueries } from "@/api/queries";
import { invalidations } from "@/api/query-keys";
import type { QueueEntryDto } from "@/api/types";
import { AgentOnlyButton } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/data";
import { DropdownMenu, type DropdownMenuItem } from "@/components/ui/feedback";
import { SectionCard } from "@/components/ui/layout";
import { useAgent } from "@/providers/agent-provider";
import { formatRelativeTime } from "@/utils/format";
import { useWorkspaceActions } from "../actions-provider";

const QUEUE_FILTER = { status: "pending" } as const;

/** Strip the protocol for a compact, readable URL label. */
function urlLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** First-class queue of single-apply URLs - replaces the old dead "queued" column. */
export function QueuePanel(): ReactElement {
  const agent = useAgent();
  const { openAddUrls } = useWorkspaceActions();

  const queue = useApiQuery(queueQueries.list(QUEUE_FILTER));
  const entries = queue.data ?? [];

  return (
    <SectionCard
      title={entries.length ? `Queue (${entries.length})` : "Queue"}
      description="Jobs you found yourself. Paste a link and the agent applies to that one job."
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Add fontSize="md" />}
            onClick={openAddUrls}
          >
            Add URLs
          </Button>
          <AgentOnlyButton
            size="small"
            variant="contained"
            startIcon={<PlayArrow fontSize="md" />}
            disabled={entries.length === 0}
            onClick={() => void agent.injectSkill("apply")}
          >
            Apply all
          </AgentOnlyButton>
        </Stack>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          variant="inline"
          title="Nothing queued"
          description="Press Add URLs and paste a link to a job posting. The agent reviews the fit, tailors your resume, and applies. To have it find the jobs instead, use a campaign below."
        />
      ) : (
        <Stack spacing={1}>
          {entries.map((entry) => (
            <QueueRow key={entry.id} entry={entry} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function QueueRow(props: { entry: QueueEntryDto }): ReactElement {
  const { entry } = props;
  const agent = useAgent();

  const remove = useApiMutation<unknown, void>(() => api.queue({ id: entry.id }).delete(), {
    successMessage: "Removed from queue",
    invalidate: invalidations.queue,
  });

  const items: DropdownMenuItem[] = [
    {
      kind: "item",
      key: "open",
      label: "Open URL in new tab",
      onClick: () => window.open(entry.url, "_blank", "noopener,noreferrer"),
    },
    { kind: "divider", key: "d" },
    {
      kind: "item",
      key: "remove",
      label: "Remove",
      icon: <Delete fontSize="sm" color="error" />,
      danger: true,
      disabled: remove.isPending,
      onClick: () => remove.mutate(),
    },
  ];

  return (
    <Card>
      <CardContent
        sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, "&:last-child": { pb: 1 } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            {urlLabel(entry.url)}
          </Typography>
          <Typography variant="captionMuted" noWrap>
            {entry.note ? `${entry.note} · ` : ""}
            {formatRelativeTime(entry.createdAt)}
          </Typography>
        </Box>
        <AgentOnlyButton
          size="small"
          variant="text"
          startIcon={<PlayArrow fontSize="sm" />}
          onClick={() => void agent.injectSkill("apply", entry.url)}
        >
          Apply
        </AgentOnlyButton>
        <DropdownMenu
          stopPropagation
          items={items}
          trigger={({ onOpen }) => (
            <IconButton size="small" aria-label="Queue entry actions" onClick={onOpen}>
              <MoreVert fontSize="sm" />
            </IconButton>
          )}
        />
      </CardContent>
    </Card>
  );
}
