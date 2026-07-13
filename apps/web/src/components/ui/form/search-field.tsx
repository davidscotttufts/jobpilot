"use client";

import type { ReactElement } from "react";
import { Search } from "@mui/icons-material";
import { InputAdornment, TextField } from "@mui/material";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/** The filter box above a list: a small text field with a leading search icon. */
export function SearchField(props: SearchFieldProps): ReactElement {
  const { value, onChange, placeholder } = props;

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="sm" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ flex: 1, minWidth: 200 }}
    />
  );
}
