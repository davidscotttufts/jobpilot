"use client";

import { type ReactElement, useState } from "react";
import { describeWeeklySchedule, WEEKDAY_LABELS, WEEKDAYS } from "@jobpilot/contracts/pilot";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export interface WeeklyScheduleValue {
  days: number[];
  hour: number;
}

interface RepeatWeeklyDialogProps {
  open: boolean;
  onClose: () => void;
  /** The campaign's query, so the dialog can say what is being repeated. */
  query: string;
  /** The browser's zone, shown so the hour is unambiguous and stored with the schedule. */
  timeZone: string;
  initial?: WeeklyScheduleValue;
  pending: boolean;
  onConfirm: (value: WeeklyScheduleValue) => void;
  /** Offered once the campaign already repeats, to take it off the schedule. */
  onStopRepeating?: () => void;
}

const DEFAULT_DAYS = [1];
const DEFAULT_HOUR = 8;

/** Every hour of the day, labelled the way a person reads a clock rather than as 0-23. */
const HOURS = Array.from({ length: 24 }, (_, hour) => {
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return { hour, label: `${twelve}:00 ${suffix}` };
});

export function RepeatWeeklyDialog(props: RepeatWeeklyDialogProps): ReactElement {
  const { open, onClose, query, timeZone, initial, pending, onConfirm, onStopRepeating } = props;
  const [days, setDays] = useState<number[]>(initial?.days ?? DEFAULT_DAYS);
  const [hour, setHour] = useState<number>(initial?.hour ?? DEFAULT_HOUR);

  const toggle = (day: number): void => {
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Repeat this campaign</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ paddingTop: 1 }}>
          {/* The query goes on its own line: it often carries quotes of its own, and nesting
              those inside a sentence's quotes reads as a typo. */}
          <Stack spacing={0.5}>
            <Typography variant="body2Strong">{query}</Typography>
            <Typography variant="body2Muted">
              On each chosen day the pilot runs this search again, opening a fresh campaign. The one
              you are looking at stays as it is.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="body2Strong">Days</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
              {WEEKDAYS.map((day) => (
                <Chip
                  key={day}
                  label={WEEKDAY_LABELS[day]}
                  onClick={() => toggle(day)}
                  color={days.includes(day) ? "primary" : "default"}
                  variant={days.includes(day) ? "filled" : "outlined"}
                  aria-pressed={days.includes(day)}
                />
              ))}
            </Stack>
          </Stack>

          <TextField
            select
            label="Time"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            helperText={`${timeZone} · the pilot picks it up on its first cycle after this time.`}
          >
            {HOURS.map((option) => (
              <MenuItem key={option.hour} value={option.hour}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="captionMuted">
            {days.length > 0
              ? `Repeats ${describeWeeklySchedule(days, hour)}. It only runs while the pilot is running.`
              : "Pick at least one day."}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {onStopRepeating && (
          <Button color="error" onClick={onStopRepeating} disabled={pending}>
            Stop repeating
          </Button>
        )}
        <Stack sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onConfirm({ days, hour })}
          disabled={pending || days.length === 0}
        >
          {initial ? "Update schedule" : "Repeat weekly"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
