"use client";

import type { ReactElement } from "react";
import { Add, Delete } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import type { AnyFieldApi } from "@tanstack/react-form";
import { FormSection } from "@/components/ui/form";
import { FormPhoneField, FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";
import type { ReferenceInput } from "@/lib/schemas/profile";

interface ReferencesSectionProps {
  form: AnyReactForm;
}

const EMPTY_REFERENCE: ReferenceInput = {
  name: "",
  relationship: "",
  company: "",
  email: "",
  phone: "",
};

export function ReferencesSection(props: ReferencesSectionProps): ReactElement {
  const { form } = props;
  return (
    <FormSection
      title="References"
      description="Up to 3 professional references, used to fill reference fields on application forms."
    >
      <form.Field name="references" mode="array">
        {(field: AnyFieldApi) => {
          const refs = (field.state.value as ReferenceInput[] | undefined) ?? [];
          return (
            <Stack spacing={2}>
              {refs.map((_, i) => (
                <Box key={i} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
                  >
                    <Typography variant="subtitle2">Reference {i + 1}</Typography>
                    <IconButton
                      aria-label={`Remove reference ${i + 1}`}
                      size="small"
                      onClick={() => field.removeValue(i)}
                    >
                      <Delete fontSize="sm" />
                    </IconButton>
                  </Stack>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                      <FormTextField form={form} name={`references[${i}].name`} label="Name" />
                      <FormTextField
                        form={form}
                        name={`references[${i}].relationship`}
                        label="Relationship"
                      />
                    </Stack>
                    <FormTextField form={form} name={`references[${i}].company`} label="Company" />
                    <Stack direction="row" spacing={2}>
                      <FormTextField
                        form={form}
                        name={`references[${i}].email`}
                        label="Email"
                        type="email"
                      />
                      <FormPhoneField form={form} name={`references[${i}].phone`} label="Phone" />
                    </Stack>
                  </Stack>
                </Box>
              ))}
              {refs.length < 3 && (
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<Add fontSize="sm" />}
                    onClick={() => field.pushValue(EMPTY_REFERENCE)}
                  >
                    Add reference
                  </Button>
                </Box>
              )}
            </Stack>
          );
        }}
      </form.Field>
    </FormSection>
  );
}
