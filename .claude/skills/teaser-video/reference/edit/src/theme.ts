import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { Easing } from "remotion";

// Mirrors apps/web/src/theme/palette.ts (warm carbon + flame/thrust duotone).
export const c = {
  base: "#0B0B0A",
  card: "#151413",
  elevated: "#201E1B",
  hover: "#2B2925",
  flame: "#FF6A3D",
  thrust: "#3B82F6",
  text: "#F4F2EE",
  text2: "#A7A49D",
  text3: "#6C6860",
  success: "#16D98A",
  divider: "#21201C",
  border: "#38342E",
  borderHi: "#4A463F",
};

/** Wordmark beside the logo in LogoReveal. */
export const BRAND = "JobPilot";

/** A theme hex at the given opacity, so glows and scrims follow the palette. */
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export const FPS = 60;
export const BPM = 120;
export const BEAT = (60 / BPM) * FPS; // 30 frames
export const BAR = BEAT * 4; // 120 frames

const archivo = loadArchivo("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});
const mono = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
export const fonts = { display: archivo.fontFamily, mono: mono.fontFamily };

// The app's expressive curve; used for every camera move and reveal.
export const ease = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
