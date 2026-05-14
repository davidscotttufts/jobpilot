"use client";

import { useEffect, useState, type ReactElement } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ApplicationDto, EmailMessageDto } from "@/types/api";

interface MessageReviewDialogProps {
  messageId: number | null;
  open: boolean;
  onClose: () => void;
}

export function MessageReviewDialog(props: MessageReviewDialogProps): ReactElement {
  const { messageId, open, onClose } = props;
  const [matchedApp, setMatchedApp] = useState<ApplicationDto | null>(null);
  const [search, setSearch] = useState("");

  const message = useApiQuery<EmailMessageDto & { matchedApp?: ApplicationDto | null }>(
    [...queryKeys.email.all, "message", messageId ?? -1] as const,
    () => {
      if (messageId == null) {
        return Promise.resolve({ data: null, error: null });
      }
      return apiClient.get<EmailMessageDto & { matchedApp?: ApplicationDto | null }>(
        `/api/email/messages/${messageId}`,
      );
    },
    { enabled: messageId !== null },
  );

  useEffect(() => {
    if (message.data?.matchedApp) {
      setMatchedApp(message.data.matchedApp as ApplicationDto);
      setSearch(message.data.matchedApp.company ?? "");
    } else {
      setMatchedApp(null);
      setSearch("");
    }
  }, [message.data]);

  const appOptions = useApiQuery<ApplicationDto[]>(
    [...queryKeys.applications.all, "search", search] as const,
    () =>
      apiClient.get<ApplicationDto[]>(
        search ? `/api/applied?search=${encodeURIComponent(search)}` : "/api/applied",
      ),
    { enabled: open },
  );

  const patchMatch = useApiMutation<EmailMessageDto, { matchedAppId: number | null }>(
    (vars) => apiClient.patch<EmailMessageDto>(`/api/email/messages/${messageId}`, vars),
    {
      invalidate: [queryKeys.email.all],
    },
  );

  const approve = useApiMutation<{ id: number; applicationId: number }, void>(
    () => apiClient.post(`/api/email/messages/${messageId}/approve`, {}),
    {
      successMessage: "Approved",
      invalidate: [queryKeys.email.all, queryKeys.applications.all],
      onSuccess: () => onClose(),
    },
  );

  const deny = useApiMutation<{ id: number }, void>(
    () => apiClient.post(`/api/email/messages/${messageId}/deny`, {}),
    {
      successMessage: "Denied",
      invalidate: [queryKeys.email.all],
      onSuccess: () => onClose(),
    },
  );

  if (!open || messageId == null) {
    return <></>;
  }

  const m = message.data;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{m?.subject ?? "Loading…"}</DialogTitle>
      <DialogContent dividers>
        {m ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {m.fromName || m.fromAddress}
              </Typography>
              <Typography variant="captionMuted">·</Typography>
              <Typography variant="captionMuted">{m.fromDomain}</Typography>
              <Typography variant="captionMuted">·</Typography>
              <Typography variant="captionMuted">
                {new Date(m.receivedAt).toLocaleString()}
              </Typography>
              {m.classification && <Chip size="small" label={m.classification} />}
              {m.reviewStatus === "auto" && (
                <Chip size="small" label="auto" color="info" variant="outlined" />
              )}
            </Stack>

            {m.reasoning && (
              <Typography variant="captionMuted">Reasoning: {m.reasoning}</Typography>
            )}

            <Autocomplete<ApplicationDto>
              size="small"
              options={appOptions.data ?? []}
              getOptionLabel={(o) => `${o.title} — ${o.company}`}
              value={matchedApp}
              onChange={(_, v) => {
                setMatchedApp(v);
                patchMatch.mutate({ matchedAppId: v ? v.id : null });
              }}
              onInputChange={(_, v) => setSearch(v)}
              renderInput={(params) => <TextField {...params} label="Matched application" />}
              isOptionEqualToValue={(a, b) => a.id === b.id}
            />

            <Box
              sx={(t) => ({
                p: 2,
                maxHeight: 320,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                borderRadius: t.radii.sm,
                border: `1px solid ${t.palette.line.divider}`,
                backgroundColor: t.palette.surfaces.elevated,
              })}
            >
              {m.rawBody || m.snippet}
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2Muted">Loading…</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button color="error" onClick={() => deny.mutate()} disabled={deny.isPending}>
          Deny
        </Button>
        <Button
          variant="contained"
          onClick={() => approve.mutate()}
          disabled={approve.isPending || !m?.matchedAppId}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
