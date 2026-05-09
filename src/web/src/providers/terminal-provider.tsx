"use client";

import { createContext, type PropsWithChildren, type ReactElement, useContext, useState } from "react";
import { injectCommand } from "@/lib/terminal";

interface TerminalContextValue {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  inject: (command: string) => Promise<void>;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function TerminalProvider(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const [open, setOpen] = useState(false);

  const value: TerminalContextValue = {
    open,
    toggle: () => setOpen((prev) => !prev),
    setOpen,
    inject: async (command: string) => {
      await injectCommand(command);
    },
  };

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

export function useTerminal(): TerminalContextValue {
  const ctx = useContext(TerminalContext);
  if (!ctx) {
    throw new Error("useTerminal must be used within a TerminalProvider");
  }
  return ctx;
}
