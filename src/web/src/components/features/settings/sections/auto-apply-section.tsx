"use client";

import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { FormSection } from "@/components/ui/form";
import { FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";

interface AutoApplySectionProps {
  form: AnyReactForm;
}

export function AutoApplySection(props: AutoApplySectionProps): ReactElement {
  const { form } = props;
  return (
    <FormSection title="Auto-apply" description="Defaults used by the auto-apply and apply skills.">
      <Stack direction="row" spacing={2}>
        <FormTextField
          form={form}
          name="autoApply.minMatchScore"
          label="Min match score (0-100)"
          type="number"
        />
        <FormTextField
          form={form}
          name="autoApply.maxApplicationsPerRun"
          label="Max applications per run"
          type="number"
          helperText="Leave empty for unlimited"
        />
      </Stack>
      <FormTextField
        form={form}
        name="autoApply.defaultStartDate"
        label="Default start date answer"
      />
    </FormSection>
  );
}
