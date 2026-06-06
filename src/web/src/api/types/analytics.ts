export interface AnalyticsTotals {
  applications: number;
  submitted: number;
  interviewing: number;
  offers: number;
  rejected: number;
  queueDepth: number;
}

export interface AnalyticsWeekly {
  submitted: number;
  interviewing: number;
  rejected: number;
}

export interface AnalyticsStageBreakdownEntry {
  stage: string;
  count: number;
}

export interface AnalyticsPerDayEntry {
  date: string;
  count: number;
}

export interface AnalyticsTopBoardEntry {
  board: string;
  count: number;
}

export interface AnalyticsTopReasonEntry {
  reason: string;
  count: number;
}

export interface AnalyticsStatsDto {
  totals: AnalyticsTotals;
  thisWeek: AnalyticsWeekly;
  responseRatePct: number;
  stageBreakdown: AnalyticsStageBreakdownEntry[];
  perDay: AnalyticsPerDayEntry[];
  topBoards: AnalyticsTopBoardEntry[];
  topRejectReasons: AnalyticsTopReasonEntry[];
}
