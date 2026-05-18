"use client";

import type { ReactElement } from "react";
import {
  Button,
  Chip,
  LinearProgress,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { z } from "zod/v4";
import { FormSelectField, FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { RunSource } from "@/lib/schemas/run";
import { useAgent } from "@/providers/agent-provider";
import type { CreateRunRequest, JobBoardDto, ProfileResponse, RunDto } from "@/types/api";
import { buildCliArgs } from "@/utils/cli-args";
import { slugify } from "@/utils/slug";

type RunMode = Extract<RunSource, "search" | "autopilot">;

interface FormValues {
  mode: RunMode;
  query: string;
  board: string;
  minScore: number;
  maxApps: number | "";
}

const formSchema = z.object({
  mode: z.enum(["search", "autopilot"]),
  query: z.string().trim().min(2, "Enter a search query"),
  board: z.string().min(1, "Pick a board"),
  minScore: z.number().int().min(0).max(100),
  maxApps: z.union([z.literal(""), z.number().int().min(1).max(500)]),
});

function makeRunId(query: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
  return `${ts}_${slugify(query, { maxLength: 40, fallback: "run" })}`;
}

function hasMaxApps(values: FormValues): values is FormValues & { maxApps: number } {
  return values.maxApps !== "" && Number.isFinite(values.maxApps);
}

function buildRunConfig(values: FormValues): CreateRunRequest["config"] {
  if (values.mode !== "autopilot") {
    return { board: values.board };
  }
  return {
    board: values.board,
    minScore: values.minScore,
    ...(hasMaxApps(values) ? { maxApplications: values.maxApps } : {}),
  };
}

function buildSkillArg(values: FormValues): string {
  return buildCliArgs({
    positional: [values.query.trim()],
    flags: {
      board: values.board,
      "min-score": values.mode === "autopilot" ? values.minScore : undefined,
      "max-apps": values.mode === "autopilot" && hasMaxApps(values) ? values.maxApps : undefined,
    },
  });
}

export function RunComposer(): ReactElement {
  const router = useRouter();
  const agent = useAgent();

  const boardsQuery = useApiQuery<JobBoardDto[]>(queryKeys.jobBoards.list(), () =>
    apiClient.get<JobBoardDto[]>("/api/job-boards"),
  );
  const profileQuery = useApiQuery<ProfileResponse>(queryKeys.profile.detail(), () =>
    apiClient.get<ProfileResponse>("/api/profile"),
  );
  const recentRunsQuery = useApiQuery<RunDto[]>(queryKeys.runs.list(), () =>
    apiClient.get<RunDto[]>("/api/runs"),
  );

  const createRun = useApiMutation<RunDto, CreateRunRequest>(
    (body) => apiClient.post<RunDto>("/api/runs", body),
    { invalidate: [queryKeys.runs.all] },
  );

  const boards = boardsQuery.data ?? [];
  const recentQueries = Array.from(new Set((recentRunsQuery.data ?? []).map((r) => r.query))).slice(
    0,
    5,
  );
  const autopilot = profileQuery.data?.autopilot;
  const hasBoards = boards.length > 0;

  const form = useForm({
    defaultValues: {
      mode: "autopilot" as RunMode,
      query: "",
      board: boards[0]?.domain ?? "",
      minScore: autopilot?.minMatchScore ?? 70,
      maxApps: (autopilot?.maxApplicationsPerRun ?? "") as number | "",
    },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      const runId = makeRunId(value.query);
      await createRun.mutateAsync({
        runId,
        query: value.query.trim(),
        source: value.mode,
        config: buildRunConfig(value),
      });
      await agent.injectSkill(value.mode, buildSkillArg(value));
      router.push(`/runs/${encodeURIComponent(runId)}`);
    },
  });
  const formApi = form as unknown as AnyReactForm;

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
          <form.Field name="mode">
            {(field) => (
              <Stack spacing={0.5}>
                <Typography variant="body2Muted">Mode</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={field.state.value}
                  onChange={(_, next: RunMode | null) => next && field.handleChange(next)}
                >
                  <ToggleButton value="search">Search only</ToggleButton>
                  <ToggleButton value="autopilot">Autopilot</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            )}
          </form.Field>

          <Stack spacing={0.75}>
            <FormTextField
              form={formApi}
              name="query"
              label="Query"
              placeholder="Senior React TypeScript remote"
              autoFocus
            />
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

          {hasBoards ? (
            <FormSelectField
              form={formApi}
              name="board"
              label="Board"
              items={boards.map((b) => ({ value: b.domain, label: b.name }))}
            />
          ) : (
            <Typography variant="body2Muted">
              No boards configured. Add one on the Boards page first.
            </Typography>
          )}

          <form.Subscribe selector={(s) => s.values.mode === "autopilot"}>
            {(isAutopilot) =>
              isAutopilot && (
                <Stack spacing={2}>
                  <form.Field name="minScore">
                    {(field) => (
                      <Stack spacing={0.5}>
                        <Typography variant="body2Muted">
                          Min match score: {field.state.value}
                        </Typography>
                        <Slider
                          value={field.state.value}
                          min={0}
                          max={100}
                          step={5}
                          marks
                          valueLabelDisplay="auto"
                          onChange={(_, v) => field.handleChange(v as number)}
                        />
                      </Stack>
                    )}
                  </form.Field>
                  <FormTextField
                    form={formApi}
                    name="maxApps"
                    label="Max applications"
                    type="number"
                    helperText="Leave empty for unlimited."
                    slotProps={{ htmlInput: { min: 1, max: 500, step: 1 } }}
                  />
                </Stack>
              )
            }
          </form.Subscribe>

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={() => router.back()}>Cancel</Button>
            <form.Subscribe selector={(s) => [s.values.mode, s.canSubmit, s.isSubmitting] as const}>
              {([mode, canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!hasBoards || !canSubmit || isSubmitting}
                >
                  {mode === "search" ? "Start search" : "Start autopilot"}
                </Button>
              )}
            </form.Subscribe>
          </Stack>
        </Stack>
      </form>
    </SectionCard>
  );
}
