"use client";

import { useState, type ReactElement } from "react";
import { Clear, Delete, Edit, Search } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ConfirmDialog } from "@/components/ui/feedback/confirm-dialog";
import { SelectField, type SelectFieldOption } from "@/components/ui/form";
import { SectionCard } from "@/components/ui/layout/";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { JobBoardPatch } from "@/lib/schemas/job-board";
import type { JobBoardDto } from "@/types/api";
import { BoardFormDialog } from "./board-form-dialog";

type TypeFilter = "search" | "ats";
type StatusFilter = "enabled" | "disabled";

const TYPE_OPTIONS: ReadonlyArray<SelectFieldOption<TypeFilter>> = [
  { value: "search", label: "Search" },
  { value: "ats", label: "ATS" },
];

const STATUS_OPTIONS: ReadonlyArray<SelectFieldOption<StatusFilter>> = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 200;

export function BoardsContent(): ReactElement {
  const [editing, setEditing] = useState<JobBoardDto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JobBoardDto | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null);
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);

  const boards = useApiQuery<JobBoardDto[]>(queryKeys.jobBoards.list(), () =>
    apiClient.get<JobBoardDto[]>("/api/job-boards"),
  );

  const update = useApiMutation<JobBoardDto, { id: number; patch: JobBoardPatch }>(
    ({ id, patch }) => apiClient.patch<JobBoardDto>(`/api/job-boards/${id}`, patch),
    {
      successMessage: "Board updated",
      invalidate: [queryKeys.jobBoards.all],
      onSuccess: () => setEditing(null),
    },
  );

  const remove = useApiMutation<{ deleted: number }, number>(
    (id) => apiClient.del<{ deleted: number }>(`/api/job-boards/${id}`),
    {
      successMessage: "Board removed",
      invalidate: [queryKeys.jobBoards.all],
      onSuccess: () => setPendingDelete(null),
    },
  );

  const allRows = boards.data ?? [];
  const needle = search.trim().toLowerCase();

  const filteredRows = allRows.filter((b) => {
    if (typeFilter && b.type !== typeFilter) return false;
    if (statusFilter === "enabled" && !b.enabled) return false;
    if (statusFilter === "disabled" && b.enabled) return false;
    if (
      needle &&
      !b.name.toLowerCase().includes(needle) &&
      !b.domain.toLowerCase().includes(needle)
    ) {
      return false;
    }

    return true;
  });

  const isAnyFilterActive = needle.length > 0 || typeFilter !== null || statusFilter !== null;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleResetFilters = (): void => {
    setSearchDraft("");
    setTypeFilter(null);
    setStatusFilter(null);
    setPage(1);
  };

  return (
    <>
      <SectionCard>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", md: "center" }, mb: 2 }}
        >
          <TextField
            size="small"
            placeholder="Search name or domain"
            value={searchDraft}
            onChange={(e) => {
              setSearchDraft(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="sm" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <SelectField
            label="Type"
            value={typeFilter}
            options={TYPE_OPTIONS}
            emptyLabel="All types"
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
          />
          <SelectField
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          />
          {isAnyFilterActive && (
            <Button
              size="small"
              variant="text"
              startIcon={<Clear fontSize="sm" />}
              onClick={handleResetFilters}
            >
              Clear
            </Button>
          )}
        </Stack>

        {allRows.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography variant="body2Muted">
              No boards yet. Run <code>bun db:setup</code> to seed defaults.
            </Typography>
          </Box>
        ) : filteredRows.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography variant="body2Muted">No boards match the current filters.</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {pageRows.map((b) => (
              <Stack
                key={b.id}
                direction="row"
                spacing={2}
                sx={(t) => ({
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: t.radii.sm,
                  border: `1px solid ${t.palette.line.divider}`,
                  opacity: b.enabled ? 1 : 0.55,
                })}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {b.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={b.type}
                      color={b.type === "ats" ? "primary" : "default"}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="captionMuted">{b.domain}</Typography>
                </Box>
                <Switch
                  checked={b.enabled}
                  onChange={(e) =>
                    update.mutate({ id: b.id, patch: { enabled: e.target.checked } })
                  }
                />
                <IconButton onClick={() => setEditing(b)} aria-label="Edit board">
                  <Edit fontSize="md" />
                </IconButton>
                <IconButton onClick={() => setPendingDelete(b)} aria-label="Delete board">
                  <Delete fontSize="md" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}

        {filteredRows.length > PAGE_SIZE && (
          <Stack
            direction="row"
            sx={{ mt: 2, alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="captionMuted">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
            </Typography>
            <Pagination
              size="small"
              count={pageCount}
              page={safePage}
              onChange={(_, p) => setPage(p)}
            />
          </Stack>
        )}
      </SectionCard>

      <BoardFormDialog
        key={editing?.id ?? "new"}
        open={editing !== null}
        initial={
          editing
            ? {
                name: editing.name,
                domain: editing.domain,
                searchUrl: editing.searchUrl ?? "",
                type: editing.type,
                enabled: editing.enabled,
                email: editing.email ?? "",
                password: editing.password ?? "",
                sortOrder: editing.sortOrder,
              }
            : null
        }
        title="Edit job board"
        onClose={() => setEditing(null)}
        onSubmit={(values) => editing && update.mutate({ id: editing.id, patch: values })}
        submitting={update.isPending}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete board?"
        description={
          pendingDelete
            ? `Remove "${pendingDelete.name}"? Skills won't search this board until you add it back.`
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
