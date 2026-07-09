"use client";

import { useEffect, useState } from "react";
import { patchAgentStorage, readAgentStorage } from "@/lib/agent-storage";
import { getStatus, type SessionStatus } from "@/lib/terminal";

export type TerminalHealth = "checking" | "reachable" | "degraded" | "offline" | "uninstalled";

const POLL_INTERVAL_MS = 5000;

/** Faster cadence while an expected restart (update / Start agent) is in flight. */
const FAST_POLL_INTERVAL_MS = 1500;

/** Consecutive failed probes required before a reachable host is reported offline. */
const OFFLINE_CONFIRM_PROBES = 2;

export interface TerminalHealthState {
  health: TerminalHealth;
  /** Last successful /healthz payload (host version, providers, …); null until first reachable. */
  status: SessionStatus | null;
  recheck: () => void;
}

/**
 * Polls the local terminal host; "reachable" when /healthz answers, "degraded" when the host
 * runs but can't start sessions (broken install). When unreachable, "offline" if a host has ever
 * answered from this browser (installed, just stopped) else "uninstalled" (never connected).
 * Pass `expectingReturn` while the host is deliberately restarting (update, Start agent) to poll faster.
 */
export function useTerminalHealth(expectingReturn = false): TerminalHealthState {
  const [health, setHealth] = useState<TerminalHealth>("checking");
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    const probe = async (): Promise<void> => {
      try {
        const result = await getStatus();
        if (active) {
          failures = 0;
          setStatus(result);
          setHealth(result.status === "degraded" ? "degraded" : "reachable");
          // Persist that a host answered (the dock only auto-expands before that) and its relaunch
          // capability, so the offline card can gate the Start-agent button across reloads.
          const stored = readAgentStorage();
          if (!stored?.everReachable || stored.canRelaunch !== result.canRelaunch) {
            patchAgentStorage({ everReachable: true, canRelaunch: result.canRelaunch });
          }
        }
      } catch {
        if (active) {
          failures++;
          setHealth((previous) => {
            // A single dropped probe must not unmount a healthy terminal.
            if (previous === "reachable" && failures < OFFLINE_CONFIRM_PROBES) {
              return previous;
            }
            return readAgentStorage()?.everReachable ? "offline" : "uninstalled";
          });
        }
      }
      if (active) {
        timer = setTimeout(probe, expectingReturn ? FAST_POLL_INTERVAL_MS : POLL_INTERVAL_MS);
      }
    };

    void probe();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [nonce, expectingReturn]);

  return { health, status, recheck: () => setNonce((n) => n + 1) };
}
