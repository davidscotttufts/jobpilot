import type { ReactElement } from "react";
import { Grid, Paper, Stack, Typography } from "@mui/material";

export interface NumberedStep {
  title: string;
  body: string;
  /** A command or path shown under the body. */
  snippet?: string;
}

interface NumberedStepsProps {
  steps: NumberedStep[];
  /** Columns from md up; phones always stack. */
  columns: 2 | 3 | 4;
}

export function NumberedSteps(props: NumberedStepsProps): ReactElement {
  const { steps, columns } = props;

  return (
    <Grid
      container
      spacing={{ xs: 3, md: 4 }}
      component="ol"
      sx={{ m: 0, p: 0, listStyle: "none" }}
    >
      {steps.map((step, i) => (
        <Grid key={step.title} component="li" size={{ xs: 12, sm: 6, md: 12 / columns }}>
          <Stack spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <Typography variant="statValue" color="primary" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </Typography>
            <Typography variant="h4" component="h3">
              {step.title}
            </Typography>
            <Typography variant="body2Muted">{step.body}</Typography>
            {step.snippet && (
              <Paper variant="inset" sx={{ paddingInline: 1, paddingBlock: 0.5 }}>
                <Typography variant="monoCaption" component="code">
                  {step.snippet}
                </Typography>
              </Paper>
            )}
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}
