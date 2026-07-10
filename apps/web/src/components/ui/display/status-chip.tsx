"use client";

import type { ReactElement } from "react";
import { type ApplicationStatus, STATUSES } from "@jobpilot/contracts/application";
import { Chip, type ChipProps } from "@mui/material";

export { type ApplicationStatus, STATUSES };

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_COLOR: Record<ApplicationStatus, ChipProps["color"]> = {
  applied: "default",
  screening: "info",
  interviewing: "primary",
  offer: "success",
  rejected: "error",
  withdrawn: "default",
};

interface StatusChipProps {
  status: ApplicationStatus;
  size?: ChipProps["size"];
}

export function StatusChip(props: StatusChipProps): ReactElement {
  const { status, size = "small" } = props;
  return (
    <Chip
      size={size}
      label={STATUS_LABEL[status]}
      color={STATUS_COLOR[status]}
      variant="outlined"
    />
  );
}
