"use client";

import type { ReactElement } from "react";
import { Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useAppForm } from "@/components/ui/form/tanstack";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import { useAgent } from "@/providers/agent-provider";
import type { CampaignDto, CreateCampaignRequest, JobBoardDto, ProfileResponse } from "@/types/api";
import { AutoApplyFields } from "./auto-apply-fields";
import {
  buildCampaignConfig,
  buildSkillArg,
  COMPOSER_DEFAULT_VALUES,
  composerFormSchema,
  makeCampaignId,
  SUBMIT_LABELS,
} from "./form-config";
import { OutreachFields } from "./outreach-fields";
import { SearchFields } from "./search-fields";

export function CampaignComposer(): ReactElement {
  const router = useRouter();
  const agent = useAgent();

  const boardsQuery = useApiQuery<JobBoardDto[]>(queryKeys.jobBoards.list(), () =>
    apiClient.get<JobBoardDto[]>("/api/job-boards"),
  );
  const profileQuery = useApiQuery<ProfileResponse>(queryKeys.profile.detail(), () =>
    apiClient.get<ProfileResponse>("/api/profile"),
  );
  const recentCampaignsQuery = useApiQuery<CampaignDto[]>(queryKeys.campaigns.list(), () =>
    apiClient.get<CampaignDto[]>("/api/campaigns"),
  );

  const createCampaign = useApiMutation<CampaignDto, CreateCampaignRequest>(
    (body) => apiClient.post<CampaignDto>("/api/campaigns", body),
    { invalidate: [queryKeys.campaigns.all] },
  );

  const boards = boardsQuery.data ?? [];
  const recentQueries = Array.from(
    new Set((recentCampaignsQuery.data ?? []).map((r) => r.query)),
  ).slice(0, 5);
  const hasBoards = boards.length > 0;

  const form = useAppForm({
    defaultValues: {
      ...COMPOSER_DEFAULT_VALUES,
      board: boards[0]?.domain ?? "",
      minScore: profileQuery.data?.autoApply?.minMatchScore ?? COMPOSER_DEFAULT_VALUES.minScore,
    },
    validators: { onSubmit: composerFormSchema },
    onSubmit: async ({ value }) => {
      const campaignId = makeCampaignId(value.query);
      await createCampaign.mutateAsync({
        campaignId,
        query: value.query.trim(),
        source: value.mode,
        config: buildCampaignConfig(value),
      });
      await agent.injectSkill(value.mode, buildSkillArg(value, campaignId));
      router.push(`/campaigns/${encodeURIComponent(campaignId)}`);
    },
  });

  const mode = useStore(form.store, (s) => s.values.mode);
  const isOutreach = mode === "outreach";

  if (boardsQuery.isLoading || profileQuery.isLoading) {
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
          <form.AppField name="mode">
            {(field) => (
              <field.Toggle
                label="Mode"
                options={[
                  { value: "search", label: "Search only" },
                  { value: "auto-apply", label: "Auto-apply" },
                  { value: "outreach", label: "Outreach" },
                ]}
              />
            )}
          </form.AppField>

          <Stack spacing={0.75}>
            <form.AppField name="query">
              {(field) => (
                <field.TextField
                  label={isOutreach ? "Target criteria" : "Query"}
                  placeholder={
                    isOutreach
                      ? "Hiring managers at NYC fintech startups"
                      : "Senior React TypeScript remote"
                  }
                  autoFocus
                />
              )}
            </form.AppField>
            {recentQueries.length > 0 && (
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
                <Typography variant="captionMuted" sx={{ alignSelf: "center" }}>
                  Recent:
                </Typography>
                {recentQueries.map((q) => (
                  <Chip
                    key={q}
                    label={q}
                    size="small"
                    variant="outlined"
                    onClick={() => form.setFieldValue("query", q)}
                  />
                ))}
              </Stack>
            )}
          </Stack>

          {!isOutreach &&
            (hasBoards ? (
              <form.AppField name="board">
                {(field) => (
                  <field.Select
                    label="Board"
                    items={boards.map((b) => ({ value: b.domain, label: b.name }))}
                  />
                )}
              </form.AppField>
            ) : (
              <Typography variant="body2Muted">
                No boards configured. Add one on the Boards page first.
              </Typography>
            ))}

          {mode === "search" && <SearchFields form={form} />}
          {mode === "auto-apply" && <AutoApplyFields form={form} />}
          {mode === "outreach" && <OutreachFields form={form} />}

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={() => router.back()}>Cancel</Button>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={(!hasBoards && !isOutreach) || !canSubmit || isSubmitting}
                >
                  {SUBMIT_LABELS[mode]}
                </Button>
              )}
            </form.Subscribe>
          </Stack>
        </Stack>
      </form>
    </SectionCard>
  );
}
