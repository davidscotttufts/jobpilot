"use client";

import { useEffect, useState } from "react";
import { getStatus } from "@/lib/terminal";

export type TerminalHealth = "checking" | "reachable" | "unreachable";

const POLL_INTERVAL_MS = 5000;

export interface TerminalHealthState {
  health: TerminalHealth;
  recheck: () => void;
}

/** Polls the local terminal host; "reachable" when /healthz answers, "unreachable" on any error. */
export function useTerminalHealth(): TerminalHealthState {
  const [health, setHealth] = useState<TerminalHealth>("checking");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const probe = async (): Promise<void> => {
      try {
        await getStatus();
        if (active) {
          setHealth("reachable");
        }
      } catch {
        if (active) {
          setHealth("unreachable");
        }
      }
      if (active) {
        timer = setTimeout(probe, POLL_INTERVAL_MS);
      }
    };

    void probe();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [nonce]);

  return { health, recheck: () => setNonce((n) => n + 1) };
}
