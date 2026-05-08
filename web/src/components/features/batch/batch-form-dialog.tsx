"use client";

import { useState, type ReactElement } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

interface BatchFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (urls: string[], note: string | null) => void;
  submitting?: boolean;
}

interface ParseResult {
  urls: string[];
  invalid: string[];
}

function parseUrls(raw: string): ParseResult {
  const lines = raw
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const urls: string[] = [];
  const invalid: string[] = [];
  for (const line of lines) {
    try {
      const u = new URL(line);
      if (u.protocol === "http:" || u.protocol === "https:") {
        urls.push(line);
      } else {
        invalid.push(line);
      }
    } catch {
      invalid.push(line);
    }
  }
  return { urls, invalid };
}

export function BatchFormDialog(props: BatchFormDialogProps): ReactElement {
  const { open, onClose, onSubmit, submitting } = props;
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");

  const parsed = parseUrls(raw);
  const canSubmit = parsed.urls.length > 0 && parsed.invalid.length === 0 && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setRaw("");
    setNote("");
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(parsed.urls, note.trim() ? note.trim() : null);
    setRaw("");
    setNote("");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add URLs to batch</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2Muted">
            Paste one job URL per line. The apply-batch skill picks these up next time it runs.
          </Typography>
          <TextField
            multiline
            minRows={6}
            maxRows={16}
            fullWidth
            label="Job URLs"
            placeholder="https://example.com/jobs/123"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            autoFocus
          />
          <TextField
            fullWidth
            label="Note (optional)"
            placeholder="e.g. From LinkedIn search Tuesday"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {parsed.urls.length > 0 && (
            <Typography variant="captionMuted">
              {parsed.urls.length} valid URL{parsed.urls.length === 1 ? "" : "s"} ready to add.
            </Typography>
          )}
          {parsed.invalid.length > 0 && (
            <Alert severity="error">
              {parsed.invalid.length} line{parsed.invalid.length === 1 ? " is" : "s are"} not a
              valid http(s) URL: {parsed.invalid.slice(0, 3).join(", ")}
              {parsed.invalid.length > 3 ? "…" : ""}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit}>
          Add {parsed.urls.length > 0 ? `${parsed.urls.length} URL${parsed.urls.length === 1 ? "" : "s"}` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
