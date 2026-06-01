import { RUN_STATUSES, type RunStatus } from "@/lib/contracts/run";

export const RUN_STATUS_COLOR: Record<
  RunStatus,
  "default" | "info" | "success" | "error" | "warning"
> = {
  in_progress: "info",
  paused: "default",
  interrupted: "warning",
  completed: "success",
  failed: "error",
};

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  in_progress: "in progress",
  paused: "paused",
  interrupted: "interrupted",
  completed: "completed",
  failed: "failed",
};

export const RUN_STATUS_OPTIONS = RUN_STATUSES.map((value) => ({
  value,
  label: RUN_STATUS_LABEL[value],
}));
