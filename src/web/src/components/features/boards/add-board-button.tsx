"use client";

import { useState, type ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { JobBoardInput } from "@/lib/schemas/job-board";
import type { JobBoardDto } from "@/types/api";
import { BoardFormDialog } from "./board-form-dialog";

export function AddBoardButton(): ReactElement {
  const [open, setOpen] = useState(false);

  const create = useApiMutation<JobBoardDto, JobBoardInput>(
    (vars) => apiClient.post<JobBoardDto>("/api/job-boards", vars),
    {
      successMessage: "Board added",
      invalidate: [queryKeys.jobBoards.all],
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <>
      <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
        Add board
      </Button>
      <BoardFormDialog
        open={open}
        title="Add job board"
        onClose={() => setOpen(false)}
        onSubmit={(values) => create.mutate(values)}
        submitting={create.isPending}
      />
    </>
  );
}
