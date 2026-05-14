"use client";

import { useState, type ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import { QueueFormDialog } from "./queue-form-dialog";

interface AddPayload {
  urls: string[];
  note: string | null;
}

export function QueueAddUrlsButton(): ReactElement {
  const [open, setOpen] = useState(false);

  const add = useApiMutation<{ inserted: number }, AddPayload>(
    (vars) => apiClient.post<{ inserted: number }>("/api/queue", vars),
    {
      successMessage: (data) => `Added ${data.inserted} URL${data.inserted === 1 ? "" : "s"}`,
      invalidate: [queryKeys.queue.all],
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <>
      <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
        Add URLs
      </Button>
      <QueueFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(urls, note) => add.mutate({ urls, note })}
        submitting={add.isPending}
      />
    </>
  );
}
