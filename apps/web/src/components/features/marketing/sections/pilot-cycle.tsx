import type { ReactElement } from "react";
import { alpha, Box, Typography } from "@mui/material";
import { accent, fontFamilies, line } from "@/theme";
import { monoChipSx } from "../mono-chip-sx";

// One label per stop, in loop order - plain visitor language, no internal Pilot vocabulary.
const STOPS = ["finds roles", "applies", "follows up", "asks you", "writes the journal"];

const CYCLE_MS = 7500;
const STEP_MS = CYCLE_MS / STOPS.length;
// A stop's slice of the loop - its pill is dark again by the end of it.
const STEP_PCT = +(100 / STOPS.length).toFixed(2);

/** Position on the ring for stop `i`, starting at 12 o'clock, clockwise. */
function ringPosition(i: number): { left: string; top: string } {
  const angle = ((-90 + (i * 360) / STOPS.length) * Math.PI) / 180;
  return {
    left: `${(50 + 50 * Math.cos(angle)).toFixed(1)}%`,
    top: `${(50 + 50 * Math.sin(angle)).toFixed(1)}%`,
  };
}

// Keyframes live on the ring, not each pill, so emotion emits them once.
const ringSx = {
  position: "absolute",
  inset: { xs: "12%", sm: "8%" },
  borderRadius: "50%",
  border: `1px dashed ${line.border}`,
  "@keyframes pilot-stop-glow": {
    [`0%, ${STEP_PCT}%, 100%`]: { borderColor: line.border, boxShadow: "none" },
    "6%, 12%": {
      borderColor: accent.primary,
      boxShadow: `0 0 16px -2px ${alpha(accent.primary, 0.55)}`,
    },
  },
} as const;

const stopSx = {
  ...monoChipSx,
  position: "absolute",
  transform: "translate(-50%, -50%)",
  fontSize: { xs: "0.6875rem", sm: "0.75rem" },
  animation: `pilot-stop-glow ${CYCLE_MS}ms linear infinite`,
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

/**
 * The Pilot loop as a ring of plain-language stops; the glow walks the ring so the
 * loop reads as motion without any real data or JS.
 */
export function PilotCycle(): ReactElement {
  return (
    <Box
      aria-hidden
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 400,
        aspectRatio: "1",
        marginInline: "auto",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: fontFamilies.mono,
            fontSize: "0.75rem",
            color: "text.disabled",
            textAlign: "center",
          }}
        >
          runs while
          <br />
          you sleep
        </Typography>
      </Box>
      <Box sx={ringSx}>
        {STOPS.map((label, i) => (
          <Box
            key={label}
            component="span"
            sx={[stopSx, { ...ringPosition(i), animationDelay: `${i * STEP_MS}ms` }]}
          >
            {label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
