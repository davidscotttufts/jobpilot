"use client";

import { useSearchParam } from "@/hooks/use-search-param";
import type { PipelineColumnFilters } from "./use-pipeline-column";

export interface PipelineFiltersValue {
  search: string | null;
  setSearch: (next: string | null) => void;
  board: string | null;
  setBoard: (next: string | null) => void;
  filters: PipelineColumnFilters;
  isAnyActive: boolean;
  clearAll: () => void;
}

export function usePipelineFilters(): PipelineFiltersValue {
  const [search, setSearch] = useSearchParam("search");
  const [board, setBoard] = useSearchParam("board");

  const filters: PipelineColumnFilters = { search, board };
  const isAnyActive = search !== null || board !== null;

  const clearAll = (): void => {
    setSearch(null);
    setBoard(null);
  };

  return {
    search,
    setSearch,
    board,
    setBoard,
    filters,
    isAnyActive,
    clearAll,
  };
}
