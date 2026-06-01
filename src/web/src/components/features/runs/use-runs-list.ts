"use client";

import { useState } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { usePagination, type Pagination } from "@/hooks/use-pagination";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import type { RunSource, RunStatus } from "@/lib/contracts/run";
import type { RunDto } from "@/types/api";

export interface UseRunsListResult {
  statusFilter: RunStatus | null;
  setStatusFilter: (next: RunStatus | null) => void;
  sourceFilter: RunSource | null;
  setSourceFilter: (next: RunSource | null) => void;
  hasFilters: boolean;
  resetFilters: () => void;
  allRows: RunDto[];
  filteredRows: RunDto[];
  interruptedCount: number;
  isLoading: boolean;
  pagination: Pagination<RunDto>;
}

/**
 * Runs list state: status/source filtering over the cached runs query, the
 * interrupted-run count, and client-side pagination. Consumed by the pipeline
 * Runs rail. SSE invalidation lives with the page-level subscription, not here.
 */
export function useRunsList(pageSize: number): UseRunsListResult {
  const [statusFilter, setStatusFilterState] = useState<RunStatus | null>(null);
  const [sourceFilter, setSourceFilterState] = useState<RunSource | null>(null);

  const runs = useApiQuery<RunDto[]>(queryKeys.runs.list(), () =>
    apiClient.get<RunDto[]>("/api/runs"),
  );

  const allRows = runs.data ?? [];
  const interruptedCount = allRows.filter((r) => r.status === "interrupted").length;

  const filteredRows = allRows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) {
      return false;
    }
    if (sourceFilter && r.source !== sourceFilter) {
      return false;
    }
    return true;
  });

  const pagination = usePagination(filteredRows, pageSize);

  const setStatusFilter = (next: RunStatus | null): void => {
    setStatusFilterState(next);
    pagination.setPage(1);
  };

  const setSourceFilter = (next: RunSource | null): void => {
    setSourceFilterState(next);
    pagination.setPage(1);
  };

  const resetFilters = (): void => {
    setStatusFilterState(null);
    setSourceFilterState(null);
    pagination.setPage(1);
  };

  return {
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    hasFilters: statusFilter !== null || sourceFilter !== null,
    resetFilters,
    allRows,
    filteredRows,
    interruptedCount,
    isLoading: runs.isLoading,
    pagination,
  };
}
