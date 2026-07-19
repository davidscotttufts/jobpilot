"use client";

import type { ReactElement } from "react";
import { Link, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { JobPilotMark } from "@/components/brand/jobpilot-mark";

interface BrandMarkProps {
  /** Hide the "JobPilot" wordmark and show only the badge. */
  iconOnly?: boolean;
  /** Where the mark points. Home by default - a logo that goes nowhere reads as broken. */
  href?: Route;
}

/** The flame "J" badge + wordmark, shared by the marketing nav and footer. */
export function BrandMark(props: BrandMarkProps): ReactElement {
  const { iconOnly = false, href = "/" as Route } = props;
  return (
    <Stack
      component={Link}
      href={href}
      aria-label="JobPilot home"
      underline="none"
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        color: "text.primary",
        transition: (theme) => theme.motion.fast,
        "&:hover": { opacity: 0.85 },
      }}
    >
      <JobPilotMark size={32} />
      {!iconOnly && (
        <Typography variant="h3" sx={{ fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
          JobPilot
        </Typography>
      )}
    </Stack>
  );
}
