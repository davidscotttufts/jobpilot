"use client";

import type { ReactElement } from "react";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

interface ThresholdStep {
  threshold: number;
  additionalJobs: number;
  examples: Array<{
    title: string;
    company: string;
    matchScore: number;
    matchReason: string | null;
  }>;
}

interface ThresholdSimulatorProps {
  currentThreshold: number;
  skippedByThreshold: number;
  steps: ThresholdStep[];
}

export function ThresholdSimulator(props: ThresholdSimulatorProps): ReactElement {
  const { currentThreshold, skippedByThreshold, steps } = props;
  const worthShowing = steps.filter((step) => step.additionalJobs > 0);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overlineMuted">Match score</Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>
          What your threshold costs
        </Typography>
        <Typography variant="body2Muted" sx={{ mt: 1, mb: 2 }}>
          Your pilot applies at <strong>{currentThreshold}</strong> and above. {skippedByThreshold}{" "}
          jobs have been skipped for scoring below it.
        </Typography>

        {worthShowing.length === 0 && (
          <Typography variant="captionMuted">
            Nothing skipped scored close enough for a lower bar to change the outcome.
          </Typography>
        )}

        <Stack spacing={1.75}>
          {worthShowing.map((step) => (
            <Stack key={step.threshold} spacing={0.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Chip size="small" label={`at ${step.threshold}`} />
                <Typography variant="body1Strong">+{step.additionalJobs} jobs</Typography>
              </Stack>
              {step.examples.slice(0, 2).map((example) => (
                <Typography key={`${example.title}-${example.company}`} variant="captionMuted">
                  {example.title} · {example.company} ({example.matchScore})
                  {example.matchReason ? ` - ${example.matchReason}` : ""}
                </Typography>
              ))}
            </Stack>
          ))}
        </Stack>

        <Typography variant="captionMuted" sx={{ display: "block", mt: 2 }}>
          Counts are jobs skipped only for their score - a lower bar would not admit a clearance
          requirement or a CAPTCHA. Whether these are worth applying to is a judgment about your own
          search, so nothing here recommends a number.
        </Typography>
      </CardContent>
    </Card>
  );
}
