export interface OverviewTotals {
  applications: number;
  submitted: number;
  interviewing: number;
  offers: number;
  rejected: number;
  queueDepth: number;
}

export interface OverviewWeekly {
  submitted: number;
  interviewing: number;
  rejected: number;
}

export interface OverviewStageBreakdownEntry {
  stage: string;
  count: number;
}

export interface OverviewPerDayEntry {
  date: string;
  count: number;
}

export interface OverviewTopBoardEntry {
  board: string;
  count: number;
}

export interface OverviewTopReasonEntry {
  reason: string;
  count: number;
}

export interface OverviewStatsDto {
  totals: OverviewTotals;
  thisWeek: OverviewWeekly;
  responseRatePct: number;
  stageBreakdown: OverviewStageBreakdownEntry[];
  perDay: OverviewPerDayEntry[];
  topBoards: OverviewTopBoardEntry[];
  topRejectReasons: OverviewTopReasonEntry[];
}
