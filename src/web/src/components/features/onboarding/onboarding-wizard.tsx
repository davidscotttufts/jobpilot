"use client";

import { useEffect, useRef, useState, type ReactElement, type SubmitEvent } from "react";
import { Alert, Button, CircularProgress, Stack, Step, StepLabel, Stepper } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/providers/notification-provider";
import { ResumeUploadStep } from "./resume-upload-step";

const STEPS = [
  { key: "resume", label: "Resume" },
  { key: "personal", label: "Personal" },
  { key: "address", label: "Address" },
  { key: "work-auth", label: "Work auth" },
  { key: "eeo", label: "EEO" },
  { key: "autopilot", label: "Autopilot" },
] as const;

const FIELD_TO_STEP: Record<string, number> = {
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  website: 1,
  linkedin: 1,
  github: 1,
  street: 2,
  aptUnit: 2,
  city: 2,
  state: 2,
  zipCode: 2,
  country: 2,
  usAuthorized: 3,
  requiresSponsorship: 3,
  visaStatus: 3,
  optExtension: 3,
  willingToRelocate: 3,
  preferredLocations: 3,
  eeoGender: 4,
  eeoRace: 4,
  eeoEthnicity: 4,
  eeoHispanicOrLatino: 4,
  eeoVeteranStatus: 4,
  eeoDisabilityStatus: 4,
};

function firstInvalidStep(fieldMeta: Record<string, { errors?: unknown[] }>): number | null {
  let earliest: number | null = null;

  for (const [name, meta] of Object.entries(fieldMeta)) {
    if (!meta?.errors || meta.errors.length === 0) {
      continue;
    }
    const stepIndex = FIELD_TO_STEP[name];
    if (stepIndex == null) {
      continue;
    }
    if (earliest === null || stepIndex < earliest) {
      earliest = stepIndex;
    }
  }
  return earliest;
}

interface OnboardingWizardProps {
  isNewProfile: boolean;
}

export function OnboardingWizard(props: OnboardingWizardProps): ReactElement {
  const { isNewProfile } = props;
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);

  const bootstrapRef = useRef(false);

  const createProfile = useApiMutation<{ id: number }, void>(() =>
    apiClient.post<{ id: number }>("/api/profiles", {}),
  );

  const setActive = useApiMutation<{ profileId: number }, number>(
    (profileId) => apiClient.post("/api/profiles/active", { profileId }),
    { invalidate: [queryKeys.profiles.all] },
  );

  useEffect(() => {
    if (bootstrapRef.current) {
      return;
    }
    bootstrapRef.current = true;

    const bootstrap = async (): Promise<void> => {
      const { id } = await createProfile.mutateAsync();
      await setActive.mutateAsync(id);
      setBootstrapped(true);
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useApiMutation<{ id: number }, ProfileWithAutopilotInput>(
    (vars) => apiClient.put("/api/profile", vars),
    {
      successMessage: isNewProfile ? "Profile created" : "Profile saved",
      invalidate: [queryKeys.profile.all, queryKeys.profiles.all],
      onSuccess: () => {
        queryClient.invalidateQueries();
        router.refresh();
        router.push(isNewProfile ? "/" : "/settings");
      },
    },
  );

  const form = useForm({
    defaultValues: PROFILE_DEFAULT_VALUES,
    validators: { onSubmit: profileWithAutopilotSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync(value);
    },
  });

  const submitForm = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    await form.handleSubmit();
    if (form.state.isSubmitted && !form.state.isValid) {
      const target = firstInvalidStep(
        form.state.fieldMeta as Record<string, { errors?: unknown[] }>,
      );
      if (target !== null) {
        setStep(target);
      }
      toast.error("Some fields need fixing before we can save your profile.");
    }
  };

  const formApi = form as unknown as AnyReactForm;
  const isLastStep = step === STEPS.length - 1;

  if (!bootstrapped) {
    return (
      <Stack sx={{ py: 6, alignItems: "center" }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

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
            {step === 0 && <ResumeUploadStep form={formApi} onContinue={() => setStep(1)} />}
            {step === 1 && <PersonalSection form={formApi} />}
            {step === 2 && <AddressSection form={formApi} />}
            {step === 3 && <WorkAuthSection form={formApi} />}
            {step === 4 && <EeoSection form={formApi} />}
            {step === 5 && <AutopilotSection form={formApi} />}
            {step !== 0 && (
              <Stack direction="row" sx={{ justifyContent: "space-between", pt: 1 }}>
                <Button variant="outlined" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                  Back
                </Button>
                <Button type="submit" variant="contained" disabled={save.isPending}>
                  {isLastStep ? (save.isPending ? "Saving…" : "Finish") : "Next"}
                </Button>
              </Stack>
            )}
          </Stack>
        </form>
      </SectionCard>
    </Stack>
  );
}
