"use client";

import { useEffect, useState } from "react";
import { getStatus, type SessionStatus } from "@/lib/terminal";

export type TerminalHealth = "checking" | "reachable" | "unreachable";

const POLL_INTERVAL_MS = 5000;

export interface TerminalHealthState {
  health: TerminalHealth;
  /** Last successful /healthz payload (host version, providers, …); null until first reachable. */
  status: SessionStatus | null;
  recheck: () => void;
}

/** Polls the local terminal host; "reachable" when /healthz answers, "unreachable" on any error. */
export function useTerminalHealth(): TerminalHealthState {
  const [health, setHealth] = useState<TerminalHealth>("checking");
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const probe = async (): Promise<void> => {
      try {
        const result = await getStatus();
        if (active) {
          setStatus(result);
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

  return { health, status, recheck: () => setNonce((n) => n + 1) };
}
