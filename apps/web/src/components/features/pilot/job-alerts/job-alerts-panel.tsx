"use client";

import { type ReactElement, useState } from "react";
import type {
  JobAlertsStatus,
  PilotJobAlerts,
  RunJobAlertsResult,
} from "@jobpilot/contracts/pilot";
import { PlayArrow, Schedule } from "@mui/icons-material";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { api } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { queryKeys } from "@/api/query-keys";
import { LinkButton } from "@/components/ui/buttons";
import { QuerySection } from "@/components/ui/data";
import { SectionCard } from "@/components/ui/layout";
import { useToast } from "@/providers/notification-provider";
import { formatRelativeTime, formatTimeUntil, plural } from "@/utils/format";
import { ScheduleDialog } from "./schedule-dialog";

/** Poll fast only while a run is queued or in flight; otherwise the schedule barely moves. */
const ACTIVE_POLL_MS = 15_000;
const IDLE_POLL_MS = 120_000;

const OUTCOME_LABELS: Record<string, string> = {
  done: "finished",
  failed: "failed",
  abandoned: "was abandoned",
  expired: "timed out",
};

function isActive(status: JobAlertsStatus | undefined): boolean {
  if (!status) return false;
  return (
    status.requestedAt !== null || (status.lastRun !== null && status.lastRun.outcome === null)
  );
}

function scheduleSummary(status: JobAlertsStatus): string {
  const { settings } = status;
  if (!settings.enabled) return "Not scheduled - runs only when you click Run now.";
  const times = settings.runHours.map((hour) => `${String(hour).padStart(2, "0")}:00`).join(", ");
  const next = status.nextRunAt ? ` · next in ${formatTimeUntil(status.nextRunAt)}` : "";
  return `Runs daily at ${times} ${settings.timeZone}${next}`;
}

function LastRun(props: { status: JobAlertsStatus }): ReactElement | null {
  const { lastRun } = props.status;
  if (!lastRun) {
    return <Typography variant="captionMuted">No harvest has run yet.</Typography>;
  }
  const finished = lastRun.outcome ? OUTCOME_LABELS[lastRun.outcome] : null;
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="captionMuted">
        {finished
          ? `Last run ${finished} ${formatRelativeTime(lastRun.finishedAt ?? lastRun.startedAt)} ago`
          : `Harvesting now - started ${formatRelativeTime(lastRun.startedAt)} ago`}
      </Typography>
      {lastRun.campaignId && (
        <LinkButton
          size="small"
          href={`/campaigns/${encodeURIComponent(lastRun.campaignId)}` as Route}
        >
          {lastRun.campaignQuery ?? "Open campaign"}
        </LinkButton>
      )}
    </Stack>
  );
}

/**
 * The job-alert harvest: when it runs, what is waiting, and a Run now that wakes the pilot. The pilot
 * does the harvesting, so every action here only queues work for its next cycle.
 */
export function JobAlertsPanel(): ReactElement {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const query = useApiQuery(pilotQueries.jobAlerts(), {
    refetchInterval: (current) => (isActive(current.state.data) ? ACTIVE_POLL_MS : IDLE_POLL_MS),
  });
  const status = query.data;

  const save = useApiMutation<JobAlertsStatus, PilotJobAlerts>(
    (body) => api.pilot["job-alerts"].put(body),
    {
      invalidate: [queryKeys.pilot.jobAlerts(), queryKeys.pilot.state(), queryKeys.pilot.agenda()],
      successMessage: "Job alert schedule saved.",
    },
  );
  const run = useApiMutation<RunJobAlertsResult, void>(() => api.pilot["job-alerts"].run.post(), {
    invalidate: [queryKeys.pilot.jobAlerts(), queryKeys.pilot.agenda()],
    onSuccess: (result) => {
      if (!result.queued) {
        toast.info("No new job alert emails to harvest.");
        return;
      }
      toast.success(
        `Queued ${plural(result.pendingEmails, "alert email")} - the pilot picks it up on its next cycle.`,
      );
    },
  });

  const blocker = status ? runBlocker(status) : null;

  return (
    <SectionCard
      title="Job alert emails"
      description="Pulls every posting out of alert emails from LinkedIn, Ladders, FlexJobs and more, ranks them against your resume, and opens a campaign. Matches at or above your min score get applied to."
    >
      <QuerySection
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        errorTitle="Couldn't load the job alert schedule."
        isEmpty={false}
        empty={null}
      >
        {status && (
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <Chip
                size="small"
                color={status.settings.enabled ? "primary" : "default"}
                label={status.settings.enabled ? "Scheduled" : "Off"}
              />
              <Typography variant="body2">{scheduleSummary(status)}</Typography>
            </Stack>
            <Typography variant="body2">
              {status.pendingEmails === 0
                ? "No new alert emails waiting."
                : `${plural(status.pendingEmails, "alert email")} waiting to be harvested.`}
            </Typography>
            {status.requestedAt && (
              <Typography variant="captionMuted">
                Run queued {formatRelativeTime(status.requestedAt)} ago - it starts on the pilot's
                next cycle.
              </Typography>
            )}
            <LastRun status={status} />
            {blocker && (
              <Alert severity="info" variant="outlined">
                {blocker}
              </Alert>
            )}
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button size="small" startIcon={<Schedule />} onClick={() => setEditing(true)}>
                Schedule
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrow />}
                // A queued or running harvest already covers the mail a second click would queue.
                disabled={blocker !== null || isActive(status) || run.isPending}
                onClick={() => run.mutate()}
              >
                Run now
              </Button>
            </Stack>
          </Stack>
        )}
      </QuerySection>
      {status && (
        <ScheduleDialog
          open={editing}
          status={status}
          submitting={save.isPending}
          onClose={() => setEditing(false)}
          onSubmit={async (settings) => {
            await save.mutateAsync(settings);
            setEditing(false);
          }}
        />
      )}
    </SectionCard>
  );
}

/** Why Run now is disabled, or null when it can run. */
function runBlocker(status: JobAlertsStatus): string | null {
  if (!status.mailboxConnected)
    return "Connect Gmail in Settings → Email so there is mail to read.";
  if (!status.pilotRunning) return "Start the pilot - it is what does the harvesting.";
  return null;
}
