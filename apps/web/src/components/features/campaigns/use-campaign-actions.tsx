"use client";

import { type ReactNode, useState } from "react";
import type { CampaignStatus } from "@jobpilot/contracts/campaign";
import { describeWeeklySchedule, isPinnedWeekly } from "@jobpilot/contracts/pilot";
import {
  Autorenew,
  Delete,
  DoneAll,
  EventRepeat,
  Pause,
  PlayArrow,
  Replay,
  RestartAlt,
} from "@mui/icons-material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { api } from "@/api/client";
import { type ApiMutationResult, useApiMutation, useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { invalidations, queryKeys } from "@/api/query-keys";
import { type CampaignDto, jobSummary } from "@/api/types";
import type { DropdownMenuItem } from "@/components/ui/feedback";
import { useAgent, useAgentAvailable } from "@/providers/agent-provider";
import { useConfirm } from "@/providers/confirm-provider";
import { RepeatWeeklyDialog, type WeeklyScheduleValue } from "./detail/repeat-weekly-dialog";
import { RescanDialog } from "./detail/rescan-dialog";

/** Matches the composer's default so a campaign created without one rescans from the same floor. */
const DEFAULT_MIN_SCORE = 60;

export type CampaignActionKey =
  | "stop"
  | "resume"
  | "run-again"
  | "repeat"
  | "retry-failed"
  | "rescan"
  | "mark-done"
  | "delete";

interface CampaignActionsOptions {
  campaign: CampaignDto;
  /** Keys the caller renders itself, as buttons - the detail bar promotes Stop and Resume. */
  omit?: readonly CampaignActionKey[];
  /** The detail page has to leave its own route once the campaign it renders is gone. */
  onDeleted?: () => void;
}

export interface CampaignActions {
  /** Contextual entries, already filtered by status, source, and agent availability. */
  menuItems: DropdownMenuItem[];
  /** Whether anything survived that filtering - hide the trigger when nothing did. */
  hasMenu: boolean;
  /** Dialogs these actions own. Render once, anywhere in the consumer's tree. */
  dialogs: ReactNode;
  isInProgress: boolean;
  isStopped: boolean;
  agentAvailable: boolean;
  stop: ApiMutationResult<unknown, void>;
  resume: () => void;
  runAgain: () => void;
  /** "Mon, Thu at 08:00" when a pilot search repeats this campaign, else null. */
  repeatLabel: string | null;
}

/**
 * Every action a campaign offers, in one place: the workspace row menu and the detail actions bar
 * both read from here, so a rule about when an action applies is written once rather than drifting
 * between the two surfaces.
 */
export function useCampaignActions(options: CampaignActionsOptions): CampaignActions {
  const { campaign, omit = [], onDeleted } = options;
  const agent = useAgent();
  const agentAvailable = useAgentAvailable();
  const confirm = useConfirm();
  const router = useRouter();

  const campaignResource = api.campaigns({ id: campaign.campaignId });

  const stop = useApiMutation<unknown, void>(
    () =>
      campaignResource.status.post({
        status: "paused" satisfies CampaignStatus,
        actor: "user",
      }),
    {
      successMessage: "Campaign paused",
      invalidate: invalidations.campaign,
    },
  );

  const complete = useApiMutation<unknown, void>(
    () =>
      campaignResource.status.post({
        status: "completed" satisfies CampaignStatus,
        actor: "user",
      }),
    {
      successMessage: "Campaign marked as done",
      invalidate: invalidations.campaign,
    },
  );

  const [rescanOpen, setRescanOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);

  // The whole search list, not one lookup per row: it is a short bare array and the workspace
  // renders ten campaigns at a time.
  const searches = useApiQuery(pilotQueries.searches());
  const search = campaign.pilotSearchId
    ? searches.data?.find((s) => s.id === campaign.pilotSearchId)
    : undefined;
  const repeats = search && isPinnedWeekly(search) ? search : undefined;

  const invalidateRepeat = [...invalidations.campaign, queryKeys.pilot.searches()];

  const repeatWeekly = useApiMutation<unknown, WeeklyScheduleValue>(
    (value) =>
      search
        ? api.pilot.searches({ id: search.id }).patch({
            cadence: "weekly",
            cadenceDays: value.days,
            cadenceHour: value.hour,
            cadenceTimeZone: browserTimeZone(),
          })
        : api.pilot.searches.post({
            query: campaign.query,
            board: campaign.config.board,
            resumeId: campaign.config.resumeId,
            reason: "Repeating a campaign you asked to run on a schedule.",
            minScore: campaign.config.minScore,
            maxApplications: campaign.config.maxApplications,
            campaignId: campaign.campaignId,
            cadence: "weekly",
            cadenceDays: value.days,
            cadenceHour: value.hour,
            cadenceTimeZone: browserTimeZone(),
          }),
    {
      successMessage: "Campaign scheduled",
      invalidate: invalidateRepeat,
      onSuccess: () => setRepeatOpen(false),
    },
  );

  // Back to the pilot's own yield-based cadence. Flipping the cadence rather than deleting the
  // search keeps both the link that lets discovery reuse this campaign and the day choice, so
  // turning repeats back on does not start from a blank week.
  const stopRepeating = useApiMutation<unknown, void>(
    () => api.pilot.searches({ id: search?.id ?? "" }).patch({ cadence: "adaptive" }),
    {
      successMessage: "Campaign no longer repeats",
      invalidate: invalidateRepeat,
      onSuccess: () => setRepeatOpen(false),
    },
  );

  const rescan = useApiMutation<unknown, number>(
    (minScore) => campaignResource.patch({ config: { ...campaign.config, minScore } }),
    { invalidate: invalidations.campaign },
  );

  const remove = useApiMutation<unknown, void>(() => campaignResource.delete(), {
    successMessage: "Campaign deleted",
    invalidate: invalidations.campaign,
    onSuccess: onDeleted,
  });

  const summary = jobSummary(campaign);
  const failedCount = summary?.failed ?? 0;
  const skippedCount = summary?.skipped ?? 0;
  const isInProgress = campaign.status === "in_progress";
  const isAutoApply = campaign.source === "auto-apply";
  const isStopped = campaign.status === "paused";
  const isFinished = campaign.status === "completed" || campaign.status === "failed";

  const handleMarkDone = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Mark campaign as done?",
      description:
        "This closes the campaign permanently. Use it for campaigns you stopped on purpose.",
      confirmLabel: "Mark as done",
    });
    if (confirmed) {
      complete.mutate();
    }
  };

  const handleDelete = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete campaign?",
      description:
        "Permanently deletes this campaign and all of its data - jobs, history, applications it produced, and networking activity. This cannot be undone.",
      confirmLabel: "Delete campaign",
      destructive: true,
      confirmationText: "delete",
    });
    if (confirmed) {
      remove.mutate();
    }
  };

  const handleRescanConfirm = async (minScore: number): Promise<void> => {
    try {
      await rescan.mutateAsync(minScore);
    } catch {
      // onError already toasted; keep the dialog open so the threshold isn't lost.
      return;
    }
    void agent.injectSkill("rescan-skipped", campaign.campaignId);
    setRescanOpen(false);
  };

  // Networking campaigns have no jobs to replay - re-run the networking skill instead of `resume-campaign`.
  const resume = (): void => {
    void (campaign.source === "networking"
      ? agent.injectSkill("networking", `--campaign ${campaign.campaignId}`)
      : agent.injectSkill("resume-campaign", campaign.campaignId));
  };

  // A finished campaign cannot be reopened - its jobs are all terminal - so running it "again"
  // means a fresh campaign seeded from this one's settings, which the composer prefills.
  const runAgain = (): void => {
    router.push(`/campaigns/new?from=${encodeURIComponent(campaign.campaignId)}` as Route);
  };

  const allItems: DropdownMenuItem[] = [
    {
      kind: "item",
      key: "stop",
      label: "Stop",
      icon: <Pause fontSize="sm" />,
      show: isInProgress,
      disabled: stop.isPending,
      onClick: () => stop.mutate(),
    },
    {
      kind: "item",
      key: "resume",
      label: "Resume",
      icon: <PlayArrow fontSize="sm" />,
      show: isStopped && agentAvailable,
      onClick: resume,
    },
    {
      kind: "item",
      key: "run-again",
      label: "Run again",
      icon: <RestartAlt fontSize="sm" />,
      show: isFinished && agentAvailable,
      onClick: runAgain,
    },
    {
      kind: "item",
      key: "repeat",
      label: repeats ? "Change repeat…" : "Repeat weekly…",
      icon: <EventRepeat fontSize="sm" />,
      // A networking campaign is not board discovery, which is all a pilot search knows how to run.
      show: campaign.source !== "networking",
      onClick: () => setRepeatOpen(true),
    },
    {
      kind: "item",
      key: "mark-done",
      label: "Mark as done",
      icon: <DoneAll fontSize="sm" />,
      show: isStopped,
      disabled: complete.isPending,
      onClick: () => void handleMarkDone(),
    },
    {
      kind: "item",
      key: "retry-failed",
      label: `Retry failed (${failedCount})`,
      icon: <Replay fontSize="sm" />,
      show: isAutoApply && failedCount > 0 && agentAvailable,
      onClick: () => void agent.injectSkill("auto-apply", `retry-failed ${campaign.campaignId}`),
    },
    {
      kind: "item",
      key: "rescan",
      label: `Rescan skipped (${skippedCount})…`,
      icon: <Autorenew fontSize="sm" />,
      show: !isInProgress && skippedCount > 0 && agentAvailable,
      onClick: () => setRescanOpen(true),
    },
    {
      kind: "item",
      key: "delete",
      label: "Delete campaign",
      icon: <Delete fontSize="sm" />,
      danger: true,
      show: true,
      disabled: remove.isPending,
      onClick: () => void handleDelete(),
    },
  ];

  const kept = allItems.filter(
    (item) => item.show !== false && !omit.includes(item.key as CampaignActionKey),
  );
  // Delete sits last behind a divider, and only earns that divider when something precedes it.
  const destructive = kept.filter((item) => item.key === "delete");
  const rest = kept.filter((item) => item.key !== "delete");
  const divider: DropdownMenuItem[] =
    rest.length > 0 && destructive.length > 0 ? [{ kind: "divider", key: "delete-divider" }] : [];
  const menuItems: DropdownMenuItem[] = [...rest, ...divider, ...destructive];

  const dialogs = (
    <>
      <RepeatWeeklyDialog
        // The dialog seeds its fields from `initial` once, at mount. The search list resolves after
        // that, so without a key tied to the stored schedule it would keep showing the defaults.
        key={`repeat-${repeats?.cadenceDays.join("") ?? "none"}-${repeats?.cadenceHour ?? "none"}`}
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        query={campaign.query}
        timeZone={browserTimeZone()}
        initial={repeats ? { days: repeats.cadenceDays, hour: repeats.cadenceHour } : undefined}
        pending={repeatWeekly.isPending || stopRepeating.isPending}
        onConfirm={(value) => repeatWeekly.mutate(value)}
        onStopRepeating={repeats ? () => stopRepeating.mutate() : undefined}
      />
      <RescanDialog
        open={rescanOpen}
        onClose={() => setRescanOpen(false)}
        skippedCount={skippedCount}
        defaultMinScore={campaign.config.minScore ?? DEFAULT_MIN_SCORE}
        pending={rescan.isPending}
        onConfirm={(minScore) => void handleRescanConfirm(minScore)}
      />
    </>
  );

  return {
    menuItems,
    hasMenu: menuItems.length > 0,
    dialogs,
    isInProgress,
    isStopped,
    agentAvailable,
    stop,
    resume,
    runAgain,
    repeatLabel: repeats ? describeWeeklySchedule(repeats.cadenceDays, repeats.cadenceHour) : null,
  };
}

/** The viewer's own zone - the only sensible default for "8am" typed into a browser. */
function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
