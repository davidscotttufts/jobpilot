import type { JobListingSummaryDto } from "@/api/types";

type RemoteFields = Pick<JobListingSummaryDto, "remote" | "location">;

/** "United States (Remote)" already says it; a badge beside it would repeat it. */
export function showsRemoteBadge(job: RemoteFields): boolean {
  const location = job.location ?? "";
  return job.remote && !location.toLowerCase().includes("remote");
}

export function boardsLabel(boards: readonly string[]): string {
  if (boards.length <= 2) {
    return boards.join(" · ");
  }
  return `${boards[0]} +${boards.length - 1}`;
}
