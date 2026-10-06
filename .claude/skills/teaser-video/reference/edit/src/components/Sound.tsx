import type { ReactElement } from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { clamp } from "../theme";

export type SfxName =
  | "click"
  | "whoosh"
  | "whooshDown"
  | "chime"
  | "impact"
  | "riser"
  | "tick"
  | "typing";

export interface Cue {
  at: number;
  sfx: SfxName;
  volume?: number;
  /** Trim long beds such as typing. */
  dur?: number;
}

interface SoundTrackProps {
  cues: Cue[];
  total: number;
}

/** All generated in audio/synth.mjs - no third-party samples anywhere. */
export function SoundTrack(props: SoundTrackProps): ReactElement {
  const { cues, total } = props;
  return (
    <>
      <Audio
        src={staticFile("audio/music.wav")}
        volume={(f) => interpolate(f, [0, 12, total - 50, total], [0, 0.85, 0.85, 0], clamp)}
      />
      {cues.map((q) => (
        <Sequence key={`${q.at}-${q.sfx}`} from={q.at} durationInFrames={q.dur ?? 150}>
          <Audio src={staticFile(`audio/sfx-${q.sfx}.wav`)} volume={q.volume ?? 0.5} />
        </Sequence>
      ))}
    </>
  );
}
