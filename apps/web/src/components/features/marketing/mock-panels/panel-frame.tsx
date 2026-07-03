"use client";

import type { ReactElement, ReactNode } from "react";
import { Box, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { fontFamilies } from "@/theme";

interface PanelFrameProps {
  /** Mono window-title label, e.g. "pipeline". */
  label: string;
  children: ReactNode;
}

/** Shared window chrome for the product-tour mock panels - same family as the hero transcript. */
export function PanelFrame(props: PanelFrameProps): ReactElement {
  const { label, children } = props;
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        borderRadius: theme.radii.lg,
        border: `1px solid ${theme.palette.line.border}`,
        backgroundColor: theme.palette.surfaces.card,
        boxShadow: theme.shadows_custom.lg,
        overflow: "hidden",
      })}
    >
      <Stack
        direction="row"
        spacing={0.75}
        sx={(theme) => ({
          alignItems: "center",
          paddingInline: 1.5,
          height: 36,
          borderBottom: `1px solid ${theme.palette.line.divider}`,
          backgroundColor: theme.palette.surfaces.elevated,
        })}
      >
        {(["error.main", "warning.main", "success.main"] as const).map((c) => (
          <Box key={c} sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
        ))}
        <Typography variant="captionMuted" sx={{ fontFamily: fontFamilies.mono, pl: 1 }}>
          {label}
        </Typography>
      </Stack>
      <Box sx={{ padding: 2 }}>{children}</Box>
    </Box>
  );
}

/** Inset-card surface shared by every mock panel; spread with a `padding` override. */
export const panelCellSx = (theme: Theme) => ({
  borderRadius: theme.radii.sm,
  border: `1px solid ${theme.palette.line.divider}`,
  backgroundColor: theme.palette.surfaces.elevated,
});

interface PanelBadgeProps {
  children: ReactNode;
  /** Text color; also the border color unless `borderColor` is set. */
  color: string;
  borderColor?: string;
  mono?: boolean;
  sx?: SxProps<Theme>;
}

/** The small outlined pill shared by the mock panels' status/marker chips. */
export function PanelBadge(props: PanelBadgeProps): ReactElement {
  const { children, color, borderColor, mono, sx } = props;
  return (
    <Box
      component="span"
      sx={[
        (theme) => ({
          fontSize: "0.625rem",
          fontWeight: mono ? 400 : 600,
          fontFamily: mono ? fontFamilies.mono : undefined,
          color,
          border: "1px solid",
          borderColor: borderColor ?? color,
          borderRadius: theme.radii.pill,
          paddingInline: 1,
          paddingBlock: 0.25,
          whiteSpace: "nowrap",
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
