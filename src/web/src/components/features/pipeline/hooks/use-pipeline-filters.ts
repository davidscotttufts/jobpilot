"use client";

import { useSearchParam } from "@/hooks/use-search-param";
import type { PipelineColumnFilters } from "./use-pipeline-column";

export interface PipelineFiltersValue {
  search: string | null;
  setSearch: (next: string | null) => void;
  board: string | null;
  setBoard: (next: string | null) => void;
  /** Selected run scoping the board, or null for the whole pipeline. */
  runId: string | null;
  setRunId: (next: string | null) => void;
  filters: PipelineColumnFilters;
  isAnyActive: boolean;
  clearAll: () => void;
}

export function usePipelineFilters(): PipelineFiltersValue {
  const [search, setSearch] = useSearchParam("search");
  const [board, setBoard] = useSearchParam("board");
  const [runId, setRunId] = useSearchParam("runId");

  const filters: PipelineColumnFilters = { search, board, runId };
  const isAnyActive = search !== null || board !== null || runId !== null;

  const clearAll = (): void => {
    setSearch(null);
    setBoard(null);
    setRunId(null);
  };

  return {
    search,
    setSearch,
    board,
    setBoard,
    runId,
    setRunId,
    filters,
    isAnyActive,
    clearAll,
  };
}
