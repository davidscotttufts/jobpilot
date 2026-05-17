"use client";

import type { ReactElement } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { AnyReactForm } from "./types";

interface FormTextFieldProps extends Omit<
  TextFieldProps,
  "value" | "onChange" | "onBlur" | "error" | "name"
> {
  form: AnyReactForm;
  name: string;
  transform?: (value: string) => string;
}

export function FormTextField(props: FormTextFieldProps): ReactElement {
  const { form, name, transform, helperText, ...rest } = props;
  const isNumber = rest.type === "number";

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const raw = field.state.value as string | number | undefined;
        const value = raw ?? "";
        const errMsg =
          (field.state.meta.errors[0] as { message?: string } | undefined)?.message ??
          field.state.meta.errors[0]?.toString();

        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              if (isNumber) {
                field.handleChange(next === "" ? undefined : Number(next));
                return;
              }
              field.handleChange(transform ? transform(next) : next);
            }}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.length > 0}
            helperText={errMsg ?? helperText}
            {...rest}
          />
        );
      }}
    </form.Field>
  );
}
