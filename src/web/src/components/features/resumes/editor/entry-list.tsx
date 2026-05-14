"use client";

import type { ReactElement, ReactNode } from "react";
import { Add, ArrowDownward, ArrowUpward, Delete } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { moveAt, removeAt, replaceAt } from "@/utils/array";

interface EntryListProps<T> {
  value: T[];
  onChange: (next: T[]) => void;
  newItem: () => T;
  renderEntry: (entry: T, onUpdate: (next: T) => void) => ReactNode;
  renderTitle: (entry: T, index: number) => string;
  addLabel: string;
  emptyLabel?: string;
}

export function EntryList<T>(props: EntryListProps<T>): ReactElement {
  const { value, onChange, newItem, renderEntry, renderTitle, addLabel, emptyLabel } = props;

  const update = (idx: number, next: T) => onChange(replaceAt(value, idx, next));
  const remove = (idx: number) => onChange(removeAt(value, idx));
  const move = (idx: number, dir: -1 | 1) => onChange(moveAt(value, idx, dir));

  return (
    <Stack spacing={1.5}>
      {value.length === 0 && emptyLabel && (
        <Typography variant="body2Muted">{emptyLabel}</Typography>
      )}
      {value.map((entry, i) => (
        <Box
          key={i}
          sx={(t) => ({
            border: `1px solid ${t.palette.line.divider}`,
            borderRadius: t.radii.sm,
            p: 2,
          })}
        >
          <Stack direction="row" sx={{ mb: 1, alignItems: "center" }} spacing={0.5}>
            <Typography variant="overlineMuted" sx={{ flex: 1 }}>
              {renderTitle(entry, i)}
            </Typography>
            <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUpward fontSize="sm" />
            </IconButton>
            <IconButton size="small" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
              <ArrowDownward fontSize="sm" />
            </IconButton>
            <IconButton size="small" onClick={() => remove(i)} aria-label="Remove entry">
              <Delete fontSize="sm" />
            </IconButton>
          </Stack>
          {renderEntry(entry, (next) => update(i, next))}
        </Box>
      ))}
      <Button
        startIcon={<Add />}
        onClick={() => onChange([...value, newItem()])}
        sx={{ alignSelf: "flex-start" }}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}
