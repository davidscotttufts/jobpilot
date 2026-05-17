"use client";

import type { ReactElement, ReactNode } from "react";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { CountryCode } from "libphonenumber-js";
import { PhoneField } from "../phone-field";
import type { AnyReactForm } from "./types";

interface FormPhoneFieldProps {
  form: AnyReactForm;
  name: string;
  label?: string;
  placeholder?: string;
  helperText?: ReactNode;
  defaultCountry?: CountryCode;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
}

export function FormPhoneField(props: FormPhoneFieldProps): ReactElement {
  const { form, name, helperText, ...rest } = props;
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const raw = field.state.value as string | null | undefined;
        const errMsg =
          (field.state.meta.errors[0] as { message?: string } | undefined)?.message ??
          field.state.meta.errors[0]?.toString();
        return (
          <PhoneField
            name={name}
            value={raw ?? ""}
            onChange={(next) => field.handleChange(next)}
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
