"use client";

import { useState, type ReactElement } from "react";
import { Delete, OpenInNew, Replay, SkipNext } from "@mui/icons-material";
import {
  Box,
  Chip,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { ConfirmDialog } from "@/components/ui/feedback/confirm-dialog";
import { SelectFilter } from "@/components/ui/form/select-filter";
import { FilterBar } from "@/components/ui/layout/filter-bar";
import { SectionCard } from "@/components/ui/layout/section-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import { BATCH_STATUSES, type BatchStatus } from "@/lib/schemas/batch";
import type { BatchInputDto } from "@/types/api";

const STATUS_LABEL: Record<BatchStatus, string> = {
  pending: "Pending",
  consumed: "Consumed",
  skipped: "Skipped",
};

const STATUS_COLOR: Record<BatchStatus, "default" | "info" | "success"> = {
  pending: "info",
  consumed: "success",
  skipped: "default",
};

const STATUS_OPTIONS = BATCH_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

interface PatchPayload {
  id: number;
  status: BatchStatus;
}

export function BatchContent(): ReactElement {
  const [status, setStatus] = useState<BatchStatus | undefined>("pending");
  const [pendingDelete, setPendingDelete] = useState<BatchInputDto | null>(null);

  const filters = { status: status ?? "all" };
  const queryString = status ? `?status=${status}` : "";

  const items = useApiQuery<BatchInputDto[]>(queryKeys.batch.list(filters), () =>
    apiClient.get<BatchInputDto[]>(`/api/batch${queryString}`),
  );

  const patch = useApiMutation<BatchInputDto, PatchPayload>(
    ({ id, status: next }) => apiClient.patch<BatchInputDto>(`/api/batch/${id}`, { status: next }),
    {
      successMessage: "Updated",
      invalidate: [queryKeys.batch.all],
    },
  );

  const remove = useApiMutation<{ deleted: number }, number>(
    (id) => apiClient.del<{ deleted: number }>(`/api/batch/${id}`),
    {
      successMessage: "Removed",
      invalidate: [queryKeys.batch.all],
      onSuccess: () => setPendingDelete(null),
    },
  );

  const rows = items.data ?? [];

  return (
    <>
      <FilterBar>
        <SelectFilter<BatchStatus>
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          emptyLabel="All"
          onChange={setStatus}
        />
      </FilterBar>

      <SectionCard>
        {items.isLoading ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography variant="body2Muted">Loading…</Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography variant="body2Muted">
              No {status ? STATUS_LABEL[status].toLowerCase() : ""} URLs.
              {status === "pending" && " Click \"Add URLs\" to queue some up."}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {rows.map((row) => (
              <Stack
                key={row.id}
                direction="row"
                spacing={2}
                sx={(t) => ({
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: t.radii.sm,
                  border: `1px solid ${t.palette.line.divider}`,
                  opacity: row.status === "pending" ? 1 : 0.7,
                })}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Chip
                      size="small"
                      label={STATUS_LABEL[row.status]}
                      color={STATUS_COLOR[row.status]}
                      variant="outlined"
                    />
                    <Link
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.url}
                    </Link>
                    <OpenInNew sx={{ fontSize: 14, opacity: 0.6 }} />
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 0.25 }}>
                    <Typography variant="captionMuted">
                      Added {new Date(row.createdAt).toLocaleString()}
                    </Typography>
                    {row.consumedAt && (
                      <Typography variant="captionMuted">
                        · {row.status === "consumed" ? "Applied" : "Closed"}{" "}
                        {new Date(row.consumedAt).toLocaleString()}
                      </Typography>
                    )}
                    {row.note && (
                      <Typography variant="captionMuted" sx={{ fontStyle: "italic" }}>
                        · {row.note}
                      </Typography>
                    )}
                  </Stack>
                </Box>
                {row.status !== "pending" && (
                  <Tooltip title="Requeue as pending">
                    <IconButton
                      onClick={() => patch.mutate({ id: row.id, status: "pending" })}
                      aria-label="Requeue"
                    >
                      <Replay fontSize="md" />
                    </IconButton>
                  </Tooltip>
                )}
                {row.status === "pending" && (
                  <Tooltip title="Skip">
                    <IconButton
                      onClick={() => patch.mutate({ id: row.id, status: "skipped" })}
                      aria-label="Skip"
                    >
                      <SkipNext fontSize="md" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Delete">
                  <IconButton onClick={() => setPendingDelete(row)} aria-label="Delete">
                    <Delete fontSize="md" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete batch entry?"
        message={
          pendingDelete
            ? `Remove "${pendingDelete.url}" from the queue? This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
