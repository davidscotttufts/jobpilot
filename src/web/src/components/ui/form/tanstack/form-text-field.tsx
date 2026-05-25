"use client";

import { useState, type ReactElement } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField, Tooltip, type TextFieldProps } from "@mui/material";
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
  const { form, name, transform, helperText, type, slotProps, ...rest } = props;
  const isNumber = type === "number";
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const effectiveType = isPassword && showPassword ? "text" : type;

  const passwordAdornment = isPassword && (
    <InputAdornment position="end">
      <Tooltip title={showPassword ? "Hide password" : "Show password"}>
        <IconButton
          onClick={() => setShowPassword((v) => !v)}
          onMouseDown={(e) => e.preventDefault()}
          edge="end"
          size="small"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const raw = field.state.value as string | number;
        const value = raw ?? "";
        const errMsg =
          (field.state.meta.errors[0] as { message?: string })?.message ??
          field.state.meta.errors[0]?.toString();

        return (
          <TextField
            fullWidth
            type={effectiveType}
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              if (isNumber) {
                field.handleChange(next === "" ? null : Number(next));
                return;
              }
              field.handleChange(transform ? transform(next) : next);
            }}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.length > 0}
            helperText={errMsg ?? helperText}
            slotProps={{
              ...slotProps,
              input: {
                ...(slotProps?.input as object),
                ...(isPassword ? { endAdornment: passwordAdornment } : {}),
              },
            }}
            {...rest}
          />
        );
      }}
    </form.Field>
  );
}
