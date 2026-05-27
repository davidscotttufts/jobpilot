import type { Application, Job, QueueEntry } from "@/generated/prisma/client";
import type { PipelineJobDto, PipelineStage } from "@/types/api/pipeline";

const APPLICATION_STAGE_LABEL: Record<string, string> = {
  applied: "Applied",
  recruiter_screen: "Recruiter screen",
  assessment: "Assessment",
  hiring_manager_screen: "Hiring manager screen",
  technical_interview: "Technical interview",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function formatApplicationStage(stage: string): string {
  return APPLICATION_STAGE_LABEL[stage] ?? stage;
}

export function mapQueueEntry(entry: QueueEntry): PipelineJobDto {
  const { hostname, path } = splitUrl(entry.url);
  return {
    id: `queue:${entry.id}`,
    stage: "queued",
    role: hostname,
    company: path,
    location: null,
    board: null,
    matchScore: null,
    resumeVariant: null,
    updatedAt: entry.createdAt.toISOString(),
    liveStep: null,
    liveMessage: null,
    stageSummary: entry.note,
    url: entry.url,
    runId: null,
    applicationId: null,
  };
}

function splitUrl(raw: string): { hostname: string; path: string } {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    const path = `${u.pathname}${u.search}`.replace(/\/$/, "") || "/";
    return { hostname: host, path };
  } catch {
    return { hostname: raw, path: "" };
  }
}

export function mapRunJob(job: Job): PipelineJobDto {
  return {
    id: `run:${job.runId}:${job.key}`,
    stage: "applying",
    role: job.title,
    company: job.company,
    location: job.location,
    board: job.board,
    matchScore: job.matchScore,
    resumeVariant: null,
    updatedAt: (job.appliedAt ?? new Date()).toISOString(),
    liveStep: job.status,
    liveMessage: job.retryNotes,
    stageSummary: null,
    url: job.url,
    runId: job.runId,
    applicationId: null,
  };
}

export function mapApplication(app: Application, stage: PipelineStage): PipelineJobDto {
  return {
    id: `app:${app.id}`,
    stage,
    role: app.title,
    company: app.company,
    location: app.location,
    board: app.board,
    matchScore: app.matchScore,
    resumeVariant: null,
    updatedAt: app.appliedAt.toISOString(),
    liveStep: null,
    liveMessage: null,
    stageSummary: stage === "interviewing" ? formatApplicationStage(app.stage) : null,
    url: app.url,
    runId: app.runId,
    applicationId: app.id,
  };
}
