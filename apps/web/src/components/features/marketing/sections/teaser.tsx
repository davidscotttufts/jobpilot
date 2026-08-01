"use client";

import { type ReactElement, useRef, useState } from "react";
import { PlayArrow } from "@mui/icons-material";
import { alpha, Box, IconButton, Stack, Typography } from "@mui/material";
import { accent, fontFamilies, line, radii, shadows } from "@/theme";
import { Section } from "../section";
import { SectionEyebrow } from "../section-eyebrow";

const POSTER = "/teaser-poster.jpg";
const SOURCE = "/teaser.mp4";

/** Poster + `preload="none"`: the 3 MB cut costs nothing until asked for, and never becomes the LCP. */
export function Teaser(): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const play = (): void => {
    setStarted(true);
    void videoRef.current?.play();
  };

  return (
    <Section id="see-it-run" sx={{ paddingTop: { xs: 3, md: 4 } }}>
      <Stack spacing={1.5} sx={{ mb: 3, maxWidth: 620 }}>
        <SectionEyebrow color="accent.primary">SEE IT RUN</SectionEyebrow>
        <Typography variant="h2">Forty seconds of the agent working.</Typography>
        <Typography variant="body1Muted" sx={{ fontSize: "0.9375rem" }}>
          No mockups: a real cycle, a real application form, and a real pipeline filling up.
        </Typography>
      </Stack>

      <Box sx={{ position: "relative" }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: { xs: "-48px 0", md: -56 },
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${alpha(accent.primary, 0.09)}, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "relative",
            borderRadius: radii.lg,
            border: `1px solid ${line.border}`,
            backgroundColor: "surfaces.card",
            boxShadow: shadows.lg,
            overflow: "hidden",
          }}
        >
          <Box
            component="video"
            ref={videoRef}
            src={SOURCE}
            poster={POSTER}
            preload="none"
            playsInline
            controls={started}
            onEnded={() => setStarted(false)}
            sx={{ display: "block", width: "100%", height: "auto", aspectRatio: "16 / 9" }}
          />

          {!started && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                // The poster is a busy UI screenshot; the play button needs a strong scrim.
                background: `radial-gradient(ellipse 45% 55% at 50% 50%, ${alpha("#0B0B0A", 0.72)}, ${alpha("#0B0B0A", 0.5)} 70%)`,
              }}
            >
              <IconButton
                onClick={play}
                aria-label="Play the JobPilot teaser"
                sx={{
                  width: { xs: 64, md: 84 },
                  height: { xs: 64, md: 84 },
                  color: "common.white",
                  border: `1px solid ${alpha(accent.primary, 0.55)}`,
                  backgroundColor: alpha(accent.primary, 0.22),
                  backdropFilter: "blur(4px)",
                  transition: "transform 240ms, background-color 240ms",
                  "&:hover": {
                    backgroundColor: alpha(accent.primary, 0.36),
                    transform: "scale(1.06)",
                  },
                  "@media (prefers-reduced-motion: reduce)": {
                    transition: "none",
                    "&:hover": { transform: "none" },
                  },
                }}
              >
                <PlayArrow sx={{ fontSize: { xs: 32, md: 42 } }} />
              </IconButton>

              {/* Corner pill, not under the button, where it would collide with the poster's UI. */}
              <Typography
                sx={{
                  position: "absolute",
                  left: { xs: 12, md: 16 },
                  bottom: { xs: 12, md: 16 },
                  fontFamily: fontFamilies.mono,
                  fontSize: "0.6875rem",
                  color: "common.white",
                  backgroundColor: alpha("#0B0B0A", 0.7),
                  border: `1px solid ${line.divider}`,
                  borderRadius: radii.pill,
                  paddingInline: 1.25,
                  paddingBlock: 0.5,
                }}
              >
                40s · no sound
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Section>
  );
}
