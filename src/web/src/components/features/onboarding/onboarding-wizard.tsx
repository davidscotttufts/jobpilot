"use client";

import { useState, type ReactElement, type SubmitEvent } from "react";
import { Button, Stack, Step, StepLabel, Stepper } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import {
  AddressSection,
  AutopilotSection,
  EeoSection,
  PersonalSection,
  WorkAuthSection,
} from "@/components/features/settings/sections";
import type { AnyReactForm } from "@/components/ui/form/tanstack";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  PROFILE_DEFAULT_VALUES,
  profileWithAutopilotSchema,
  type ProfileWithAutopilotInput,
} from "@/lib/schemas/profile";
import { ResumeUploadStep } from "./resume-upload-step";

const STEPS = [
  { key: "resume", label: "Resume" },
  { key: "personal", label: "Personal" },
  { key: "address", label: "Address" },
  { key: "work-auth", label: "Work auth" },
  { key: "eeo", label: "EEO" },
  { key: "autopilot", label: "Autopilot" },
] as const;

export function OnboardingWizard(): ReactElement {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const save = useApiMutation<{ id: number }, ProfileWithAutopilotInput>(
    (vars) => apiClient.put("/api/profile", vars),
    {
      successMessage: "Profile created",
      invalidate: [queryKeys.profile.all],
      onSuccess: () => router.push("/settings"),
    },
  );

  const form = useForm({
    defaultValues: PROFILE_DEFAULT_VALUES,
    validators: { onSubmit: profileWithAutopilotSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync(value);
    },
  });

  const submitForm = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLastStep) {
      form.handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const formApi = form as unknown as AnyReactForm;
  const isLastStep = step === STEPS.length - 1;

  return (
    <Stack spacing={3}>
      <Stepper activeStep={step} alternativeLabel>
        {STEPS.map((s) => (
          <Step key={s.key}>
            <StepLabel>{s.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <SectionCard>
        <form onSubmit={submitForm}>
          <Stack spacing={3}>
            {step === 1 && <ResumeUploadStep form={formApi} onContinue={() => setStep(2)} />}
            {step === 2 && <PersonalSection form={formApi} />}
            {step === 3 && <AddressSection form={formApi} />}
            {step === 4 && <WorkAuthSection form={formApi} />}
            {step === 5 && <EeoSection form={formApi} />}
            {step === 6 && <AutopilotSection form={formApi} />}
            {step !== 1 && (
              <Stack direction="row" sx={{ justifyContent: "space-between", pt: 1 }}>
                <Button variant="outlined" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                  Back
                </Button>
                <Button type="submit" variant="contained" disabled={save.isPending}>
                  {isLastStep ? (save.isPending ? "Savingâ€¦" : "Finish") : "Next"}
                </Button>
              </Stack>
            )}
          </Stack>
        </form>
      </SectionCard>
    </Stack>
  );
}
