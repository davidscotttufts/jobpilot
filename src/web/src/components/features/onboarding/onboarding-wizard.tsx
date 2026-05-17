"use client";

import { useEffect, useRef, useState, type ReactElement, type SubmitEvent } from "react";
import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
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

interface ProfileListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

function isEmptyDraft(p: ProfileListItem): boolean {
  return !p.firstName?.trim() && !p.lastName?.trim() && !p.email?.trim();
}

interface ValidationIssue {
  field: string;
  path: string;
  message: string;
  stepIndex: number | null;
}

function describeIssues(issues: readonly { path: PropertyKey[]; message: string }[]): ValidationIssue[] {
  return issues.map((issue) => {
    const field = String(issue.path[0] ?? "");
    return {
      field,
      path: issue.path.map(String).join(".") || "form",
      message: issue.message,
      stepIndex: FIELD_TO_STEP[field] ?? null,
    };
  });
}

function firstStepWithIssue(issues: ValidationIssue[]): number | null {
  for (const issue of issues) {
    if (issue.stepIndex !== null) {
      return issue.stepIndex;
    }
  }
  return null;
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
  const [showValidationErrors, setShowValidationErrors] = useState(false);

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
      const list = await apiClient.get<ProfileListItem[]>("/api/profiles");
      const reusable = list.data?.find(isEmptyDraft);
      const profileId = reusable ? reusable.id : (await createProfile.mutateAsync()).id;

      if (!reusable || !reusable.isActive) {
        await setActive.mutateAsync(profileId);
      }
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

    const result = profileWithAutopilotSchema.safeParse(form.state.values);
    if (!result.success) {
      const issues = describeIssues(result.error.issues);
      setShowValidationErrors(true);
      const target = firstStepWithIssue(issues);
      if (target !== null) {
        setStep(target);
      }
      toast.error("Some fields need fixing before we can save your profile.");
      return;
    }

    setShowValidationErrors(false);
    await form.handleSubmit();
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
            {showValidationErrors && (
              <form.Subscribe selector={(s) => s.values}>
                {(values) => {
                  const result = profileWithAutopilotSchema.safeParse(values);
                  if (result.success) {
                    return null;
                  }
                  const issues = describeIssues(result.error.issues);
                  return (
                    <Alert severity="error">
                      <AlertTitle>Some fields need fixing</AlertTitle>
                      <Stack spacing={0.5}>
                        {issues.map((issue, i) => {
                          const stepLabel =
                            issue.stepIndex !== null ? STEPS[issue.stepIndex]?.label : null;
                          return (
                            <Typography key={i} variant="body2">
                              <strong>{issue.path}</strong>
                              {stepLabel ? ` (${stepLabel} step)` : ""}: {issue.message}
                            </Typography>
                          );
                        })}
                      </Stack>
                    </Alert>
                  );
                }}
              </form.Subscribe>
            )}
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
