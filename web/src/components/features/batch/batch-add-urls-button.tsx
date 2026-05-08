"use client";

import { useState, type ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import { BatchFormDialog } from "./batch-form-dialog";

interface AddPayload {
  urls: string[];
  note: string | null;
}

export function BatchAddUrlsButton(): ReactElement {
  const [open, setOpen] = useState(false);

  const add = useApiMutation<{ inserted: number }, AddPayload>(
    (vars) => apiClient.post<{ inserted: number }>("/api/batch", vars),
    {
      successMessage: (data) => `Added ${data.inserted} URL${data.inserted === 1 ? "" : "s"}`,
      invalidate: [queryKeys.batch.all],
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <>
      <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
        Add URLs
      </Button>
      <BatchFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(urls, note) => add.mutate({ urls, note })}
        submitting={add.isPending}
      />
    </>
  );
}
