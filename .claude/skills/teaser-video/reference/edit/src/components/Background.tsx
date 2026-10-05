import type { ReactElement } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { alpha, c } from "../theme";

/** Warm-carbon stage: slow drifting flame/thrust glows, a faint grid, film grain. */
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
      <Grain />
    </AbsoluteFill>
  );
}

function Grain(): ReactElement {
  const f = useCurrentFrame();
  // Re-seed every other frame so grain shimmers like film without strobing.
  const seed = Math.floor(f / 2) % 50;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.18 }}>
      <svg width="100%" height="100%">
        <title>Film grain</title>
        <filter id={`g${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
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
