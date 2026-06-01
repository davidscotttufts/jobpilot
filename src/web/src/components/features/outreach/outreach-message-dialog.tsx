"use client";

import { useState, type ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/client/api";
import { OUTREACH_MESSAGE_TERMINAL_STATUSES } from "@/lib/contracts/outreach";
import type { OutreachMessageDto } from "@/types/api";

interface OutreachMessageDialogProps {
  runId: string;
  message: OutreachMessageDto;
  canSend: boolean;
  invalidate: ReadonlyArray<ReadonlyArray<unknown>>;
  onClose: () => void;
  onSkip: () => void;
}

export function OutreachMessageDialog(props: OutreachMessageDialogProps): ReactElement {
  const { runId, message, canSend, invalidate, onClose, onSkip } = props;
  const [subject, setSubject] = useState(message.subject ?? "");
  const [body, setBody] = useState(message.body);

  const base = `/api/runs/${encodeURIComponent(runId)}/outreach/${message.id}`;
  const isEmail = message.channel === "email";
  const isConnectNote = message.linkedinKind === "connect_note";
  const terminal = OUTREACH_MESSAGE_TERMINAL_STATUSES.includes(message.status);

  const save = useApiMutation<unknown, void>(
    () => apiClient.patch(base, { subject: subject || null, body }),
    { invalidate, successMessage: "Saved" },
  );

  const approve = useApiMutation<unknown, void>(
    () => apiClient.patch(base, { subject: subject || null, body, status: "approved" }),
    { invalidate, successMessage: "Approved", onSuccess: onClose },
  );

  const send = useApiMutation<unknown, void>(
    async () => {
      const sent = await apiClient.post<{ providerId: string; threadId: string }>(
        "/api/email/send",
        { to: message.contact.email, subject, body },
      );
      if (sent.error || !sent.data) {
        return sent;
      }
      return apiClient.post(`${base}/result`, {
        outcome: "sent",
        providerId: sent.data.providerId,
        threadId: sent.data.threadId,
        sentAt: new Date().toISOString(),
      });
    },
    { invalidate, successMessage: "Sent", onSuccess: onClose },
  );

  const canSendEmail = isEmail && canSend && !!message.contact.email && !terminal;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {message.contact.name}
        {message.contact.title && (
          <Typography variant="captionMuted" component="div">
            {message.contact.title}
            {message.contact.company ? ` · ${message.contact.company}` : ""}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isEmail && (
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
              disabled={terminal}
            />
          )}
          <TextField
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            disabled={terminal}
            helperText={
              isConnectNote
                ? `${body.length}/300 — LinkedIn connect notes are capped at 300 characters.`
                : undefined
            }
          />
          {!isEmail && !terminal && (
            <Typography variant="captionMuted">
              LinkedIn messages are sent through the agent in the browser — approve here, then run
              the agent to send.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!terminal && (
          <>
            <Button onClick={onSkip} color="warning">
              Skip
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save
            </Button>
            <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
              Approve
            </Button>
            {isEmail && (
              <Button
                variant="contained"
                onClick={() => send.mutate()}
                disabled={!canSendEmail || send.isPending}
              >
                Send
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
