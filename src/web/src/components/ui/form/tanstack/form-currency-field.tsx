"use client";

import { useState, type ChangeEvent, type ReactElement } from "react";
import { InputAdornment, TextField, type TextFieldProps } from "@mui/material";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { AnyReactForm } from "./types";

interface FormCurrencyFieldProps extends Omit<
  TextFieldProps,
  "value" | "onChange" | "onBlur" | "error" | "name" | "type"
> {
  form: AnyReactForm;
  name: string;
  symbol?: string;
  locale?: string;
  allowDecimals?: boolean;
}

export function FormCurrencyField(props: FormCurrencyFieldProps): ReactElement {
  const { form, name, helperText, symbol = "$", locale, allowDecimals = false, ...rest } = props;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: allowDecimals ? 2 : 0,
    useGrouping: true,
  });

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <CurrencyInput
          field={field}
          formatter={formatter}
          symbol={symbol}
          allowDecimals={allowDecimals}
          helperText={helperText}
          rest={rest}
        />
      )}
    </form.Field>
  );
}

interface CurrencyInputProps {
  field: AnyFieldApi;
  formatter: Intl.NumberFormat;
  symbol: string;
  allowDecimals: boolean;
  helperText: TextFieldProps["helperText"];
  rest: Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "error" | "name" | "type">;
}

function CurrencyInput(props: CurrencyInputProps): ReactElement {
  const { field, formatter, symbol, allowDecimals, helperText, rest } = props;
  const numeric = toNumber(field.state.value);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>("");

  const display = focused ? draft : numeric === undefined ? "" : formatter.format(numeric);
  const errMsg = field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]?.toString();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const allowed = allowDecimals ? /[^\d.]/g : /[^\d]/g;
    let cleaned = e.target.value.replace(allowed, "");
    if (allowDecimals) {
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
      }
    }
    setDraft(cleaned);
    if (cleaned === "" || cleaned === ".") {
      field.handleChange(undefined);
      return;
    }
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) {
      field.handleChange(parsed);
    }
  };

  return (
    <TextField
      fullWidth
      value={display}
      inputMode={allowDecimals ? "decimal" : "numeric"}
      onFocus={() => {
        setDraft(numeric === undefined ? "" : String(numeric));
        setFocused(true);
      }}
      onChange={handleChange}
      onBlur={() => {
        setFocused(false);
        field.handleBlur();
      }}
      error={field.state.meta.errors.length > 0}
      helperText={errMsg ?? helperText}
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start">{symbol}</InputAdornment>,
        },
      }}
      {...rest}
    />
  );
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}
