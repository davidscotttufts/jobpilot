"use client";

import { useState, type ReactElement } from "react";
import { AutoFixHigh } from "@mui/icons-material";
import { Button } from "@mui/material";
import { JdInputDialog } from "./jd-input-dialog";

interface TailorForJobButtonProps {
  size?: "small" | "medium";
}

export function TailorForJobButton(props: TailorForJobButtonProps): ReactElement {
  const { size = "small" } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        variant="contained"
        startIcon={<AutoFixHigh />}
        onClick={() => setOpen(true)}
      >
        Tailor for job
      </Button>
      <JdInputDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
