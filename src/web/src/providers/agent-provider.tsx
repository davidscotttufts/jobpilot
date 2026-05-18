"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import {
  DOCK_EXPANDED,
  DOCK_MAX_EXPANDED,
  DOCK_MIN_EXPANDED,
} from "@/components/layout/shell-config";
import { formatSkillCommand, injectCommand, type TerminalProviderId } from "@/lib/terminal";
import { useToast } from "@/providers/notification-provider";

const TERMINAL_PROVIDER_KEY = "jobpilot:terminal.provider";
const DOCK_WIDTH_KEY = "jobpilot:dock.width";

function getProvider(): TerminalProviderId {
  if (typeof window === "undefined") return "claude";
  return window.localStorage.getItem(TERMINAL_PROVIDER_KEY) === "codex" ? "codex" : "claude";
}

function clampWidth(value: number): number {
  return Math.max(DOCK_MIN_EXPANDED, Math.min(DOCK_MAX_EXPANDED, Math.round(value)));
}

async function wait(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

export interface AgentContextValue {
  expanded: boolean;
  expand: () => void;
  collapse: () => void;

  expandedWidth: number;
  setExpandedWidth: (px: number) => void;

  provider: TerminalProviderId;
  setProvider: (provider: TerminalProviderId) => void;

  inject: (command: string) => Promise<void>;
  injectSkill: (skill: string, args?: string) => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

function describeInjectError(error: unknown): string {
  if (error instanceof TypeError) {
    return "JobPilot Terminal isn't reachable. Start it (bun run dev) and open the Terminal tab in the dock.";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("-> 500") || message.includes("-> 409")) {
    return "No active terminal session. Open the Terminal tab in the dock and start one.";
  }
  if (message.includes("-> 404")) {
    return "Terminal session has ended. Restart it from the Terminal tab in the dock.";
  }
  return `Failed to send command to terminal: ${message}`;
}

export function AgentProvider(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [provider, setProviderState] = useState<TerminalProviderId>(getProvider());
  const [expandedWidth, setExpandedWidthState] = useState<number>(DOCK_EXPANDED);

  useEffect(() => {
    const stored = window.localStorage.getItem(DOCK_WIDTH_KEY);
    if (!stored) {
      return;
    }

    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setExpandedWidthState(clampWidth(parsed));
  }, []);

  const setProvider = (next: TerminalProviderId): void => {
    setProviderState(next);
    window.localStorage.setItem(TERMINAL_PROVIDER_KEY, next);
  };

  const setExpandedWidth = (px: number): void => {
    const next = clampWidth(px);
    setExpandedWidthState(next);
    window.localStorage.setItem(DOCK_WIDTH_KEY, String(next));
  };

  const handleInject = async (command: string) => {
    setExpanded(true);
    await wait(1500);

    try {
      await injectCommand(command, provider);
    } catch (error) {
      toast.error(describeInjectError(error));
    }
  };

  const handleInjectSkill = async (skill: string, args?: string) => {
    setExpanded(true);
    await wait(1500);

    try {
      await injectCommand(formatSkillCommand(provider, skill, args), provider);
    } catch (error) {
      toast.error(describeInjectError(error));
    }
  };

  const value: AgentContextValue = {
    expanded,
    expand: () => setExpanded(true),
    collapse: () => setExpanded(false),
    expandedWidth,
    setExpandedWidth,
    provider,
    setProvider,
    inject: handleInject,
    injectSkill: handleInjectSkill,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return ctx;
}
