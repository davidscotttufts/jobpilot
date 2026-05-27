import type { RunEventType, RunJobStatus, RunSource, RunStatus } from "@/lib/schemas/run";

export interface RunDto {
  runId: string;
  query: string;
  source: RunSource;
  status: RunStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  config: RunConfigDto;
  summary: RunSummaryDto;
}

export interface RunConfigDto {
  board?: string;
  minScore?: number;
  maxApplications?: number;
  maxJobs?: number;
}

export interface RunSummaryDto {
  totalFound: number;
  qualified: number;
  applied: number;
  failed: number;
  skipped: number;
  remaining: number;
}

export interface RunJobDto {
  id: number;
  runId: string;
  key: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  type: string | null;
  url: string;
  board: string | null;
  matchScore: number | null;
  matchReason: string | null;
  status: RunJobStatus;
  appliedAt: string | null;
  failReason: string | null;
  retryNotes: string | null;
  skipReason: string | null;
  description: string | null;
}

export interface RunEventDto {
  id: number;
  runId: string;
  type: RunEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RunDetailDto extends RunDto {
  jobs: RunJobDto[];
}

export interface CreateRunRequest {
  runId: string;
  query: string;
  source: RunSource;
  config: RunConfigDto;
}
