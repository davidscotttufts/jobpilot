"use client";

import { useSyncExternalStore } from "react";

/**
 * One interval for the whole app, so every relative timestamp re-renders on the same beat. Values
 * formatted at render time otherwise freeze at whatever they said on mount - a journal entry that
 * arrives over SSE reads "1s ago" until something else happens to refetch it.
 */
const TICK_MS = 15_000;

let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  timer ??= setInterval(() => {
    tick += 1;
    for (const notify of listeners) {
      notify();
    }
  }, TICK_MS);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Re-renders the caller every ~15s. The number itself is meaningless; only the change matters. */
export function useClockTick(): number {
  // Server snapshot is a constant, so SSR and the first client render agree.
  return useSyncExternalStore(
    subscribe,
    () => tick,
    () => 0,
  );
}
