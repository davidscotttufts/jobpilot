"use client";

import type { PilotState } from "@jobpilot/contracts/pilot";
import { useEffect, useState } from "react";

const TICK_MS = 30_000;

/** The host's next check; re-renders the caller while it is pending so a countdown keeps moving. */
export function useNextWake(state: PilotState): Date | null {
  const { nextWakeAt } = state;
  const wakeMs = nextWakeAt ? nextWakeAt.getTime() : null;

  const [, setTick] = useState(0);
  useEffect(() => {
    if (wakeMs === null || wakeMs <= Date.now()) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, [wakeMs]);

  return nextWakeAt;
}
