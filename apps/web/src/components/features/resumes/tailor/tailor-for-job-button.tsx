"use client";

import { type ReactElement, useState } from "react";
import { AutoFixHigh } from "@mui/icons-material";
import { AgentOnlyButton } from "@/components/ui/buttons";
import { JobDescriptionDialog } from "./job-description-dialog";

interface TailorForJobButtonProps {
  size?: "small" | "medium";
}

export function TailorForJobButton(props: TailorForJobButtonProps): ReactElement {
  const { size = "small" } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <AgentOnlyButton
        size={size}
        variant="contained"
        startIcon={<AutoFixHigh />}
        onClick={() => setOpen(true)}
      >
        Tailor for job
      </AgentOnlyButton>
      <JobDescriptionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
