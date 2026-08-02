"use client";

import { useSyncExternalStore } from "react";
import { ExternalStore } from "@/lib/external-store";

/** One interval for the whole app; without it a timestamp freezes at whatever it said on mount. */
const TICK_MS = 15_000;

const clock = new ExternalStore(0, () => {
  const timer = setInterval(() => clock.update((tick) => tick + 1), TICK_MS);
  return () => clearInterval(timer);
});

const SERVER_TICK = () => 0;

/** Re-renders the caller every ~15s. The number is meaningless; only the change matters. */
export function useClockTick(): number {
  return useSyncExternalStore(clock.subscribe, clock.get, SERVER_TICK);
}
