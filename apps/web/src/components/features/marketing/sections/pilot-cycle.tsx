import type { ReactElement } from "react";
import { alpha, Box, Stack, Typography } from "@mui/material";
import { accent, fontFamilies, line, radii } from "@/theme";

// Plain visitor language, no internal Pilot vocabulary.
const BRANCHES = ["finds jobs", "scores them", "applies", "reaches out"];

// Each loop lights four stops, so one branch comes round every fourth loop.
const BEAT_MS = 1500;
const LOOP_MS = BEAT_MS * 4;
const TOUR_MS = LOOP_MS * BRANCHES.length;

/** Keyframes that light a stop through the middle of the first `slicePct` of its animation. */
function glowFrames(slicePct: number) {
  const at = (fraction: number) => `${+(slicePct * fraction).toFixed(2)}%`;
  return {
    [`0%, ${at(1)}, 100%`]: { borderColor: line.border, boxShadow: "none" },
    [`${at(0.3)}, ${at(0.6)}`]: {
      borderColor: accent.primary,
      boxShadow: `0 0 16px -2px ${alpha(accent.primary, 0.55)}`,
    },
  };
}

function stepAnimation(beat: number): string {
  return `pilot-step-glow ${LOOP_MS}ms linear ${beat * BEAT_MS}ms infinite`;
}

function branchAnimation(index: number): string {
  return `pilot-branch-glow ${TOUR_MS}ms linear ${(2 + index * 4) * BEAT_MS}ms infinite`;
}

// Keyframes live on the root, not each pill, so emotion emits them once.
const graphSx = {
  alignItems: "center",
  "@keyframes pilot-step-glow": glowFrames(100 / 4),
  "@keyframes pilot-branch-glow": glowFrames(100 / (4 * BRANCHES.length)),
} as const;

const stopSx = {
  fontSize: { xs: "0.6875rem", sm: "0.75rem" },
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

const connectorSx = { height: 16, borderLeft: 1, borderColor: "line.border" } as const;

interface StopProps {
  label: string;
  animation: string;
}

function Stop({ label, animation }: StopProps): ReactElement {
  return (
    // stopSx goes last so its reduced-motion rule overrides the animation.
    <Typography variant="monoChip" sx={[{ animation }, stopSx]}>
      {label}
    </Typography>
  );
}

/** CSS-only: the glow walks one branch per loop, so it reads as motion without data or JS. */
export function PilotCycle(): ReactElement {
  return (
    <Stack aria-hidden sx={graphSx}>
      <Stop label="looks for work" animation={stepAnimation(0)} />
      <Box sx={connectorSx} />
      <Stop label="picks the next task" animation={stepAnimation(1)} />
      <Box sx={connectorSx} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, auto)", sm: `repeat(${BRANCHES.length}, auto)` },
          gap: 1,
          justifyItems: "center",
          p: 1.5,
          border: 1,
          borderStyle: "dashed",
          borderColor: "line.border",
          borderRadius: radii.lg,
        }}
      >
        {BRANCHES.map((label, i) => (
          <Stop key={label} label={label} animation={branchAnimation(i)} />
        ))}
      </Box>
      <Box sx={connectorSx} />
      <Stop label="logs what it did" animation={stepAnimation(3)} />
      <Typography
        sx={{
          mt: 2,
          fontFamily: fontFamilies.mono,
          fontSize: "0.75rem",
          color: "text.disabled",
          textAlign: "center",
        }}
      >
        nothing to do? the AI stays off
      </Typography>
    </Stack>
  );
}
