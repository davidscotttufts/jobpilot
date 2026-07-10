"use client";

import { type ReactElement, useState } from "react";
import { type ApplicationStatus, STATUSES } from "@jobpilot/contracts/application";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { STATUS_LABEL } from "@/components/ui/display";

interface StatusTransitionDialogProps {
  open: boolean;
  currentStatus: ApplicationStatus;
  onClose: () => void;
  onSubmit: (next: { toStatus: ApplicationStatus; note: string | null }) => void;
  submitting?: boolean;
}

export function StatusTransitionDialog(props: StatusTransitionDialogProps): ReactElement {
  const { open, currentStatus, onClose, onSubmit, submitting } = props;
  const [toStatus, setToStatus] = useState<ApplicationStatus>(currentStatus);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ toStatus, note: note.trim() || null });
        }}
      >
        <DialogTitle>Update status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              label="New status"
              value={toStatus}
              onChange={(e) => setToStatus(e.target.value as ApplicationStatus)}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Note (optional)"
              fullWidth
              multiline
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || toStatus === currentStatus}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
