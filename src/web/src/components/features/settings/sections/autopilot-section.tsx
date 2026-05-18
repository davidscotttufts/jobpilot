"use client";

import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { FormSection } from "@/components/ui/form";
import { FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";

interface AutopilotSectionProps {
  form: AnyReactForm;
}

export function AutopilotSection(props: AutopilotSectionProps): ReactElement {
  const { form } = props;
  return (
    <FormSection
      title="Autopilot"
      description="Defaults used by the autopilot and apply skills."
    >
      <Stack direction="row" spacing={2}>
        <FormTextField
          form={form}
          name="autopilot.minMatchScore"
          label="Min match score (0-100)"
          type="number"
        />
        <FormTextField
          form={form}
          name="autopilot.maxApplicationsPerRun"
          label="Max applications per run"
          type="number"
          helperText="Leave empty for unlimited"
        />
      </Stack>
      <FormTextField
        form={form}
        name="autopilot.defaultStartDate"
        label="Default start date answer"
      />
    </FormSection>
  );
}
