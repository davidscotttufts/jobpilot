"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { TerminalDrawer } from "@/components/features/terminal";
import { TerminalProvider } from "@/providers";
import { Sidebar } from "./sidebar";

export function AppShell(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <TerminalProvider>
      <Box
        sx={(t) => ({
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          backgroundColor: t.palette.surfaces.base,
          color: t.palette.text.primary,
        })}
      >
        <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
          <Sidebar />
          <Box component="main" sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
            {children}
          </Box>
        </Box>
        <TerminalDrawer />
      </Box>
    </TerminalProvider>
  );
}
