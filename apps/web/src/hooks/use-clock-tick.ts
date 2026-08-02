"use client";

import { useSyncExternalStore } from "react";
import { ExternalStore } from "@/lib/external-store";

/**
 * One interval for the whole app, so every relative timestamp re-renders on the same beat. Values
 * formatted at render time otherwise freeze at whatever they said on mount - a journal entry that
 * arrives over SSE reads "1s ago" until something else happens to refetch it.
 */
const TICK_MS = 15_000;

const clock = new ExternalStore(0, () => {
  const timer = setInterval(() => clock.update((tick) => tick + 1), TICK_MS);
  return () => clearInterval(timer);
});

const SERVER_TICK = () => 0;

/** Re-renders the caller every ~15s. The number itself is meaningless; only the change matters. */
export function useClockTick(): number {
  return useSyncExternalStore(clock.subscribe, clock.get, SERVER_TICK);
}
