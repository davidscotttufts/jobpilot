import type { ReactElement } from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, BRAND, c, clamp, easeOut, fonts } from "../theme";

interface LogoRevealProps {
  at?: number;
  size?: number;
  tagline?: string;
  sub?: string;
}

/** Mark punches in on the beat with a flame flare, wordmark wipes in beside it. */
export function LogoReveal(props: LogoRevealProps): ReactElement {
  const { at = 0, size = 150, tagline, sub } = props;
  const f = useCurrentFrame() - at;
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });
  const flare = interpolate(f, [0, 6, 50], [0, 1, 0], clamp);
  const wipe = interpolate(f, [8, 34], [0, 1], { ...clamp, easing: easeOut });
  const tag = interpolate(f, [26, 50], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <div
          style={{ position: "relative", width: size, height: size, transform: `scale(${pop})` }}
        >
          <div
            style={{
              position: "absolute",
              inset: -size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${alpha(c.flame, 0.55 * flare)}, transparent 60%)`,
            }}
          />
          <Img
            src={staticFile("logo.svg")}
            style={{
              width: size,
              height: size,
              position: "relative",
              filter: `drop-shadow(0 0 ${30 + flare * 50}px ${alpha(c.flame, 0.35)})`,
            }}
          />
        </div>
        <div style={{ overflow: "hidden", clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: size * 0.82,
              letterSpacing: "-0.04em",
              color: c.text,
              transform: `translateX(${(1 - wipe) * -40}px)`,
            }}
          >
            {BRAND}
          </div>
        </div>
      </div>
      {tagline && (
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 40,
            fontWeight: 500,
            color: c.text2,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 14}px)`,
            letterSpacing: "-0.01em",
          }}
        >
          {tagline}
        </div>
      )}
      {sub && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 24,
            color: c.text3,
            opacity: tag,
            letterSpacing: "0.08em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
