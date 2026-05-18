"use client";

import { useState, type ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { AddQueueEntry } from "@/lib/schemas/queue";
import { AddUrlsDialog } from "./add-urls-dialog";

interface AddUrlsResponse {
  inserted: number;
}

export function AddUrlsButton(): ReactElement {
  const [open, setOpen] = useState(false);

  const create = useApiMutation<AddUrlsResponse, AddQueueEntry>(
    (vars) => apiClient.post<AddUrlsResponse>("/api/queue", vars),
    {
      successMessage: (data) => `Queued ${data.inserted} URL${data.inserted === 1 ? "" : "s"}`,
      invalidate: [queryKeys.queue.all, queryKeys.pipeline.all],
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Add fontSize="md" />}
        onClick={() => setOpen(true)}
      >
        Add URLs
      </Button>
      <AddUrlsDialog
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(values) => create.mutate(values)}
        submitting={create.isPending}
      />
    </>
  );
}
