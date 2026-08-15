"use client";

import { type ReactElement, useState } from "react";
import { upworkChannel } from "@jobpilot/contracts/sse";
import type { UpworkProposalStatus } from "@jobpilot/contracts/upwork";
import { ChevronRight, Clear } from "@mui/icons-material";
import { Box, Button, Card, CardActionArea, Chip, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/api/hooks";
import { upworkProposalQueries } from "@/api/queries";
import { queryKeys } from "@/api/query-keys";
import { EmptyState, PaginationFooter, QuerySection } from "@/components/ui/data";
import { SelectField } from "@/components/ui/form";
import { SectionCard } from "@/components/ui/layout";
import { usePaginationParams } from "@/hooks/use-pagination";
import { useSseChannel } from "@/lib/sse/client";
import { formatRelativeTime, plural } from "@/utils/format";
import { STATUS_OPTIONS } from "./proposal-status";
import { ProposalStatusChip } from "./proposal-status-chip";

const PAGE_SIZE = 10;

export function ProposalsList(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<UpworkProposalStatus | null>(null);
  const { query, setPage, setPageSize } = usePaginationParams({ pageSize: PAGE_SIZE });

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.upworkProposals.all });
  };
  useSseChannel(upworkChannel, null, {
    on: {
      "proposal.created": invalidate,
      "proposal.updated": invalidate,
      "proposal.deleted": invalidate,
    },
  });

  // The section states the failure itself, so the toast would be the same news twice.
  const proposals = useApiQuery(
    upworkProposalQueries.list({ ...query, ...(statusFilter && { status: statusFilter }) }),
    { errorMessage: null },
  );

  const pageRows = proposals.data?.items ?? [];
  const total = proposals.data?.pagination.total ?? 0;
  const hasFilters = statusFilter !== null;

  const handleNavigate = (id: string): void => {
    router.push(`/upwork/${id}` as Route);
  };

  return (
    <SectionCard>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "stretch", md: "center" }, mb: 2 }}
      >
        <SelectField
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />
        {hasFilters && (
          <Button
            size="small"
            variant="text"
            startIcon={<Clear fontSize="sm" />}
            onClick={() => {
              setStatusFilter(null);
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {/* Live over SSE like the campaign job count - announce the total, not every row. */}
        <Typography variant="captionMuted" role="status" aria-live="polite">
          {plural(total, "proposal")}
        </Typography>
      </Stack>

      <QuerySection
        isLoading={proposals.isLoading}
        isError={proposals.isError}
        onRetry={() => void proposals.refetch()}
        errorTitle="Couldn't load your proposals."
        isEmpty={pageRows.length === 0}
        empty={
          <EmptyState
            variant="inline"
            title={
              hasFilters
                ? "No proposals match the current filter."
                : "No proposals yet. Start one from “New proposal”."
            }
          />
        }
      >
        <Stack spacing={1}>
          {pageRows.map((p) => (
            <Card key={p.id} variant="interactive">
              <CardActionArea onClick={() => handleNavigate(p.id)} sx={{ padding: 1.5 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", flexWrap: "wrap" }}
                    >
                      <ProposalStatusChip status={p.status} />
                      {p.clientName && (
                        <Chip size="small" label={p.clientName} variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="body2Strong" noWrap>
                      {p.jobTitle}
                    </Typography>
                    <Typography variant="captionMuted">
                      Updated {formatRelativeTime(p.updatedAt)}
                      {p.proposalText ? "" : " · not generated yet"}
                    </Typography>
                  </Stack>
                  <ChevronRight fontSize="md" />
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </QuerySection>

      {proposals.data && (
        <PaginationFooter
          pagination={proposals.data.pagination}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </SectionCard>
  );
}
