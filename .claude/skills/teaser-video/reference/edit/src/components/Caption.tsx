import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp } from "../theme";
import { Eyebrow, Kinetic, words } from "./Kinetic";

interface CaptionProps {
  text: string;
  eyebrow?: string;
  at: number;
  outAt: number;
  size?: number;
  position?: "bottom-left" | "top-left" | "bottom-center";
}

/** Headline over the footage with its own scrim, so it reads on any frame. */
export function Caption(props: CaptionProps): ReactElement {
  const { text, eyebrow, at, outAt, size = 76, position = "bottom-left" } = props;
  const f = useCurrentFrame();
  const scrim = interpolate(f, [at - 6, at + 14, outAt, outAt + 16], [0, 1, 1, 0], clamp);
  const lines = text.split("|").map((l) => words(l.trim()));
  const bottom = position !== "top-left";
  const center = position === "bottom-center";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          opacity: scrim,
          background: bottom
            ? "linear-gradient(0deg, rgba(8,8,7,0.92) 0%, rgba(8,8,7,0.7) 26%, transparent 52%)"
            : "linear-gradient(180deg, rgba(8,8,7,0.92) 0%, rgba(8,8,7,0.7) 26%, transparent 52%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: center ? 0 : 110,
          right: center ? 0 : undefined,
          [bottom ? "bottom" : "top"]: 96,
          display: "flex",
          flexDirection: "column",
          alignItems: center ? "center" : "flex-start",
          gap: 18,
        }}
      >
        {eyebrow && <Eyebrow text={eyebrow} at={at} outAt={outAt} />}
        <Kinetic
          lines={lines}
          at={at + 4}
          size={size}
          align={center ? "center" : "left"}
          outAt={outAt}
          stagger={3}
        />
      </div>
    </AbsoluteFill>
  );
}
