"use client";

import { type ReactElement, useEffect } from "react";
import { MAX_APPLY_URLS } from "@jobpilot/contracts/campaign";
import { Button, LinearProgress, Stack } from "@mui/material";
import { useSelector } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { api } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { campaignQueries, jobBoardQueries, userQueries } from "@/api/queries";
import { queryKeys } from "@/api/query-keys";
import type { CampaignDto, CreateCampaignRequest } from "@/api/types";
import { useAppForm } from "@/components/ui/form/tanstack";
import { SectionCard } from "@/components/ui/layout";
import { useAgent } from "@/providers/agent-provider";
import { ApplyFields } from "./apply-fields";
import { AutoApplyFields } from "./auto-apply-fields";
import { CampaignBasicsFields } from "./campaign-basics-fields";
import {
  buildCreateCampaignRequest,
  buildSkillArg,
  COMPOSER_DEFAULT_VALUES,
  type ComposerFormValues,
  composerFormSchema,
  isUpworkSearch,
  SUBMIT_LABELS,
} from "./form-config";
import { NetworkingFields } from "./networking-fields";
import { composerValuesFromCampaign } from "./prefill";

interface CampaignComposerProps {
  /** Preselect a board (e.g. from /campaigns/new?board=upwork.com). */
  defaultBoard?: string;
  /** Run an earlier campaign again: seed every field from it (/campaigns/new?from=<id>). */
  fromCampaignId?: string;
}

export function CampaignComposer(props: CampaignComposerProps): ReactElement {
  const { defaultBoard, fromCampaignId } = props;
  const router = useRouter();
  const agent = useAgent();

  const boardsQuery = useApiQuery(jobBoardQueries.list());
  const profileQuery = useApiQuery(userQueries.detail());
  const recentCampaignsQuery = useApiQuery(campaignQueries.list());

  const sourceQuery = useApiQuery(campaignQueries.detail(fromCampaignId ?? ""), {
    enabled: !!fromCampaignId,
  });
  const sourceCampaign = sourceQuery.data;
  // An apply campaign stores its pasted links as jobs, so replaying one has to read them back.
  const sourceJobsQuery = useApiQuery(
    campaignQueries.jobs(fromCampaignId ?? "", { page: 1, limit: MAX_APPLY_URLS }),
    { enabled: sourceCampaign?.source === "apply" },
  );

  const createCampaign = useApiMutation<CampaignDto, CreateCampaignRequest>(
    (body) => api.campaigns.post(body),
    { invalidate: [queryKeys.campaigns.all] },
  );

  const boards = boardsQuery.data ?? [];
  const resumes = profileQuery.data?.resumes ?? [];
  const recentQueries = Array.from(
    new Set((recentCampaignsQuery.data?.items ?? []).map((r) => r.query)),
  ).slice(0, 5);
  const hasBoards = boards.length > 0;
  const hasResumes = resumes.length > 0;

  const presetBoard =
    defaultBoard && boards.some((b) => b.domain === defaultBoard) ? defaultBoard : undefined;

  const baseValues: ComposerFormValues = {
    ...COMPOSER_DEFAULT_VALUES,
    board: presetBoard ?? boards[0]?.domain ?? "",
    resumeId: resumes.find((r) => r.isPrimary)?.id ?? resumes[0]?.id ?? "",
    minScore: profileQuery.data?.autoApply?.minMatchScore ?? COMPOSER_DEFAULT_VALUES.minScore,
    // Networking reuses this field as its sourcing cap, so switching modes carries the number
    // over - visible and clearable, rather than the blank that ignored the setting entirely.
    maxApps:
      profileQuery.data?.autoApply?.maxApplicationsPerCampaign ?? COMPOSER_DEFAULT_VALUES.maxApps,
  };

  const form = useAppForm({
    defaultValues: sourceCampaign
      ? composerValuesFromCampaign(sourceCampaign, baseValues, {
          boards,
          resumes,
          urls: (sourceJobsQuery.data?.items ?? []).map((job) => job.url),
        })
      : baseValues,
    validators: { onSubmit: composerFormSchema },
    onSubmit: async ({ value }) => {
      const upwork = isUpworkSearch(value);
      const effective = upwork ? { ...value, mode: "search" as const } : value;
      const campaign = await createCampaign.mutateAsync(buildCreateCampaignRequest(effective));
      const campaignId = campaign.campaignId;
      router.push(`/campaigns/${encodeURIComponent(campaignId)}`);
      void agent.injectSkill(
        upwork ? "upwork-search" : effective.mode,
        buildSkillArg(effective, campaignId),
      );
    },
  });

  const mode = useSelector(form.store, (s) => s.values.mode);
  const board = useSelector(form.store, (s) => s.values.board);
  const isApply = mode === "apply";
  const isUpwork = isUpworkSearch({ mode, board });
  const isNetworking = mode === "networking";

  // Upwork has no auto-apply/networking path - pin the mode to search.
  useEffect(() => {
    if (isUpwork && mode !== "search") {
      form.setFieldValue("mode", "search");
    }
  }, [isUpwork, mode, form]);

  // The form captures its defaults on mount, so nothing may render before the prefill has landed.
  if (
    boardsQuery.isLoading ||
    profileQuery.isLoading ||
    sourceQuery.isLoading ||
    sourceJobsQuery.isLoading
  ) {
    return <LinearProgress />;
  }

  return (
    <SectionCard>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack spacing={2.5}>
          <CampaignBasicsFields
            form={form}
            boards={boards}
            resumes={resumes}
            recentQueries={recentQueries}
          />

          {mode === "search" && (
            <form.AppField name="maxJobs">
              {(field) => (
                <field.TextField
                  label="Jobs to search"
                  type="number"
                  helperText="How many results to rank. Leave empty for unlimited."
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
              )}
            </form.AppField>
          )}
          {mode === "auto-apply" && <AutoApplyFields form={form} />}
          {mode === "networking" && <NetworkingFields form={form} />}
          {mode === "apply" && <ApplyFields form={form} />}

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={() => router.back()}>Cancel</Button>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    // Apply needs neither prerequisite: it takes pasted links and tailors per job.
                    (!isApply && (!hasResumes || (!hasBoards && !isNetworking)))
                  }
                >
                  {isUpwork ? "Find Upwork jobs" : SUBMIT_LABELS[mode]}
                </Button>
              )}
            </form.Subscribe>
          </Stack>
        </Stack>
      </form>
    </SectionCard>
  );
}
