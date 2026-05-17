"use client";

import type { ReactElement } from "react";
import { Button, Stack } from "@mui/material";
import type { AnyFieldApi } from "@tanstack/react-form";
import { FileUpload } from "../file-upload";
import type { AnyReactForm } from "./types";

interface FormFileUploadFieldProps {
  form: AnyReactForm;
  name: string;
  label?: string;
  accept?: string;
  maxBytes?: number;
}

export function FormFileUploadField(props: FormFileUploadFieldProps): ReactElement {
  const { form, name, label, accept, maxBytes } = props;

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const file = (field.state.value as File | null | undefined) ?? null;
        return (
          <Stack spacing={1}>
            <FileUpload
              variant="dropzone"
              accept={accept}
              maxBytes={maxBytes}
              label={label}
              selectedFile={file}
              onFile={(f) => field.handleChange(f)}
            />
            {file && (
              <Button
                size="small"
                onClick={() => field.handleChange(null)}
                sx={{ alignSelf: "flex-start" }}
              >
                Remove
              </Button>
            )}
          </Stack>
        );
      }}
    </form.Field>
  );
}
