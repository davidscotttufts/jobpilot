import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

/** Mono pill, matching the board strip on the landing page - the agent's machine voice. */
const techChipSx = {
  fontFamily: fontFamilies.mono,
  fontSize: "0.7rem",
  whiteSpace: "nowrap",
  paddingInline: 1,
  paddingBlock: 0.25,
  borderRadius: 999,
  color: "text.secondary",
  border: 1,
  borderColor: "line.border",
  backgroundColor: "surfaces.elevated",
} as const;

interface TechChipsProps {
  tech: readonly string[];
  /** Cap for dense grids; omit to show the full stack. */
  max?: number;
}

export function TechChips(props: TechChipsProps): ReactNode {
  const { tech, max } = props;
  if (tech.length === 0) {
    return null;
  }

  const shown = max ? tech.slice(0, max) : tech;
  const overflow = tech.length - shown.length;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {shown.map((item) => (
        <Typography key={item} component="span" sx={techChipSx}>
          {item}
        </Typography>
      ))}
      {overflow > 0 && (
        <Typography component="span" sx={techChipSx}>
          +{overflow}
        </Typography>
      )}
    </Box>
  );
}
