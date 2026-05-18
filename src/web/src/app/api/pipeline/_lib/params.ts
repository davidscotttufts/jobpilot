import { parseQueryParams } from "@/lib/api/request";
import { PIPELINE_STAGES, type PipelineStage } from "@/types/api/pipeline";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface PipelineFilters {
  search?: string | null;
  board?: string | null;
}

export interface PipelineQuery {
  stage: PipelineStage;
  cursor: number | null;
  limit: number;
  filters: PipelineFilters;
}

export function parsePipelineQuery(req: Request): PipelineQuery | null {
  const raw = parseQueryParams(req, ["stage", "cursor", "limit", "search", "board"] as const);

  if (!isPipelineStage(raw.stage)) {
    return null;
  }

  return {
    stage: raw.stage,
    cursor: parseCursor(raw.cursor),
    limit: parseLimit(raw.limit),
    filters: {
      search: trimToUndefined(raw.search),
      board: trimToUndefined(raw.board),
    },
  };
}

function isPipelineStage(value: string | null): value is PipelineStage {
  return value !== null && (PIPELINE_STAGES as readonly string[]).includes(value);
}

function parseCursor(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseLimit(value: string | null): number {
  const n = Number.parseInt(value ?? "", 10);
  const safe = Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
  return Math.min(Math.max(safe, 1), MAX_LIMIT);
}

function trimToUndefined(value: string | null): string | null {
  const v = value?.trim();
  return v && v.length > 0 ? v : null;
}
