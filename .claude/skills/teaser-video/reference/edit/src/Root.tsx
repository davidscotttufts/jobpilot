import type { ReactElement } from "react";
import { Composition } from "remotion";
import { TEASER_FRAMES, Teaser } from "./Teaser";
import { FPS } from "./theme";

export function Root(): ReactElement {
  return (
    <Composition
      id="Teaser"
      component={Teaser}
      durationInFrames={TEASER_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
}
