"use client";

import { type ReactElement, useState } from "react";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { AgentOnlyButton } from "@/components/ui/buttons";
import { SectionCard } from "@/components/ui/layout";
import { useAgent, useAgentAvailable } from "@/providers/agent-provider";
import { useResumeExtraction } from "../use-resume-extraction";

interface ExtractionCardProps {
  resumeId: string;
  onSkip: () => void;
}

/** Without this, a first upload lands on an empty form with nothing saying the agent is working. */
export function ExtractionCard(props: ExtractionCardProps): ReactElement {
  const { resumeId, onSkip } = props;
  const agent = useAgent();
  const agentAvailable = useAgentAvailable();
  const [retrying, setRetrying] = useState(false);

  // Nothing to poll for when this device can't run the extraction; the detail SSE still catches it.
  const { error } = useResumeExtraction(resumeId, agentAvailable);

  const retry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await agent.injectSkill("extract-resume", resumeId);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SectionCard title="Reading your PDF">
      <Stack spacing={2}>
        {error && (
          <Alert severity="error">
            Couldn&rsquo;t check whether the extraction finished: {error.message}. The fields may
            still fill in on their own &mdash; otherwise try again, or fill them in yourself.
          </Alert>
        )}
        {!error && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={18} />
            <Typography variant="body2Muted">
              {agentAvailable
                ? "The agent is pulling your details out of the PDF. This usually takes about a minute, and the fields fill in on their own."
                : "Open JobPilot on your desktop to read this PDF, or fill the fields in yourself."}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" size="small" onClick={onSkip}>
            Fill it in myself
          </Button>
          <AgentOnlyButton
            variant="text"
            size="small"
            disabled={retrying}
            onClick={() => void retry()}
          >
            Try again
          </AgentOnlyButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
