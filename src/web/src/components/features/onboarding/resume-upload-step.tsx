"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { CheckCircle, ErrorOutlined, HourglassEmpty } from "@mui/icons-material";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { FileUpload } from "@/components/ui/form";
import type { AnyReactForm } from "@/components/ui/form/tanstack";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { MAX_RESUME_BYTES } from "@/lib/constants";
import type { ResumeEvent } from "@/lib/sse/resume-events.types";
import { useEventSource } from "@/lib/sse/use-event-source";
import { useAgent } from "@/providers/agent-provider";
import { useToast } from "@/providers/notification-provider";
import type { ResumeDto } from "@/types/api";
import { applyBasicsToForm } from "./map-basics-to-profile";

const EXTRACT_SLOW_AFTER_MS = 2 * 60 * 1000;

interface ResumeUploadStepProps {
  form: AnyReactForm;
  onContinue: () => void;
}

type StepState = "idle" | "uploading" | "extracting" | "slow" | "done";

function isWaitingForExtraction(state: StepState): boolean {
  return state === "extracting" || state === "slow";
}

export function ResumeUploadStep(props: ResumeUploadStepProps): ReactElement {
  const { form, onContinue } = props;

  const toast = useToast();
  const agent = useAgent();
  const [state, setState] = useState<StepState>("idle");
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [injectError, setInjectError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const upload = useApiMutation<{ id: number }, File>(
    (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.upload<{ id: number }>("/api/resumes", fd);
    },
    {
      successMessage: "Resume uploaded",
      invalidate: [queryKeys.resume.all, queryKeys.profile.all],
      onSuccess: ({ id }) => {
        setResumeId(id);
        form.setFieldValue("primaryResumeId", id);
        startExtraction(id);
      },
    },
  );

  const applyExtractedBasics = async (id: number): Promise<void> => {
    if (!isWaitingForExtraction(stateRef.current)) {
      return;
    }
    const { data } = await apiClient.get<ResumeDto>(`/api/resumes/${id}`);
    if (!isWaitingForExtraction(stateRef.current)) {
      return;
    }
    const basics = data?.content?.basics;
    if (basics && basics.name.trim().length > 0) {
      applyBasicsToForm(form, basics);
      setState("done");
      onContinue();
    }
  };

  useEventSource<ResumeEvent>(
    resumeId !== null && isWaitingForExtraction(state)
      ? `/api/resumes/${resumeId}/events`
      : null,
    {
      onMessage: (event) => {
        if (event.type === "content.updated") {
          void applyExtractedBasics(event.resumeId);
        }
      },
    },
  );

  useEffect(() => {
    if (state !== "extracting" || resumeId === null) {
      return;
    }
    // Handle the race where extraction completed before the EventSource opened.
    void applyExtractedBasics(resumeId);
    const slowTimer = setTimeout(() => {
      setState((s) => (s === "extracting" ? "slow" : s));
    }, EXTRACT_SLOW_AFTER_MS);
    return () => clearTimeout(slowTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, resumeId]);

  const startExtraction = async (id: number): Promise<void> => {
    setInjectError(null);
    setState("extracting");

    try {
      await agent.injectSkill("extract-resume", String(id));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setInjectError(message);
    }
  };

  const retryInject = async (): Promise<void> => {
    if (resumeId === null) {
      return;
    }
    await startExtraction(resumeId);
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h4">Upload your resume</Typography>
        <Typography variant="body2Muted">
          We&rsquo;ll read your PDF and fill in the rest. You can edit anything afterwards.
        </Typography>
      </Stack>

      <FileUpload
        variant="dropzone"
        accept="application/pdf"
        maxBytes={MAX_RESUME_BYTES}
        loading={upload.isPending}
        description="Click or drop a PDF here (5 MB max)"
        onFile={(f) => {
          setState("uploading");
          upload.mutate(f);
        }}
        onError={(msg) => toast.error(msg)}
        disabled={isWaitingForExtraction(state)}
      />

      {state === "extracting" && (
        <Alert
          icon={<CircularProgress size={18} />}
          severity="info"
          variant="outlined"
          action={
            resumeId !== null && (
              <Button color="inherit" size="small" onClick={() => retryInject()}>
                Retry
              </Button>
            )
          }
        >
          {injectError
            ? `Couldn't start the extractor: ${injectError}. Open the dock's Terminal tab, then retry.`
            : "Reading your resume in the terminal fields will autofill when it finishes."}
        </Alert>
      )}

      {state === "slow" && (
        <Alert
          severity="warning"
          icon={<HourglassEmpty fontSize="md" />}
          action={
            <Button color="inherit" size="small" onClick={() => retryInject()}>
              Retry
            </Button>
          }
        >
          Still extracting. Check the terminal in the dock for progress, then continue or skip.
        </Alert>
      )}

      {state === "done" && (
        <Alert severity="success" icon={<CheckCircle fontSize="md" />}>
          Resume parsed. Moving on
        </Alert>
      )}

      {upload.error && (
        <Alert severity="error" icon={<ErrorOutlined fontSize="md" />}>
          {upload.error.message}
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
        <Button variant="text" onClick={onContinue} disabled={state === "extracting"}>
          Skip &mdash; fill manually
        </Button>
        {(state === "slow" || state === "done") && (
          <Button variant="contained" onClick={onContinue}>
            Continue
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
