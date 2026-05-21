"use client";

import type { ReactElement } from "react";
import { Button, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { z } from "zod/v4";
import { FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useAgent } from "@/providers/agent-provider";
import type { CreateUpworkProposalRequest, UpworkProposalDto } from "@/types/api";

interface FormValues {
  jobTitle: string;
  clientName: string;
  jobUrl: string;
  jobDescription: string;
}

const formSchema = z.object({
  jobTitle: z.string().trim().min(2, "Enter a job title"),
  clientName: z.string(),
  jobUrl: z.string(),
  jobDescription: z.string().trim().min(20, "Paste the job description"),
});

export function ProposalComposer(): ReactElement {
  const router = useRouter();
  const agent = useAgent();

  const createProposal = useApiMutation<UpworkProposalDto, CreateUpworkProposalRequest>(
    (body) => apiClient.post<UpworkProposalDto>("/api/upwork/proposals", body),
    { invalidate: [queryKeys.upworkProposals.all] },
  );

  const form = useForm({
    defaultValues: {
      jobTitle: "",
      clientName: "",
      jobUrl: "",
      jobDescription: "",
    } satisfies FormValues,
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      const created = await createProposal.mutateAsync({
        jobTitle: value.jobTitle.trim(),
        clientName: value.clientName.trim() || null,
        jobUrl: value.jobUrl.trim() || null,
        jobDescription: value.jobDescription.trim(),
        status: "draft",
      });

      await agent.injectSkill("upwork-proposal", String(created.id));
      router.push(`/upwork/${created.id}` as Route);
    },
  });

  const formApi = form as unknown as AnyReactForm;

  return (
    <SectionCard>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack spacing={2.5}>
          <FormTextField
            form={formApi}
            name="jobTitle"
            label="Job title"
            placeholder="Senior React developer for SaaS dashboard"
            autoFocus
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormTextField form={formApi} name="clientName" label="Client (optional)" />
            <FormTextField form={formApi} name="jobUrl" label="Job URL (optional)" />
          </Stack>
          <FormTextField
            form={formApi}
            name="jobDescription"
            label="Job description"
            placeholder="Paste the full Upwork job posting here, including any screening questions."
            multiline
            minRows={8}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={() => router.back()}>Cancel</Button>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" variant="contained" disabled={!canSubmit || isSubmitting}>
                  Generate proposal
                </Button>
              )}
            </form.Subscribe>
          </Stack>
        </Stack>
      </form>
    </SectionCard>
  );
}
