"use client";

import type { ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

interface BrandMarkProps {
  /** Hide the "JobPilot" wordmark and show only the badge. */
  iconOnly?: boolean;
}

/** The flame "J" badge + wordmark, shared by the marketing nav and footer. */
export function BrandMark(props: BrandMarkProps): ReactElement {
  const { iconOnly = false } = props;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 32,
          height: 32,
          borderRadius: theme.radii.sm,
          background: theme.gradients.reversed,
          border: `1px solid ${theme.palette.accent.primary}`,
          display: "grid",
          placeItems: "center",
          fontFamily: fontFamilies.display,
          fontWeight: 700,
          fontSize: 18,
          lineHeight: 1,
          color: "primary.contrastText",
        })}
      >
        J
      </Box>
      {!iconOnly && (
        <Typography variant="h3" sx={{ fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
          JobPilot
        </Typography>
      )}
    </Stack>
  );
}
