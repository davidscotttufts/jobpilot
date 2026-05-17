"use client";

import type { ReactElement } from "react";
import { FormSection } from "@/components/ui/form";
import {
  FormMultiselectField,
  FormSwitchField,
  FormTextField,
  type AnyReactForm,
} from "@/components/ui/form/tanstack";

interface WorkAuthSectionProps {
  form: AnyReactForm;
}

export function WorkAuthSection(props: WorkAuthSectionProps): ReactElement {
  const { form } = props;
  return (
    <FormSection title="Work authorization" description="What employers ask on every application.">
      <FormSwitchField form={form} name="usAuthorized" label="Authorized to work in the US" />
      <FormSwitchField form={form} name="requiresSponsorship" label="Requires visa sponsorship" />
      <FormTextField
        form={form}
        name="visaStatus"
        label="Visa status (e.g. OPT, H1B, GC, Citizen)"
      />
      <FormTextField form={form} name="optExtension" label="OPT extension (e.g. STEM)" />
      <FormSwitchField form={form} name="willingToRelocate" label="Willing to relocate" />
      <FormMultiselectField
        form={form}
        name="preferredLocations"
        label="Preferred locations"
        placeholder="Type a city and press Enter"
      />
    </FormSection>
  );
}
