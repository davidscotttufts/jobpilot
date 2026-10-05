import type { ReactElement } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Background, Vignette } from "./components/Background";
import { FormStack } from "./components/FormStack";
import { Kinetic, words } from "./components/Kinetic";
import { SECTIONS } from "./theme";

// Starter timeline: renders with no clips or audio so the setup can be checked
// with `npm run still`. Grow it scene by scene on the bar grid:
//   - real footage: <AppWindow><Footage src="clips/x.mp4" cams={...} /></AppWindow> (Shot.tsx)
//   - captions over footage: <Caption /> (Caption.tsx)
//   - logo sting: <LogoReveal /> once public/logo.svg exists (Logo.tsx)
//   - sound: <SoundTrack cues={...} /> after `npm run synth` (Sound.tsx)
// Section lengths live in storyboard.json, shared with the music.
const { hook, reveal } = SECTIONS;

export function Teaser(): ReactElement {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={hook.from} durationInFrames={hook.frames}>
        <FormStack dur={hook.frames} />
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          <Kinetic
            lines={[words("Applying to jobs"), words("is a *full-time* *job.*")]}
            at={10}
            size={110}
            outAt={hook.frames - 16}
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={reveal.from} durationInFrames={reveal.frames}>
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          <Kinetic lines={[words("Replace with your *product.*")]} at={6} size={96} />
        </AbsoluteFill>
      </Sequence>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
}
