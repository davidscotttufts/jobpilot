import type { ReactElement } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { alpha, c } from "../theme";

// No film grain: an SVG feTurbulence layer cost ~65% of render time and was invisible after encoding (48 dB PSNR).
/** Warm-carbon stage: slow drifting flame/thrust glows and a faint grid. */
export function Background(): ReactElement {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 240) * 60;
  const drift2 = Math.cos(f / 300) * 80;
  return (
    <AbsoluteFill style={{ backgroundColor: c.base, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 600px at ${18 + drift / 40}% ${92 + drift2 / 60}%, ${alpha(c.flame, 0.2)}, transparent 70%),
            radial-gradient(800px 520px at ${86 - drift2 / 50}% ${6 + drift / 50}%, ${alpha(c.thrust, 0.13)}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${c.divider} 1px, transparent 1px), linear-gradient(90deg, ${c.divider} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `${(f * 0.15) % 80}px ${(f * 0.25) % 80}px`,
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
}

interface VignetteProps {
  strength?: number;
}

/** Edge darkening that keeps the eye in the middle. */
export function Vignette(props: VignetteProps): ReactElement {
  const { strength = 0.65 } = props;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,${strength}))`,
      }}
    />
  );
}
